const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queue-controller')

router.post('/join', queueController.joinQueue);
router.post('/leave', queueController.leaveQueue);
router.get('/current/:userId', queueController.getCurrentQueue);
router.post('/serve-next/:serviceId', queueController.serveNext);
router.get('/service/:serviceId', queueController.getQueueByService);
router.post('/entry/:queueEntryId/move', queueController.moveQueueEntry);
router.post('/entry/:queueEntryId/remove', queueController.removeQueueEntry);

module.exports = router;


