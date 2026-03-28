// tests/notification.test.js
const request = require('supertest');
const app = require('../server');
const { notifications } = require('../data/mock-data');
const { validateNotificationInput } = require('../controllers/notification-controller');

describe('Notification API Tests', () => {

    beforeEach(() => {
        notifications.length = 0;
        notifications.push(
            { id: 1, userId: 2, message: 'You have joined the queue for Academic Advising', type: 'queue_joined', read: false, createdAt: '2024-02-13T14:00:00.000Z' },
            { id: 2, userId: 2, message: 'You are next in line for Academic Advising', type: 'queue_close', read: false, createdAt: '2024-02-13T14:10:00.000Z' },
            { id: 3, userId: 1, message: 'General system notification', type: 'general', read: true, createdAt: '2024-02-13T13:00:00.000Z' }
        );
    });

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
    });

    describe('GET /api/notifications/:userId', () => {
        test('Should return notifications for a valid user', async () => {
            const res = await request(app).get('/api/notifications/2');
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.notifications).toHaveLength(2);
            expect(res.body.unreadCount).toBe(2);
        });
        test('Should return empty array for user with no notifications', async () => {
            const res = await request(app).get('/api/notifications/999');
            expect(res.statusCode).toBe(200);
            expect(res.body.notifications).toHaveLength(0);
        });
        test('Should return 400 for non-numeric userId', async () => {
            const res = await request(app).get('/api/notifications/abc');
            expect(res.statusCode).toBe(400);
        });
        test('Should return notifications sorted newest first', async () => {
            const res = await request(app).get('/api/notifications/2');
            const dates = res.body.notifications.map(n => new Date(n.createdAt).getTime());
            expect(dates[0]).toBeGreaterThan(dates[1]);
        });
        test('Should correctly count unread notifications', async () => {
            const res = await request(app).get('/api/notifications/1');
            expect(res.body.unreadCount).toBe(0);
        });
    });

    describe('POST /api/notifications', () => {
        test('Should create a queue_joined notification', async () => {
            const res = await request(app).post('/api/notifications').send({ userId: 2, message: 'You joined the queue', type: 'queue_joined' });
            expect(res.statusCode).toBe(201);
            expect(res.body.notification.read).toBe(false);
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
            const res = await request(app).post('/api/notifications').send({ userId: 1, message: '  Hello world  ', type: 'general' });
            expect(res.body.notification.message).toBe('Hello world');
        });
        test('Should add notification to the list', async () => {
            const countBefore = notifications.length;
            await request(app).post('/api/notifications').send({ userId: 1, message: 'New', type: 'general' });
            expect(notifications.length).toBe(countBefore + 1);
        });
    });

    describe('PATCH /api/notifications/:id/read', () => {
        test('Should mark a notification as read', async () => {
            const res = await request(app).patch('/api/notifications/1/read');
            expect(res.statusCode).toBe(200);
            expect(res.body.notification.read).toBe(true);
        });
        test('Should return 404 for non-existent notification', async () => {
            const res = await request(app).patch('/api/notifications/999/read');
            expect(res.statusCode).toBe(404);
        });
        test('Should return 400 for non-numeric id', async () => {
            const res = await request(app).patch('/api/notifications/abc/read');
            expect(res.statusCode).toBe(400);
        });
        test('Should persist the read status', async () => {
            await request(app).patch('/api/notifications/1/read');
            expect(notifications.find(n => n.id === 1).read).toBe(true);
        });
    });

    describe('PATCH /api/notifications/read-all/:userId', () => {
        test('Should mark all notifications as read', async () => {
            const res = await request(app).patch('/api/notifications/read-all/2');
            expect(res.statusCode).toBe(200);
            expect(res.body.updatedCount).toBe(2);
        });
        test('Should return 404 for user with no notifications', async () => {
            const res = await request(app).patch('/api/notifications/read-all/999');
            expect(res.statusCode).toBe(404);
        });
        test('Should only count previously unread in updatedCount', async () => {
            const res = await request(app).patch('/api/notifications/read-all/1');
            expect(res.body.updatedCount).toBe(0);
        });
    });

    describe('DELETE /api/notifications/:id', () => {
        test('Should delete a notification', async () => {
            const res = await request(app).delete('/api/notifications/1');
            expect(res.statusCode).toBe(200);
        });
        test('Should remove notification from list', async () => {
            const countBefore = notifications.length;
            await request(app).delete('/api/notifications/1');
            expect(notifications.length).toBe(countBefore - 1);
        });
        test('Should return 404 for non-existent notification', async () => {
            const res = await request(app).delete('/api/notifications/999');
            expect(res.statusCode).toBe(404);
        });
        test('Should return 400 for non-numeric id', async () => {
            const res = await request(app).delete('/api/notifications/abc');
            expect(res.statusCode).toBe(400);
        });
    });
});