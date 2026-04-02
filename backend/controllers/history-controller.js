const { queueHistory } = require('../data/mock-data');


const getUserHistory = (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (Number.isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid userId is required'
      });
    }

    const history = queueHistory
      .filter(h => h.userId === userId)
      .sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt));

    return res.status(200).json({
      success: true,
      history
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

