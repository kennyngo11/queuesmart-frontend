const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification-controller');

router.get('/:userId', notificationController.getUserNotifications);
router.post('/', notificationController.createNotification);
router.patch('/read-all/:userId', notificationController.markAllAsRead);
router.patch('/:id/read', notificationController.markAsRead);
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;