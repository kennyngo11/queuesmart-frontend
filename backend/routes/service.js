// queuesmart/backend/routes/service.js
const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/service-controller');

// List all services
router.get('/', serviceController.listServices);
// Create a new service
router.post('/', serviceController.createService);
// Update a service
router.put('/:id', serviceController.updateService);
// Delete a service
router.delete('/:id', serviceController.deleteService);
// Enable or disable a service
router.patch('/:serviceId/status', serviceController.updateServiceStatus);

module.exports = router;
