// queuesmart/backend/tests/service.test.js
const request = require('supertest');
const express = require('express');

jest.mock('../db', () => ({
  query: jest.fn()
}));

const pool = require('../db');
const serviceRoutes = require('../routes/service');

const app = express();
app.use(express.json());
app.use('/api/services', serviceRoutes);

describe('Service Management API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a service with valid data', async () => {
    pool.query.mockResolvedValueOnce([{ insertId: 11 }]);

    const res = await request(app)
      .post('/api/services')
      .send({
        serviceName: 'Test Service',
        description: 'A test service',
        duration: 30,
        priority: 'medium'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.id).toBe(11);
    expect(res.body.serviceName).toBe('Test Service');
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it('should not create a service with missing fields', async () => {
    const res = await request(app)
      .post('/api/services')
      .send({ description: 'desc', duration: 10, priority: 'low' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/Service Name/);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('should not create a service with invalid duration', async () => {
    const res = await request(app)
      .post('/api/services')
      .send({ serviceName: 'A', description: 'desc', duration: 0, priority: 'low' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/Duration/);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('should list all services', async () => {
    pool.query.mockResolvedValueOnce([[
      { serviceId: 1, name: 'S1', description: 'D1', expectedDuration: 10, priorityLevel: 'low' },
      { serviceId: 2, name: 'S2', description: 'D2', expectedDuration: 20, priorityLevel: 'high' }
    ]]);

    const res = await request(app).get('/api/services');

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(2);
    expect(res.body[0].serviceName).toBe('S1');
    expect(res.body[1].priority).toBe('high');
  });

  it('should update an existing service', async () => {
    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const updateRes = await request(app).put('/api/services/1').send({
      serviceName: 'S1-updated', description: 'D1-updated', duration: 15, priority: 'medium'
    });

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.serviceName).toBe('S1-updated');
  });

  it('should return 404 for updating non-existent service', async () => {
    pool.query.mockResolvedValueOnce([{ affectedRows: 0 }]);

    const res = await request(app).put('/api/services/999').send({
      serviceName: 'X', description: 'Y', duration: 10, priority: 'low'
    });

    expect(res.statusCode).toBe(404);
  });

  it('should return 409 when creating duplicate service name', async () => {
    const duplicateError = new Error('Duplicate service name');
    duplicateError.code = 'ER_DUP_ENTRY';
    pool.query.mockRejectedValueOnce(duplicateError);

    const res = await request(app).post('/api/services').send({
      serviceName: 'Existing Service',
      description: 'desc',
      duration: 30,
      priority: 'high'
    });

    expect(res.statusCode).toBe(409);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it('should return 500 when list services query fails', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB unavailable'));

    const res = await request(app).get('/api/services');

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/Failed to retrieve services/);
  });

  it('should delete a service successfully', async () => {
    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await request(app).delete('/api/services/1');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should return 404 when deleting non-existent service', async () => {
    pool.query.mockResolvedValueOnce([{ affectedRows: 0 }]);
    const res = await request(app).delete('/api/services/999');
    expect(res.statusCode).toBe(404);
  });

  it('should return 400 for invalid service id on delete', async () => {
    const res = await request(app).delete('/api/services/abc');
    expect(res.statusCode).toBe(400);
  });

  it('should return 500 when delete query fails', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app).delete('/api/services/1');
    expect(res.statusCode).toBe(500);
  });

  it('should activate a service', async () => {
    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await request(app).patch('/api/services/1/status').send({ isActive: true });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should deactivate a service', async () => {
    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await request(app).patch('/api/services/1/status').send({ isActive: false });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should return 500 when status update query fails', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app).patch('/api/services/1/status').send({ isActive: true });
    expect(res.statusCode).toBe(500);
  });

  it('should return 400 for invalid service id on update', async () => {
    const res = await request(app).put('/api/services/abc').send({
      serviceName: 'X', description: 'Y', duration: 10, priority: 'low'
    });
    expect(res.statusCode).toBe(400);
  });

  it('should return 409 on duplicate name when updating', async () => {
    const duplicateError = new Error('Duplicate');
    duplicateError.code = 'ER_DUP_ENTRY';
    pool.query.mockRejectedValueOnce(duplicateError);
    const res = await request(app).put('/api/services/1').send({
      serviceName: 'Existing', description: 'desc', duration: 10, priority: 'low'
    });
    expect(res.statusCode).toBe(409);
  });

  it('should return 500 when update query fails', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app).put('/api/services/1').send({
      serviceName: 'X', description: 'Y', duration: 10, priority: 'low'
    });
    expect(res.statusCode).toBe(500);
  });


  // service-validator edge cases to hit uncovered lines 9,12,15,18,24
  it('should reject service name longer than 100 characters', async () => {
    const res = await request(app)
      .post('/api/services')
      .send({ serviceName: 'a'.repeat(101), description: 'desc', duration: 10, priority: 'low' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/100 characters/);
  });

  it('should reject missing description', async () => {
    const res = await request(app)
      .post('/api/services')
      .send({ serviceName: 'Valid Name', description: '', duration: 10, priority: 'low' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/Description/);
  });

  it('should reject description longer than 300 characters', async () => {
    const res = await request(app)
      .post('/api/services')
      .send({ serviceName: 'Valid Name', description: 'a'.repeat(301), duration: 10, priority: 'low' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/300 characters/);
  });

  it('should reject non-integer duration', async () => {
    const res = await request(app)
      .post('/api/services')
      .send({ serviceName: 'Valid Name', description: 'desc', duration: 10.5, priority: 'low' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/integer/);
  });

  it('should reject invalid priority level', async () => {
    const res = await request(app)
      .post('/api/services')
      .send({ serviceName: 'Valid Name', description: 'desc', duration: 10, priority: 'urgent' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/Priority/);
  });

});