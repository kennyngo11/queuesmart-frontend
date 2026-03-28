const { notifications } = require('../data/mock-data');

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

const getUserNotifications = (req, res) => {
    try {
        const userId = parseInt(req.params.userId, 10);
        if (isNaN(userId)) {
            return res.status(400).json({ success: false, error: 'userId must be a number' });
        }
        const userNotifications = notifications
            .filter(n => n.userId === userId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.status(200).json({
            success: true,
            notifications: userNotifications,
            unreadCount: userNotifications.filter(n => !n.read).length
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server error fetching notifications' });
    }
};

const createNotification = (req, res) => {
    try {
        const { userId, message, type } = req.body;
        const validationError = validateNotificationInput({ userId, message, type });
        if (validationError) {
            return res.status(400).json({ success: false, error: validationError });
        }
        const newNotification = {
            id: notifications.length > 0 ? Math.max(...notifications.map(n => n.id)) + 1 : 1,
            userId,
            message: message.trim(),
            type,
            read: false,
            createdAt: new Date().toISOString()
        };
        notifications.push(newNotification);
        res.status(201).json({ success: true, message: 'Notification created', notification: newNotification });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server error creating notification' });
    }
};

const markAsRead = (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, error: 'id must be a number' });
        }
        const notification = notifications.find(n => n.id === id);
        if (!notification) {
            return res.status(404).json({ success: false, error: 'Notification not found' });
        }
        notification.read = true;
        res.status(200).json({ success: true, message: 'Notification marked as read', notification });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server error updating notification' });
    }
};

const markAllAsRead = (req, res) => {
    try {
        const userId = parseInt(req.params.userId, 10);
        if (isNaN(userId)) {
            return res.status(400).json({ success: false, error: 'userId must be a number' });
        }
        const userNotifications = notifications.filter(n => n.userId === userId);
        if (userNotifications.length === 0) {
            return res.status(404).json({ success: false, error: 'No notifications found for this user' });
        }
        let updatedCount = 0;
        userNotifications.forEach(n => { if (!n.read) { n.read = true; updatedCount++; } });
        res.status(200).json({ success: true, message: `${updatedCount} notification(s) marked as read`, updatedCount });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server error updating notifications' });
    }
};

const deleteNotification = (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, error: 'id must be a number' });
        }
        const index = notifications.findIndex(n => n.id === id);
        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Notification not found' });
        }
        notifications.splice(index, 1);
        res.status(200).json({ success: true, message: 'Notification deleted' });
    } catch (error) {
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