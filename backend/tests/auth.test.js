// tests/auth.test.js - unit tests for authentication
// Run with: npm test

const request = require('supertest');
const app = require('../server');
const { users, sessions } = require('../data/mock-data');

describe('Authentication API Tests', () => {

    // Clear test data before each test
    beforeEach(() => {
        // Keep only the default users
        users.length = 2;
        sessions.length = 0;
    });

    // ============================================
    // REGISTRATION TESTS
    // ============================================

    describe('POST /api/auth/register', () => {

        test('Should register a new user successfully', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'newuser@test.com',
                    password: 'password123'
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('User registered successfully');
            expect(res.body.user).toHaveProperty('email', 'newuser@test.com');
            expect(res.body.user).toHaveProperty('name', 'newuser');
            expect(res.body.user).toHaveProperty('role', 'user');
            expect(res.body.user).not.toHaveProperty('password'); // Password should not be returned
        });

        test('Should reject registration with missing email', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    password: 'password123'
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe('Email and password are required');
        });

        test('Should reject registration with missing password', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'test@test.com'
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe('Email and password are required');
        });

        test('Should reject registration with invalid email format', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'invalid-email',
                    password: 'password123'
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe('Invalid email format');
        });

        test('Should reject registration with password less than 6 characters', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'test@test.com',
                    password: '12345'
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe('Password must be at least 6 characters');
        });

        test('Should reject registration with password more than 50 characters', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'test@test.com',
                    password: 'a'.repeat(51)
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe('Password must be less than 50 characters');
        });

        test('Should reject registration with duplicate email', async () => {
            // First registration
            await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'duplicate@test.com',
                    password: 'password123'
                });

            // Attempt duplicate registration
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'duplicate@test.com',
                    password: 'password456'
                });

            expect(res.statusCode).toBe(409);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe('An account with this email already exists');
        });

        test('Should handle case-insensitive duplicate email check', async () => {
            await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'test@test.com',
                    password: 'password123'
                });

            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'TEST@TEST.COM',
                    password: 'password456'
                });

            expect(res.statusCode).toBe(409);
            expect(res.body.success).toBe(false);
        });
    });

    // ============================================
    // LOGIN TESTS
    // ============================================

    describe('POST /api/auth/login', () => {

        test('Should login successfully with valid credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'user@example.com',
                    password: 'password123'
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('Login successful');
            expect(res.body).toHaveProperty('token');
            expect(res.body.user).toHaveProperty('email', 'user@example.com');
            expect(res.body.user).not.toHaveProperty('password');
        });

        test('Should reject login with missing email', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    password: 'password123'
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe('Email and password are required');
        });

        test('Should reject login with missing password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'user@example.com'
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe('Email and password are required');
        });

        test('Should reject login with invalid email format', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'invalid-email',
                    password: 'password123'
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe('Invalid email format');
        });

        test('Should reject login with wrong password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'user@example.com',
                    password: 'wrongpassword'
                });

            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe('Invalid email or password');
        });

        test('Should reject login with non-existent email', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@test.com',
                    password: 'password123'
                });

            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe('Invalid email or password');
        });

        test('Should handle case-insensitive email login', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'USER@EXAMPLE.COM',
                    password: 'password123'
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
        });

        test('Should create a session on successful login', async () => {
            const initialSessionCount = sessions.length;
            
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'user@example.com',
                    password: 'password123'
                });

            expect(sessions.length).toBe(initialSessionCount + 1);
            expect(res.body.token).toBeTruthy();
        });
    });

    // ============================================
    // LOGOUT TESTS
    // ============================================

    describe('GET /api/auth/logout', () => {

        test('Should logout successfully', async () => {
            const res = await request(app)
                .get('/api/auth/logout');

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('Logout successful');
        });

        test('Should remove session on logout', async () => {
            // Login first
            const loginRes = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'user@example.com',
                    password: 'password123'
                });

            const token = loginRes.body.token;
            const sessionCountBefore = sessions.length;

            // Logout
            await request(app)
                .get(`/api/auth/logout?token=${token}`);

            expect(sessions.length).toBe(sessionCountBefore - 1);
        });
    });

    // ============================================
    // USER PROFILE TESTS
    // ============================================

    describe('GET /api/users/profile/:email', () => {

        test('Should get user profile successfully', async () => {
            const res = await request(app)
                .get('/api/users/profile/user@example.com');

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.user).toHaveProperty('email', 'user@example.com');
            expect(res.body.user).toHaveProperty('name');
            expect(res.body.user).not.toHaveProperty('password');
        });

        test('Should return 404 for non-existent user', async () => {
            const res = await request(app)
                .get('/api/users/profile/nonexistent@test.com');

            expect(res.statusCode).toBe(404);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe('User not found');
        });

        test('Should handle case-insensitive email lookup', async () => {
            const res = await request(app)
                .get('/api/users/profile/USER@EXAMPLE.COM');

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });
});
