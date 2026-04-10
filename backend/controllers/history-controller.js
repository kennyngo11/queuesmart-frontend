const pool = require('../db');

const getUserHistory = async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (Number.isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid userId is required'
      });
    }

    const [rows] = await pool.query(
      `SELECT qe.queueEntryId AS id,
              qe.userId,
              q.serviceId,
              s.name AS serviceName,
              qe.joinedAt,
              qe.servedAt,
              qe.cancelledAt AS leftAt,
              qe.status
       FROM QueueEntry qe
       JOIN Queues q ON qe.queueId = q.queueId
       JOIN Service s ON q.serviceId = s.serviceId
       WHERE qe.userId = ?
       ORDER BY qe.joinedAt DESC`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      history: rows
    });
  } catch (error) {
    console.error('getUserHistory error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

module.exports = {
  getUserHistory
};