const request = require('supertest');
const app = require('../server');
const { queues, queueHistory, notifications, services, users } = require('../data/mock-data');



describe('Queue Management API Tests', () => {
  beforeEach(() => {
    queues.length = 0;
    queueHistory.length = 0;
    notifications.length = 0;

    services.length = 0;
    services.push(
      {
        id: 1,
        name: 'Academic Advising',
        description: 'Get help with course selection and academic planning',
        expectedDuration: 15,
        priority: 'medium',
        status: 'open',
        createdAt: '2024-02-01T10:00:00.000Z'
      },
      {
        id: 2,
        name: 'IT Help Desk',
        description: 'Technical support for students',
        expectedDuration: 10,
        priority: 'high',
        status: 'open',
        createdAt: '2024-02-01T10:00:00.000Z'
      },
      {
        id: 3,
        name: 'Student Services',
        description: 'General student inquiries and support',
        expectedDuration: 20,
        priority: 'low',
        status: 'closed',
        createdAt: '2024-02-01T10:00:00.000Z'
      }
    );

    users.length = 0;
    users.push(
      {
        id: 1,
        email: 'admin@queuesmart.com',
        password: 'admin123',
        name: 'Admin',
        role: 'admin',
        createdAt: '2024-02-01T10:00:00.000Z'
      },
      {
        id: 2,
        email: 'user1@example.com',
        password: 'password123',
        name: 'user2',
        role: 'user',
        createdAt: '2024-02-10T14:30:00.000Z'
      },
      {
        id: 3,
        email: 'user2@example.com',
        password: 'password123',
        name: 'user2',
        role: 'user',
        createdAt: '2024-02-10T14:30:00.000Z'
      }
    );
});

describe('POST /api/queue/join', () => {
    test('should join queue successfully', async () => {
      const res = await request(app)
        .post('/api/queue/join')
        .send({ userId: 2, serviceId: 1 });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.queueEntry.userId).toBe(2);
      expect(res.body.queueEntry.serviceId).toBe(1);
      expect(res.body.queueEntry.position).toBe(1);
      expect(notifications.length).toBe(1);
    });

    test('should reject missing fields', async () => {
      const res = await request(app)
        .post('/api/queue/join')
        .send({ userId: 2 });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('should reject closed service', async () => {
      const res = await request(app)
        .post('/api/queue/join')
        .send({ userId: 2, serviceId: 3 });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Service is not currently open');
    });

    test('should reject duplicate queue entry', async () => {
      await request(app).post('/api/queue/join').send({ userId: 2, serviceId: 1 });

      const res = await request(app)
        .post('/api/queue/join')
        .send({ userId: 2, serviceId: 1 });

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/queue/current/:userId', () => {
    test('should get current queue info with wait time', async () => {
      await request(app).post('/api/queue/join').send({ userId: 2, serviceId: 1 });
      await request(app).post('/api/queue/join').send({ userId: 3, serviceId: 1 });

      const res = await request(app).get('/api/queue/current/3');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.queue.position).toBe(2);
      expect(res.body.queue.peopleAhead).toBe(1);
      expect(res.body.queue.estimatedWaitMinutes).toBe(15);
    });

    test('should return 404 when no active queue exists', async () => {
      const res = await request(app).get('/api/queue/current/2');

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/queue/leave', () => {
    test('should leave queue successfully', async () => {
      await request(app).post('/api/queue/join').send({ userId: 2, serviceId: 1 });

      const res = await request(app)
        .post('/api/queue/leave')
        .send({ userId: 2, serviceId: 1 });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(queues.length).toBe(0);
      expect(queueHistory.length).toBe(1);
      expect(queueHistory[0].status).toBe('left');
    });
  });

  describe('GET /api/history/:userId', () => {
    test('should return queue history for a user', async () => {
      await request(app).post('/api/queue/join').send({ userId: 2, serviceId: 1 });
      await request(app).post('/api/queue/leave').send({ userId: 2, serviceId: 1 });

      const res = await request(app).get('/api/history/2');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.history)).toBe(true);
      expect(res.body.history.length).toBe(1);
    });
  });

    describe('POST /api/queue/serve-next/:serviceId', () => {
    test('should serve next user and move to history', async () => {
      await request(app).post('/api/queue/join').send({ userId: 2, serviceId: 1 });

      const res = await request(app).post('/api/queue/serve-next/1');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(queueHistory.length).toBe(1);
      expect(queueHistory[0].status).toBe('served');
      expect(queues.length).toBe(0);
    });
  });
});