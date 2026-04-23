const pool = require('../db');
//const { queues, queueHistory, services, users, notifications } = require('../data/mock-data');
const { validateJoinQueue, validateLeaveQueue } = require('../utils/queue-validators');
const { estimateWaitTime } = require('../utils/wait-time');


const joinQueue = async (req, res) => {
  try {
    const { error } = validateJoinQueue(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error
      });
    }

    const userId = Number(req.body.userId);
    const serviceId = Number(req.body.serviceId);

    const [userRows] = await pool.query(
      `SELECT uc.userId, uc.email, up.fullName
       FROM UserCredentials uc
       LEFT JOIN UserProfile up ON up.userId = uc.userId
       WHERE uc.userId = ?`,
      [userId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const [serviceRows] = await pool.query(
      `SELECT serviceId, name, expectedDuration, isActive
       FROM Service
       WHERE serviceId = ?`,
      [serviceId]
    );

    if (serviceRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Service not found'
      });
    }

    const service = serviceRows[0];

    if (Number(service.isActive) !== 1) {
      return res.status(400).json({
        success: false,
        error: 'Service is not currently open'
      });
    }

    // IMPORTANT: get real queueId from Queues table, not serviceId
    const [queueRows] = await pool.query(
      `SELECT queueId
       FROM Queues
       WHERE serviceId = ? AND status = 'open'
       ORDER BY queueId DESC
       LIMIT 1`,
      [serviceId]
    );

    let queueId;

    if (queueRows.length > 0) {
      queueId = queueRows[0].queueId;
    } else {
      const [queueInsert] = await pool.query(
        `INSERT INTO Queues (serviceId, status, createdOn)
         VALUES (?, 'open', NOW())`,
        [serviceId]
      );
      queueId = queueInsert.insertId;
    }

    const [duplicateRows] = await pool.query(
      `SELECT queueEntryId
       FROM QueueEntry
       WHERE userId = ? AND status = 'waiting'
       LIMIT 1`,
       [userId]
    );

    
    if (duplicateRows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'User is already in an active Queue'
      });
    }

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS count
       FROM QueueEntry
       WHERE queueId = ? AND status = 'waiting'`,
      [queueId]
    );

    const nextPosition = countRows[0].count + 1;

    const [result] = await pool.query(
      `INSERT INTO QueueEntry
       (queueId, userId, positionInQueue, joinedAt, status)
       VALUES (?, ?, ?, NOW(), 'waiting')`,
      [queueId, userId, nextPosition]
    );

    try {
      await pool.query(
        `INSERT INTO Notifications (userId, message, type, status, createdAt)
         VALUES (?, ?, 'queue_joined', 'sent', NOW())`,
        [userId, `You have joined the queue for ${service.name}`]
      );
    } catch (notifErr) {
      console.warn('Notification insert skipped:', notifErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Joined queue successfully',
      queueEntry: {
        id: result.insertId,
        queueId,
        serviceId,
        userId,
        position: nextPosition,
        status: 'waiting'
      }
    });
  } catch (err) {
    console.error('joinQueue error:', err);
    return res.status(500).json({
      success: false,
      error: 'Server error while joining queue'
    });
  }
};

const leaveQueue = async (req, res) => {
  try {
    const { error } = validateLeaveQueue(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error
      });
    }

    const userId = Number(req.body.userId);
    const serviceId = Number(req.body.serviceId);

    const [entryRows] = await pool.query(
      `SELECT
          qe.queueEntryId,
          qe.queueId,
          qe.userId,
          qe.positionInQueue,
          qe.joinedAt,
          s.serviceId,
          s.name AS serviceName
       FROM QueueEntry qe
       INNER JOIN Queues q ON q.queueId = qe.queueId
       INNER JOIN Service s ON s.serviceId = q.serviceId
       WHERE qe.userId = ?
         AND s.serviceId = ?
         AND qe.status = 'waiting'
        ORDER BY qe.joinedAt ASC
       LIMIT 1`,
      [userId, serviceId]
    );

    if (entryRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Active queue entry not found'
      });
    }

    const entry = entryRows[0];

    await pool.query(
      `UPDATE QueueEntry
      SET status = 'canceled',
          cancelledAt = NOW()
      WHERE queueEntryId = ?`,
      [entry.queueEntryId]
    );

    const [remainingRows] = await pool.query(
      `SELECT queueEntryId
       FROM QueueEntry
       WHERE queueId = ? AND status = 'waiting'
       ORDER BY positionInQueue ASC`,
      [entry.queueId]
    );

    for (let i = 0; i < remainingRows.length; i++) {
      await pool.query(
        `UPDATE QueueEntry
         SET positionInQueue = ?
         WHERE queueEntryId = ?`,
        [i + 1, remainingRows[i].queueEntryId]
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Left queue successfully'
    });
  } catch (err) {
    console.error('leaveQueue error:', err);
    return res.status(500).json({
      success: false,
      error: 'Server error while leaving queue'
    });
  }
};



const getCurrentQueue = async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (Number.isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid userId is required'
      });
    }

    const [rows] = await pool.query(
      `SELECT
          qe.queueEntryId,
          qe.queueId,
          qe.userId,
          qe.positionInQueue,
          qe.joinedAt,
          qe.status,
          s.serviceId,
          s.name AS serviceName,
          s.expectedDuration
       FROM QueueEntry qe
       INNER JOIN Queues q ON q.queueId = qe.queueId
       INNER JOIN Service s ON s.serviceId = q.serviceId
       WHERE qe.userId = ?
         AND qe.status = 'waiting'
       ORDER BY qe.joinedAt ASC
       LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No active queue entry found'
      });
    }

    const entry = rows[0];

    const [aheadRows] = await pool.query(
      `SELECT COUNT(*) AS count
       FROM QueueEntry
       WHERE queueId = ?
         AND status = 'waiting'
         AND positionInQueue < ?`,
      [entry.queueId, entry.positionInQueue]
    );

    const peopleAhead = aheadRows[0].count;
    const estimatedWaitMinutes = estimateWaitTime(
      peopleAhead,
      Number(entry.expectedDuration || 0)
    );

    return res.status(200).json({
        success: true,
        queue: {
          id: entry.queueEntryId,
          queueId: entry.queueId,
          serviceId: entry.serviceId,
          serviceName: entry.serviceName,
          userId: entry.userId,
          position: entry.positionInQueue,
          status: entry.status,
          joinedAt: entry.joinedAt,
          peopleAhead,
          estimatedWaitMinutes
        }
      });
    } catch (err) {
    console.error('getCurrentQueue error:', err);
    return res.status(500).json({
      success: false,
      error: 'Server error while fetching current queue'
    });
  }
};

const serveNext = async (req, res) => {
  try {
    const serviceId = Number(req.params.serviceId);

    if (Number.isNaN(serviceId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid serviceId is required'
      });
    }

    const [rows] = await pool.query(
      `SELECT
          qe.queueEntryId,
          qe.queueId,
          qe.userId,
          qe.positionInQueue,
          qe.joinedAt,
          s.serviceId,
          s.name AS serviceName
       FROM QueueEntry qe
       INNER JOIN Queues q ON q.queueId = qe.queueId
       INNER JOIN Service s ON s.serviceId = q.serviceId
       WHERE s.serviceId = ?
         AND qe.status = 'waiting'
       ORDER BY qe.positionInQueue ASC
       LIMIT 1`,
      [serviceId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No users are waiting in this queue'
      });
    }

    const nextEntry = rows[0];

await pool.query(
  `UPDATE QueueEntry
   SET status = 'served',
       servedAt = NOW()
   WHERE queueEntryId = ?`,
  [nextEntry.queueEntryId]
);

    const [remainingRows] = await pool.query(
      `SELECT queueEntryId
       FROM QueueEntry
       WHERE queueId = ? AND status = 'waiting'
       ORDER BY positionInQueue ASC`,
      [nextEntry.queueId]
    );

    for (let i = 0; i < remainingRows.length; i++) {
      await pool.query(
        `UPDATE QueueEntry
         SET positionInQueue = ?
         WHERE queueEntryId = ?`,
        [i + 1, remainingRows[i].queueEntryId]
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Next user served successfully',
      servedEntry: {
        userId: nextEntry.userId,
        serviceId: nextEntry.serviceId,
        serviceName: nextEntry.serviceName,
        joinedAt: nextEntry.joinedAt,
        status: 'served'
      }
    });
  } catch (err) {
    console.error('serveNext error:', err);
    return res.status(500).json({
      success: false,
      error: 'Server error while serving next user'
    });
  }
};

module.exports = {
  joinQueue,
  leaveQueue,
  getCurrentQueue,
  serveNext
};