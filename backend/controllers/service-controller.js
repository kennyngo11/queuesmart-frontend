// queuesmart/backend/controllers/service-controller.js
const { validateService } = require('../utils/service-validators');

// In-memory service store
let services = [];
let nextId = 1;

// List all services
exports.listServices = (req, res) => {
  res.json(services);
};

// Create a new service
exports.createService = (req, res) => {
  const { error } = validateService(req.body);
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  const newService = {
    id: nextId++,
    serviceName: req.body.serviceName,
    description: req.body.description,
    duration: req.body.duration,
    priority: req.body.priority
  };
  services.push(newService);
  res.status(201).json(newService);
};

// Update an existing service
exports.updateService = (req, res) => {
  const id = parseInt(req.params.id, 10);
  const service = services.find(s => s.id === id);
  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }
  const { error } = validateService(req.body);
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  service.serviceName = req.body.serviceName;
  service.description = req.body.description;
  service.duration = req.body.duration;
  service.priority = req.body.priority;
  res.json(service);
};

// For testing: reset services
exports._reset = () => {
  services = [];
  nextId = 1;
};
