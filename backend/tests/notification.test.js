const request = require('supertest');
const express = require('express');

jest.mock('../db', () => ({
    query: jest.fn()
}));

const pool = require('../db');
const notificationRoutes = require('../routes/notifications');
const { validateNotificationInput } = require('../controllers/notification-controller');

const app = express();
app.use(express.json());
app.use('/api/notifications', notificationRoutes);

describe('Notification API Tests', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ── Validation unit tests ─────────────────────────────────────────────
    describe('validateNotificationInput()', () => {
        test('Should return null for valid input', () => {
            expect(validateNotificationInput({ userId: 1, message: 'You joined the queue', type: 'queue_joined' })).toBeNull();
        });
        test('Should require userId', () => {
            expect(validateNotificationInput({ message: 'msg', type: 'general' })).toBe('userId is required');
        });
        test('Should require message', () => {
            expect(validateNotificationInput({ userId: 1, type: 'general' })).toBe('message is required');
        });
        test('Should require type', () => {
            expect(validateNotificationInput({ userId: 1, message: 'msg' })).toBe('type is required');
        });
        test('Should reject non-numeric userId', () => {
            expect(validateNotificationInput({ userId: 'abc', message: 'msg', type: 'general' })).toBe('userId must be a number');
        });
        test('Should reject non-string message', () => {
            expect(validateNotificationInput({ userId: 1, message: 123, type: 'general' })).toBe('message must be a string');
        });
        test('Should reject empty message', () => {
            expect(validateNotificationInput({ userId: 1, message: '   ', type: 'general' })).toBe('message cannot be empty');
        });
        test('Should reject message over 255 characters', () => {
            expect(validateNotificationInput({ userId: 1, message: 'a'.repeat(256), type: 'general' })).toBe('message must be 255 characters or fewer');
        });
        test('Should reject invalid type value', () => {
            expect(validateNotificationInput({ userId: 1, message: 'msg', type: 'invalid_type' })).toMatch(/type must be one of/);
        });
        test('Should accept all valid type values', () => {
            ['queue_joined', 'queue_close', 'queue_served', 'queue_left', 'general'].forEach(type => {
                expect(validateNotificationInput({ userId: 1, message: 'msg', type })).toBeNull();
            });
        });
        test('Should reject non-string type', () => {
            expect(validateNotificationInput({ userId: 1, message: 'msg', type: 123 })).toBe('type must be a string');
        });
    });

    // ── GET /api/notifications/:userId ────────────────────────────────────
    describe('GET /api/notifications/:userId', () => {
        test('Should return notifications for a valid user', async () => {
            pool.query.mockResolvedValueOnce([[
                { id: 2, userId: 2, message: 'Next in line', type: 'queue_close', status: 'sent', createdAt: '2024-02-13T14:10:00.000Z' },
                { id: 1, userId: 2, message: 'Joined queue', type: 'queue_joined', status: 'sent', createdAt: '2024-02-13T14:00:00.000Z' }
            ]]);
            const res = await request(app).get('/api/notifications/2');
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.notifications).toHaveLength(2);
            expect(res.body.unreadCount).toBe(2);
        });

        test('Should return empty array for user with no notifications', async () => {
            pool.query.mockResolvedValueOnce([[]]);
            const res = await request(app).get('/api/notifications/999');
            expect(res.statusCode).toBe(200);
            expect(res.body.notifications).toHaveLength(0);
        });

        test('Should return 400 for non-numeric userId', async () => {
            const res = await request(app).get('/api/notifications/abc');
            expect(res.statusCode).toBe(400);
        });

        test('Should correctly count unread notifications', async () => {
            pool.query.mockResolvedValueOnce([[
                { id: 3, userId: 1, message: 'System notification', type: 'general', status: 'viewed', createdAt: '2024-02-13T13:00:00.000Z' }
            ]]);
            const res = await request(app).get('/api/notifications/1');
            expect(res.body.unreadCount).toBe(0);
        });

        test('Should map read field from status column', async () => {
            pool.query.mockResolvedValueOnce([[
                { id: 1, userId: 1, message: 'Test', type: 'general', status: 'viewed', createdAt: '2024-02-13T13:00:00.000Z' },
                { id: 2, userId: 1, message: 'Test2', type: 'general', status: 'sent', createdAt: '2024-02-13T14:00:00.000Z' }
            ]]);
            const res = await request(app).get('/api/notifications/1');
            expect(res.body.notifications[0].read).toBe(true);
            expect(res.body.notifications[1].read).toBe(false);
        });

        test('Should return 500 on database error', async () => {
            pool.query.mockRejectedValueOnce(new Error('DB error'));
            const res = await request(app).get('/api/notifications/2');
            expect(res.statusCode).toBe(500);
        });
    });

    // ── POST /api/notifications ───────────────────────────────────────────
    describe('POST /api/notifications', () => {
        test('Should create a notification', async () => {
            pool.query.mockResolvedValueOnce([{ insertId: 10 }]);
            const res = await request(app).post('/api/notifications').send({ userId: 2, message: 'You joined the queue', type: 'queue_joined' });
            expect(res.statusCode).toBe(201);
            expect(res.body.notification.read).toBe(false);
            expect(res.body.notification.id).toBe(10);
        });

        test('Should reject missing userId', async () => {
            const res = await request(app).post('/api/notifications').send({ message: 'Hello', type: 'general' });
            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('userId is required');
        });

        test('Should reject missing message', async () => {
            const res = await request(app).post('/api/notifications').send({ userId: 1, type: 'general' });
            expect(res.statusCode).toBe(400);
        });

        test('Should reject missing type', async () => {
            const res = await request(app).post('/api/notifications').send({ userId: 1, message: 'Hello' });
            expect(res.statusCode).toBe(400);
        });

        test('Should reject message over 255 characters', async () => {
            const res = await request(app).post('/api/notifications').send({ userId: 1, message: 'a'.repeat(256), type: 'general' });
            expect(res.statusCode).toBe(400);
        });

        test('Should reject invalid type', async () => {
            const res = await request(app).post('/api/notifications').send({ userId: 1, message: 'Hello', type: 'fake_type' });
            expect(res.statusCode).toBe(400);
        });

        test('Should trim whitespace from message', async () => {
            pool.query.mockResolvedValueOnce([{ insertId: 11 }]);
            const res = await request(app).post('/api/notifications').send({ userId: 1, message: '  Hello world  ', type: 'general' });
            expect(res.body.notification.message).toBe('Hello world');
        });

        test('Should return 500 on database error', async () => {
            pool.query.mockRejectedValueOnce(new Error('DB error'));
            const res = await request(app).post('/api/notifications').send({ userId: 1, message: 'Test', type: 'general' });
            expect(res.statusCode).toBe(500);
        });
    });

    // ── PATCH /api/notifications/:id/read ─────────────────────────────────
    describe('PATCH /api/notifications/:id/read', () => {
        test('Should mark a notification as read', async () => {
            pool.query
                .mockResolvedValueOnce([{ affectedRows: 1 }])
                .mockResolvedValueOnce([[{ id: 1, userId: 2, message: 'Test', type: 'queue_joined', status: 'viewed', createdAt: '2024-02-13T14:00:00.000Z' }]]);
            const res = await request(app).patch('/api/notifications/1/read');
            expect(res.statusCode).toBe(200);
            expect(res.body.notification.read).toBe(true);
        });

        test('Should return 404 for non-existent notification', async () => {
            pool.query.mockResolvedValueOnce([{ affectedRows: 0 }]);
            const res = await request(app).patch('/api/notifications/999/read');
            expect(res.statusCode).toBe(404);
        });

        test('Should return 400 for non-numeric id', async () => {
            const res = await request(app).patch('/api/notifications/abc/read');
            expect(res.statusCode).toBe(400);
        });

        test('Should return 500 on database error', async () => {
            pool.query.mockRejectedValueOnce(new Error('DB error'));
            const res = await request(app).patch('/api/notifications/1/read');
            expect(res.statusCode).toBe(500);
        });
    });

    // ── PATCH /api/notifications/read-all/:userId ─────────────────────────
    describe('PATCH /api/notifications/read-all/:userId', () => {
        test('Should mark all notifications as read', async () => {
            pool.query
                .mockResolvedValueOnce([[{ total: 2, unread: 2 }]])
                .mockResolvedValueOnce([{ affectedRows: 2 }]);
            const res = await request(app).patch('/api/notifications/read-all/2');
            expect(res.statusCode).toBe(200);
            expect(res.body.updatedCount).toBe(2);
        });

        test('Should return 404 for user with no notifications', async () => {
            pool.query.mockResolvedValueOnce([[{ total: 0, unread: 0 }]]);
            const res = await request(app).patch('/api/notifications/read-all/999');
            expect(res.statusCode).toBe(404);
        });

        test('Should return 400 for non-numeric userId', async () => {
            const res = await request(app).patch('/api/notifications/read-all/abc');
            expect(res.statusCode).toBe(400);
        });

        test('Should only count previously unread in updatedCount', async () => {
            pool.query.mockResolvedValueOnce([[{ total: 1, unread: 0 }]]);
            const res = await request(app).patch('/api/notifications/read-all/1');
            expect(res.body.updatedCount).toBe(0);
        });

        test('Should return 500 on database error', async () => {
            pool.query.mockRejectedValueOnce(new Error('DB error'));
            const res = await request(app).patch('/api/notifications/read-all/2');
            expect(res.statusCode).toBe(500);
        });
    });

    // ── DELETE /api/notifications/:id ─────────────────────────────────────
    describe('DELETE /api/notifications/:id', () => {
        test('Should delete a notification', async () => {
            pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
            const res = await request(app).delete('/api/notifications/1');
            expect(res.statusCode).toBe(200);
        });

        test('Should return 404 for non-existent notification', async () => {
            pool.query.mockResolvedValueOnce([{ affectedRows: 0 }]);
            const res = await request(app).delete('/api/notifications/999');
            expect(res.statusCode).toBe(404);
        });

        test('Should return 400 for non-numeric id', async () => {
            const res = await request(app).delete('/api/notifications/abc');
            expect(res.statusCode).toBe(400);
        });

        test('Should return 500 on database error', async () => {
            pool.query.mockRejectedValueOnce(new Error('DB error'));
            const res = await request(app).delete('/api/notifications/1');
            expect(res.statusCode).toBe(500);
        });
    });
});