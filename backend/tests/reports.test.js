const request = require('supertest');
const app = require('../server');
const pool = require('../db');

// Mock the db pool
jest.mock('../db', () => ({
  query: jest.fn()
}));

const mockRows = [
  {
    email: 'john.doe@email.com',
    fullName: 'John Doe',
    serviceName: 'General Support',
    queueId: 1,
    positionInQueue: 1,
    joinedAt: '2026-04-25T14:00:00.000Z',
    servedAt: '2026-04-25T14:15:00.000Z',
    cancelledAt: null,
    status: 'served',
    waitMinutes: '15.0'
  },
  {
    email: 'jane.smith@email.com',
    fullName: 'Jane Smith',
    serviceName: 'General Support',
    queueId: 1,
    positionInQueue: 2,
    joinedAt: '2026-04-25T14:05:00.000Z',
    servedAt: null,
    cancelledAt: null,
    status: 'waiting',
    waitMinutes: null
  },
  {
    email: 'bob.jones@email.com',
    fullName: 'Bob Jones',
    serviceName: 'Technical Help',
    queueId: 1,
    positionInQueue: 3,
    joinedAt: '2026-04-25T14:10:00.000Z',
    servedAt: null,
    cancelledAt: '2026-04-25T14:20:00.000Z',
    status: 'canceled',
    waitMinutes: null
  }
];

describe('Reports Routes', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/reports/data', () => {
    it('should return report data with correct stats', async () => {
      pool.query.mockResolvedValueOnce([mockRows]);

      const res = await request(app).get('/api/reports/data');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('records');
      expect(res.body).toHaveProperty('stats');
      expect(res.body.stats.totalServed).toBe(1);
      expect(res.body.stats.totalWaiting).toBe(1);
      expect(res.body.stats.totalCancelled).toBe(1);
      expect(res.body.stats.avgWaitMinutes).toBe('15.0');
    });

    it('should return empty stats when no records', async () => {
      pool.query.mockResolvedValueOnce([[]]);

      const res = await request(app).get('/api/reports/data');

      expect(res.statusCode).toBe(200);
      expect(res.body.records).toHaveLength(0);
      expect(res.body.stats.totalServed).toBe(0);
      expect(res.body.stats.avgWaitMinutes).toBe('N/A');
    });

    it('should return 500 on database error', async () => {
      pool.query.mockRejectedValueOnce(new Error('DB connection failed'));

      const res = await request(app).get('/api/reports/data');

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /api/reports/csv', () => {
    it('should download a CSV file', async () => {
      pool.query.mockResolvedValueOnce([mockRows]);

      const res = await request(app).get('/api/reports/csv');

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv|application\/octet-stream/);
    });

    it('should return 500 on database error', async () => {
      pool.query.mockRejectedValueOnce(new Error('DB connection failed'));

      const res = await request(app).get('/api/reports/csv');

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error');
    });
  });

});