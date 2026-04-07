// queuesmart/backend/controllers/service-controller.js
const { validateService } = require('../utils/service-validators');
const pool = require('../db');

function mapServiceRow(row) {
  return {
    id: row.serviceId,
    serviceName: row.name,
    description: row.description,
    duration: row.expectedDuration,
    priority: row.priorityLevel
  };
}

// List all services
exports.listServices = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT serviceId, name, description, expectedDuration, priorityLevel
       FROM Service
       WHERE isActive = 1
       ORDER BY serviceId ASC`
    );
    res.json(rows.map(mapServiceRow));
  } catch (error) {
    console.error('Error listing services:', error.message);
    res.status(500).json({ error: 'Failed to retrieve services' });
  }
};

// Create a new service
exports.createService = async (req, res) => {
  const { error } = validateService(req.body);
  if (error) {
    return res.status(400).json({ error: error.message });
  }

  const { serviceName, description, duration, priority } = req.body;

  try {
    const [result] = await pool.query(
      `INSERT INTO Service (name, description, expectedDuration, priorityLevel)
       VALUES (?, ?, ?, ?)`,
      [serviceName.trim(), description.trim(), duration, priority]
    );

    res.status(201).json({
      id: result.insertId,
      serviceName: serviceName.trim(),
      description: description.trim(),
      duration,
      priority
    });
  } catch (dbError) {
    if (dbError.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Service name already exists' });
    }

    if (dbError.code === 'ER_CHECK_CONSTRAINT_VIOLATED' || dbError.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD') {
      return res.status(400).json({ error: 'Database validation failed for service data' });
    }

    console.error('Error creating service:', dbError.message);
    res.status(500).json({ error: 'Failed to create service' });
  }
};

// Update an existing service
exports.updateService = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid service id' });
  }

  const { error } = validateService(req.body);
  if (error) {
    return res.status(400).json({ error: error.message });
  }

  const { serviceName, description, duration, priority } = req.body;

  try {
    const [result] = await pool.query(
      `UPDATE Service
       SET name = ?, description = ?, expectedDuration = ?, priorityLevel = ?
       WHERE serviceId = ? AND isActive = 1`,
      [serviceName.trim(), description.trim(), duration, priority, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json({
      id,
      serviceName: serviceName.trim(),
      description: description.trim(),
      duration,
      priority
    });
  } catch (dbError) {
    if (dbError.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Service name already exists' });
    }

    if (dbError.code === 'ER_CHECK_CONSTRAINT_VIOLATED' || dbError.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD') {
      return res.status(400).json({ error: 'Database validation failed for service data' });
    }

    console.error('Error updating service:', dbError.message);
    res.status(500).json({ error: 'Failed to update service' });
  }
};
