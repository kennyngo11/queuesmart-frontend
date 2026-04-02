// queuesmart/backend/tests/service.test.js
const request = require('supertest');
const express = require('express');
const serviceRoutes = require('../routes/service');
const serviceController = require('../controllers/service-controller');

const app = express();
app.use(express.json());
app.use('/api/services', serviceRoutes);

describe('Service Management API', () => {
  beforeEach(() => {
    serviceController._reset();
  });

  it('should create a service with valid data', async () => {
    const res = await request(app)
      .post('/api/services')
      .send({
        serviceName: 'Test Service',
        description: 'A test service',
        duration: 30,
        priority: 'medium'
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.serviceName).toBe('Test Service');
  });

  it('should not create a service with missing fields', async () => {
    const res = await request(app)
      .post('/api/services')
      .send({ description: 'desc', duration: 10, priority: 'low' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/Service Name/);
  });

  it('should not create a service with invalid duration', async () => {
    const res = await request(app)
      .post('/api/services')
      .send({ serviceName: 'A', description: 'desc', duration: 0, priority: 'low' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/Duration/);
  });

  it('should list all services', async () => {
    await request(app).post('/api/services').send({
      serviceName: 'S1', description: 'D1', duration: 10, priority: 'low'
    });
    await request(app).post('/api/services').send({
      serviceName: 'S2', description: 'D2', duration: 20, priority: 'high'
    });
    const res = await request(app).get('/api/services');
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(2);
  });

  it('should update an existing service', async () => {
    const createRes = await request(app).post('/api/services').send({
      serviceName: 'S1', description: 'D1', duration: 10, priority: 'low'
    });
    const id = createRes.body.id;
    const updateRes = await request(app).put(`/api/services/${id}`).send({
      serviceName: 'S1-updated', description: 'D1-updated', duration: 15, priority: 'medium'
    });
    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.serviceName).toBe('S1-updated');
  });

  it('should return 404 for updating non-existent service', async () => {
    const res = await request(app).put('/api/services/999').send({
      serviceName: 'X', description: 'Y', duration: 10, priority: 'low'
    });
    expect(res.statusCode).toBe(404);
  });
});
