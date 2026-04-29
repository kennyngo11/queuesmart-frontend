const pool = require('../db');
//const { queues, queueHistory, services, users, notifications } = require('../data/mock-data');
const { validateJoinQueue, validateLeaveQueue } = require('../utils/queue-validators');
const { estimateWaitTime } = require('../utils/wait-time');

const reorderQueuePositions = async (queueId) => {
  const [remainingRows] = await pool.query(
    `SELECT queueEntryId
     FROM QueueEntry
     WHERE queueId = ? AND status = 'waiting'
     ORDER BY positionInQueue ASC`,
    [queueId]
  );

  for (let i = 0; i < remainingRows.length; i++) {
    await pool.query(
      `UPDATE QueueEntry
       SET positionInQueue = ?
       WHERE queueEntryId = ?`,
      [i + 1, remainingRows[i].queueEntryId]
    );
  }
};


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

    try {
      await pool.query(
        `INSERT INTO Notifications (userId, message, type, status, createdAt)
         VALUES (?, ?, 'queue_served', 'sent', NOW())`,
        [nextEntry.userId, `You have been served for ${nextEntry.serviceName}`]
      );
    } catch (notifErr) {
      console.warn('Notification insert skipped:', notifErr.message);
    }

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

const getQueueByService = async (req, res) => {
  try {
    const serviceId = Number(req.params.serviceId);

    if (Number.isNaN(serviceId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid serviceId is required'
      });
    }

    const [queueRows] = await pool.query(
      `SELECT queueId
       FROM Queues
       WHERE serviceId = ? AND status = 'open'
       ORDER BY queueId DESC
       LIMIT 1`,
      [serviceId]
    );

    if (queueRows.length === 0) {
      return res.status(200).json({
        success: true,
        queueId: null,
        entries: []
      });
    }

    const queueId = queueRows[0].queueId;
    const [rows] = await pool.query(
      `SELECT
          qe.queueEntryId,
          qe.userId,
          qe.positionInQueue,
          qe.status,
          uc.email,
          up.fullName
       FROM QueueEntry qe
       INNER JOIN UserCredentials uc ON uc.userId = qe.userId
       LEFT JOIN UserProfile up ON up.userId = uc.userId
       WHERE qe.queueId = ?
         AND qe.status = 'waiting'
       ORDER BY qe.positionInQueue ASC`,
      [queueId]
    );

    return res.status(200).json({
      success: true,
      queueId,
      entries: rows.map(row => ({
        queueEntryId: row.queueEntryId,
        userId: row.userId,
        position: row.positionInQueue,
        status: row.status,
        email: row.email,
        name: row.fullName
      }))
    });
  } catch (err) {
    console.error('getQueueByService error:', err);
    return res.status(500).json({
      success: false,
      error: 'Server error while fetching queue'
    });
  }
};

const moveQueueEntry = async (req, res) => {
  try {
    const queueEntryId = Number(req.params.queueEntryId);
    const { direction } = req.body;

    if (Number.isNaN(queueEntryId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid queueEntryId is required'
      });
    }

    if (direction !== 'up' && direction !== 'down') {
      return res.status(400).json({
        success: false,
        error: 'direction must be "up" or "down"'
      });
    }

    const [entryRows] = await pool.query(
      `SELECT queueEntryId, queueId, positionInQueue
       FROM QueueEntry
       WHERE queueEntryId = ? AND status = 'waiting'
       LIMIT 1`,
      [queueEntryId]
    );

    if (entryRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Queue entry not found'
      });
    }

    const entry = entryRows[0];
    const targetPosition = direction === 'up'
      ? entry.positionInQueue - 1
      : entry.positionInQueue + 1;

    const [swapRows] = await pool.query(
      `SELECT queueEntryId, positionInQueue
       FROM QueueEntry
       WHERE queueId = ?
         AND status = 'waiting'
         AND positionInQueue = ?
       LIMIT 1`,
      [entry.queueId, targetPosition]
    );

    if (swapRows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot move further in that direction'
      });
    }

    await pool.query(
      `UPDATE QueueEntry
       SET positionInQueue = ?
       WHERE queueEntryId = ?`,
      [targetPosition, entry.queueEntryId]
    );

    await pool.query(
      `UPDATE QueueEntry
       SET positionInQueue = ?
       WHERE queueEntryId = ?`,
      [entry.positionInQueue, swapRows[0].queueEntryId]
    );

    return res.status(200).json({
      success: true,
      message: 'Queue position updated'
    });
  } catch (err) {
    console.error('moveQueueEntry error:', err);
    return res.status(500).json({
      success: false,
      error: 'Server error while updating queue position'
    });
  }
};

const removeQueueEntry = async (req, res) => {
  try {
    const queueEntryId = Number(req.params.queueEntryId);

    if (Number.isNaN(queueEntryId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid queueEntryId is required'
      });
    }

    const [entryRows] = await pool.query(
      `SELECT
          qe.queueEntryId,
          qe.queueId,
          qe.userId,
          qe.positionInQueue,
          s.serviceId,
          s.name AS serviceName
       FROM QueueEntry qe
       INNER JOIN Queues q ON q.queueId = qe.queueId
       INNER JOIN Service s ON s.serviceId = q.serviceId
       WHERE qe.queueEntryId = ? AND qe.status = 'waiting'
       LIMIT 1`,
      [queueEntryId]
    );

    if (entryRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Queue entry not found'
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

    await reorderQueuePositions(entry.queueId);

    try {
      await pool.query(
        `INSERT INTO Notifications (userId, message, type, status, createdAt)
         VALUES (?, ?, 'queue_left', 'sent', NOW())`,
        [entry.userId, `You were removed from the queue for ${entry.serviceName}`]
      );
    } catch (notifErr) {
      console.warn('Notification insert skipped:', notifErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'User removed from queue'
    });
  } catch (err) {
    console.error('removeQueueEntry error:', err);
    return res.status(500).json({
      success: false,
      error: 'Server error while removing queue entry'
    });
  }
};

module.exports = {
  joinQueue,
  leaveQueue,
  getCurrentQueue,
  serveNext,
  getQueueByService,
  moveQueueEntry,
  removeQueueEntry
};