const pool = require('../db');

const VALID_TYPES = ['queue_joined', 'queue_close', 'queue_served', 'queue_left', 'general'];

const validateNotificationInput = ({ userId, message, type }) => {
    if (!userId && userId !== 0) return 'userId is required';
    if (!message) return 'message is required';
    if (!type) return 'type is required';
    if (typeof userId !== 'number') return 'userId must be a number';
    if (typeof message !== 'string') return 'message must be a string';
    if (typeof type !== 'string') return 'type must be a string';
    if (message.trim().length === 0) return 'message cannot be empty';
    if (message.length > 255) return 'message must be 255 characters or fewer';
    if (!VALID_TYPES.includes(type)) return `type must be one of: ${VALID_TYPES.join(', ')}`;
    return null;
};

function mapRow(row) {
    return {
        id: row.id,
        userId: row.userId,
        message: row.message,
        type: row.type,
        read: row.status === 'viewed',
        createdAt: row.createdAt
    };
}

const getUserNotifications = async (req, res) => {
    try {
        const userId = parseInt(req.params.userId, 10);
        if (isNaN(userId)) {
            return res.status(400).json({ success: false, error: 'userId must be a number' });
        }
        const [rows] = await pool.query(
            `SELECT id, userId, message, type, status, createdAt
             FROM Notifications
             WHERE userId = ?
             ORDER BY createdAt DESC`,
            [userId]
        );
        const notifications = rows.map(mapRow);
        res.status(200).json({
            success: true,
            notifications,
            unreadCount: notifications.filter(n => !n.read).length
        });
    } catch (error) {
        console.error('getUserNotifications error:', error);
        res.status(500).json({ success: false, error: 'Server error fetching notifications' });
    }
};

const createNotification = async (req, res) => {
    try {
        const { userId, message, type } = req.body;
        const validationError = validateNotificationInput({ userId, message, type });
        if (validationError) {
            return res.status(400).json({ success: false, error: validationError });
        }
        const trimmedMessage = message.trim();
        const [result] = await pool.query(
            `INSERT INTO Notifications (userId, message, type, status)
             VALUES (?, ?, ?, 'sent')`,
            [userId, trimmedMessage, type]
        );
        const newNotification = {
            id: result.insertId,
            userId,
            message: trimmedMessage,
            type,
            read: false,
            createdAt: new Date().toISOString()
        };
        res.status(201).json({ success: true, message: 'Notification created', notification: newNotification });
    } catch (error) {
        console.error('createNotification error:', error);
        res.status(500).json({ success: false, error: 'Server error creating notification' });
    }
};

const markAsRead = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, error: 'id must be a number' });
        }
        const [result] = await pool.query(
            `UPDATE Notifications SET status = 'viewed', viewedAt = NOW() WHERE id = ?`,
            [id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Notification not found' });
        }
        const [rows] = await pool.query(
            `SELECT id, userId, message, type, status, createdAt FROM Notifications WHERE id = ?`,
            [id]
        );
        res.status(200).json({ success: true, message: 'Notification marked as read', notification: mapRow(rows[0]) });
    } catch (error) {
        console.error('markAsRead error:', error);
        res.status(500).json({ success: false, error: 'Server error updating notification' });
    }
};

const markAllAsRead = async (req, res) => {
    try {
        const userId = parseInt(req.params.userId, 10);
        if (isNaN(userId)) {
            return res.status(400).json({ success: false, error: 'userId must be a number' });
        }
        const [check] = await pool.query(
            `SELECT COUNT(*) AS total, SUM(status = 'sent') AS unread FROM Notifications WHERE userId = ?`,
            [userId]
        );
        if (check[0].total === 0) {
            return res.status(404).json({ success: false, error: 'No notifications found for this user' });
        }
        const updatedCount = Number(check[0].unread) || 0;
        if (updatedCount > 0) {
            await pool.query(
                `UPDATE Notifications SET status = 'viewed', viewedAt = NOW() WHERE userId = ? AND status = 'sent'`,
                [userId]
            );
        }
        res.status(200).json({ success: true, message: `${updatedCount} notification(s) marked as read`, updatedCount });
    } catch (error) {
        console.error('markAllAsRead error:', error);
        res.status(500).json({ success: false, error: 'Server error updating notifications' });
    }
};

const deleteNotification = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, error: 'id must be a number' });
        }
        const [result] = await pool.query(
            `DELETE FROM Notifications WHERE id = ?`,
            [id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Notification not found' });
        }
        res.status(200).json({ success: true, message: 'Notification deleted' });
    } catch (error) {
        console.error('deleteNotification error:', error);
        res.status(500).json({ success: false, error: 'Server error deleting notification' });
    }
};

module.exports = {
    getUserNotifications,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    validateNotificationInput
};