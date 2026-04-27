const express = require('express');
const router = express.Router();
const pool = require('../db');
const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');

async function getReportData() {
  const sql = `
    SELECT 
      uc.email,
      up.fullName,
      s.name AS serviceName,
      q.queueId,
      qe.positionInQueue,
      qe.joinedAt,
      qe.servedAt,
      qe.cancelledAt,
      qe.status,
      CASE 
        WHEN qe.servedAt IS NOT NULL 
        THEN ROUND(TIMESTAMPDIFF(SECOND, qe.joinedAt, qe.servedAt) / 60, 1)
        ELSE NULL 
      END AS waitMinutes
    FROM QueueEntry qe
    JOIN UserCredentials uc ON qe.userId = uc.userId
    LEFT JOIN UserProfile up ON uc.userId = up.userId
    JOIN Queues q ON qe.queueId = q.queueId
    JOIN Service s ON q.serviceId = s.serviceId
    ORDER BY qe.joinedAt DESC
  `;
  const [rows] = await pool.query(sql);
  return rows;
}

// GET /api/reports/data
router.get('/data', async (req, res) => {
  try {
    const rows = await getReportData();

    const totalServed = rows.filter(r => r.status === 'served').length;
    const totalWaiting = rows.filter(r => r.status === 'waiting').length;
    const totalCancelled = rows.filter(r => r.status === 'canceled').length;
    const waitTimes = rows.filter(r => r.waitMinutes !== null).map(r => r.waitMinutes);
    const avgWait = waitTimes.length
      ? (waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length).toFixed(1)
      : 'N/A';

    res.json({
      records: rows,
      stats: {
        totalServed,
        totalWaiting,
        totalCancelled,
        avgWaitMinutes: avgWait
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/csv
router.get('/csv', async (req, res) => {
  try {
    const rows = await getReportData();

    const filePath = path.join(__dirname, '../report_export.csv');
    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'fullName',        title: 'Full Name' },
        { id: 'email',           title: 'Email' },
        { id: 'serviceName',     title: 'Service' },
        { id: 'positionInQueue', title: 'Position' },
        { id: 'status',          title: 'Status' },
        { id: 'joinedAt',        title: 'Joined At' },
        { id: 'servedAt',        title: 'Served At' },
        { id: 'cancelledAt',     title: 'Cancelled At' },
        { id: 'waitMinutes',     title: 'Wait Time (min)' },
      ]
    });

    await csvWriter.writeRecords(rows);
    res.download(filePath, 'queuesmart_report.csv');
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;