const request = require('supertest');
const app = require('../server');
const pool = require('../db');

describe('Queue Management API Tests', () => {
  let userId1;
  let userId2;
  let serviceId1;
  let serviceId2;
  let queueId1;

  beforeEach(async () => {
    // Clean dependent tables first
    await pool.query('DELETE FROM Notifications');
    await pool.query('DELETE FROM QueueEntry');
    await pool.query('DELETE FROM Queues');
    await pool.query('DELETE FROM UserProfile');
    await pool.query('DELETE FROM UserCredentials');
    await pool.query('DELETE FROM Service');

    // Seed users
    const [user1Result] = await pool.query(
      `INSERT INTO UserCredentials (email, passwordHash, role)
       VALUES ('user1@example.com', '$2b$10$abcdefghijklmnopqrstuv', 'user')`
    );
    userId1 = user1Result.insertId;

    const [user2Result] = await pool.query(
      `INSERT INTO UserCredentials (email, passwordHash, role)
       VALUES ('user2@example.com', '$2b$10$abcdefghijklmnopqrstuv', 'user')`
    );
    userId2 = user2Result.insertId;

    await pool.query(
      `INSERT INTO UserProfile (userId, fullName, phone)
       VALUES (?, 'User One', '1111111111')`,
      [userId1]
    );

    await pool.query(
      `INSERT INTO UserProfile (userId, fullName, phone)
       VALUES (?, 'User Two', '2222222222')`,
      [userId2]
    );

    // Seed services
    const [service1Result] = await pool.query(
      `INSERT INTO Service (name, description, expectedDuration, priorityLevel, isActive)
       VALUES ('Academic Advising', 'Course planning help', 15, 'medium', 1)`
    );
    serviceId1 = service1Result.insertId;

    const [service2Result] = await pool.query(
      `INSERT INTO Service (name, description, expectedDuration, priorityLevel, isActive)
       VALUES ('Student Services', 'General help', 20, 'low', 0)`
    );
    serviceId2 = service2Result.insertId;

    // Open queue for service 1
    const [queueResult] = await pool.query(
      `INSERT INTO Queues (serviceId, status)
       VALUES (?, 'open')`,
      [serviceId1]
    );
    queueId1 = queueResult.insertId;
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('POST /api/queue/join', () => {
    test('should join queue successfully', async () => {
      const res = await request(app)
        .post('/api/queue/join')
        .send({ userId: userId1, serviceId: serviceId1 });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.queueEntry.userId).toBe(userId1);
      expect(res.body.queueEntry.serviceId).toBe(serviceId1);
      expect(res.body.queueEntry.position).toBe(1);

      const [rows] = await pool.query(
        `SELECT *
         FROM QueueEntry
         WHERE userId = ? AND queueId = ? AND status = 'waiting'`,
        [userId1, queueId1]
      );

      expect(rows.length).toBe(1);
      expect(rows[0].positionInQueue).toBe(1);

      const [notifRows] = await pool.query(
        `SELECT *
         FROM Notifications
         WHERE userId = ?`,
        [userId1]
      );

      expect(notifRows.length).toBe(1);
      expect(notifRows[0].type).toBe('queue_joined');
    });

    test('should reject missing fields', async () => {
      const res = await request(app)
        .post('/api/queue/join')
        .send({ userId: userId1 });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('should reject inactive service', async () => {
      const res = await request(app)
        .post('/api/queue/join')
        .send({ userId: userId1, serviceId: serviceId2 });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Service is not currently open');
    });

    test('should reject duplicate queue entry', async () => {
      await request(app)
        .post('/api/queue/join')
        .send({ userId: userId1, serviceId: serviceId1 });

      const res = await request(app)
        .post('/api/queue/join')
        .send({ userId: userId1, serviceId: serviceId1 });

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/queue/current/:userId', () => {
    test('should get current queue info with wait time', async () => {
      await request(app)
        .post('/api/queue/join')
        .send({ userId: userId1, serviceId: serviceId1 });

      await request(app)
        .post('/api/queue/join')
        .send({ userId: userId2, serviceId: serviceId1 });

      const res = await request(app).get(`/api/queue/current/${userId2}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.queue.position).toBe(2);
      expect(res.body.queue.peopleAhead).toBe(1);
      expect(res.body.queue.estimatedWaitMinutes).toBe(15);
    });

    test('should return 404 when no active queue exists', async () => {
      const res = await request(app).get(`/api/queue/current/${userId1}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/queue/leave', () => {
    test('should leave queue successfully', async () => {
      await request(app)
        .post('/api/queue/join')
        .send({ userId: userId1, serviceId: serviceId1 });

      const res = await request(app)
        .post('/api/queue/leave')
        .send({ userId: userId1, serviceId: serviceId1 });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const [rows] = await pool.query(
        `SELECT *
         FROM QueueEntry
         WHERE userId = ? AND queueId = ?`,
        [userId1, queueId1]
      );

      expect(rows.length).toBe(1);
      expect(rows[0].status).toBe('canceled');
      expect(rows[0].cancelledAt).not.toBeNull();
    });

    test('should reorder remaining users after leave', async () => {
      await request(app)
        .post('/api/queue/join')
        .send({ userId: userId1, serviceId: serviceId1 });

      await request(app)
        .post('/api/queue/join')
        .send({ userId: userId2, serviceId: serviceId1 });

      await request(app)
        .post('/api/queue/leave')
        .send({ userId: userId1, serviceId: serviceId1 });

      const [rows] = await pool.query(
        `SELECT *
         FROM QueueEntry
         WHERE userId = ? AND status = 'waiting'`,
        [userId2]
      );

      expect(rows.length).toBe(1);
      expect(rows[0].positionInQueue).toBe(1);
    });
  });

  describe('Queue history via QueueEntry statuses', () => {
    test('should show served/canceled records in QueueEntry', async () => {
      await request(app)
        .post('/api/queue/join')
        .send({ userId: userId1, serviceId: serviceId1 });

      await request(app)
        .post('/api/queue/leave')
        .send({ userId: userId1, serviceId: serviceId1 });

      const [rows] = await pool.query(
        `SELECT status, joinedAt, cancelledAt
         FROM QueueEntry
         WHERE userId = ?`,
        [userId1]
      );

      expect(rows.length).toBe(1);
      expect(rows[0].status).toBe('canceled');
      expect(rows[0].joinedAt).not.toBeNull();
      expect(rows[0].cancelledAt).not.toBeNull();
    });
  });

  describe('POST /api/queue/serve-next/:serviceId', () => {
    test('should serve next user successfully', async () => {
      await request(app)
        .post('/api/queue/join')
        .send({ userId: userId1, serviceId: serviceId1 });

      const res = await request(app)
        .post(`/api/queue/serve-next/${serviceId1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const [rows] = await pool.query(
        `SELECT *
         FROM QueueEntry
         WHERE userId = ?`,
        [userId1]
      );

      expect(rows.length).toBe(1);
      expect(rows[0].status).toBe('served');
      expect(rows[0].servedAt).not.toBeNull();
    });

    test('should reorder remaining users after serve-next', async () => {
      await request(app)
        .post('/api/queue/join')
        .send({ userId: userId1, serviceId: serviceId1 });

      await request(app)
        .post('/api/queue/join')
        .send({ userId: userId2, serviceId: serviceId1 });

      await request(app)
        .post(`/api/queue/serve-next/${serviceId1}`);

      const [rows] = await pool.query(
        `SELECT *
         FROM QueueEntry
         WHERE userId = ? AND status = 'waiting'`,
        [userId2]
      );

      expect(rows.length).toBe(1);
      expect(rows[0].positionInQueue).toBe(1);
    });

    test('should return 404 if nobody is waiting', async () => {
      const res = await request(app)
        .post(`/api/queue/serve-next/${serviceId1}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});