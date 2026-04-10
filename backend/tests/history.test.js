const request = require('supertest');
const express = require('express');

jest.mock('../db', () => ({
    query: jest.fn()
}));

const pool = require('../db');
const historyRoutes = require('../routes/history');

const app = express();
app.use(express.json());
app.use('/api/history', historyRoutes);

describe('History API Tests', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/history/:userId', () => {
        test('Should return queue history for a valid user', async () => {
            pool.query.mockResolvedValueOnce([[
                { id: 1, userId: 2, serviceId: 1, serviceName: 'Academic Advising', joinedAt: '2024-02-12T11:00:00.000Z', servedAt: '2024-02-12T11:20:00.000Z', leftAt: null, status: 'served' },
                { id: 2, userId: 2, serviceId: 2, serviceName: 'IT Help Desk', joinedAt: '2024-02-11T09:00:00.000Z', servedAt: null, leftAt: '2024-02-11T09:10:00.000Z', status: 'canceled' }
            ]]);
            const res = await request(app).get('/api/history/2');
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.history).toHaveLength(2);
        });

        test('Should return empty array for user with no history', async () => {
            pool.query.mockResolvedValueOnce([[]]);
            const res = await request(app).get('/api/history/999');
            expect(res.statusCode).toBe(200);
            expect(res.body.history).toHaveLength(0);
        });

        test('Should return 400 for non-numeric userId', async () => {
            const res = await request(app).get('/api/history/abc');
            expect(res.statusCode).toBe(400);
        });

        test('Should return 500 on database error', async () => {
            pool.query.mockRejectedValueOnce(new Error('DB error'));
            const res = await request(app).get('/api/history/2');
            expect(res.statusCode).toBe(500);
        });

        test('Should include service name in history entries', async () => {
            pool.query.mockResolvedValueOnce([[
                { id: 1, userId: 2, serviceId: 1, serviceName: 'Academic Advising', joinedAt: '2024-02-12T11:00:00.000Z', servedAt: '2024-02-12T11:20:00.000Z', leftAt: null, status: 'served' }
            ]]);
            const res = await request(app).get('/api/history/2');
            expect(res.body.history[0].serviceName).toBe('Academic Advising');
        });
    });
});