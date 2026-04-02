// controllers/auth-controller.js - authentication logic

const pool = require('../db');
const bcrypt = require('bcrypt');
const { sessions } = require('../data/mock-data');
const { validateEmail, validatePassword } = require('../utils/validators');

const SALT_ROUNDS = 10;

/**
 * Register a new user
 * POST /api/auth/register
 */
const register = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password are required' });
        }
        if (!validateEmail(email)) {
            return res.status(400).json({ success: false, error: 'Invalid email format' });
        }
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            return res.status(400).json({ success: false, error: passwordValidation.error });
        }

        const [existing] = await pool.query(
            'SELECT userId FROM UserCredentials WHERE email = ?',
            [email.toLowerCase()]
        );
        if (existing.length > 0) {
            return res.status(409).json({ success: false, error: 'An account with this email already exists' });
        }

        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        const name = email.split('@')[0];

        const [result] = await pool.query(
            'INSERT INTO UserCredentials (email, passwordHash, role) VALUES (?, ?, ?)',
            [email.toLowerCase(), passwordHash, 'user']
        );
        const userId = result.insertId;

        await pool.query(
            'INSERT INTO UserProfile (userId, fullName) VALUES (?, ?)',
            [userId, name]
        );

        return res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: { id: userId, email: email.toLowerCase(), name, role: 'user' }
        });

    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ success: false, error: 'Server error during registration' });
    }
};

/**
 * Login user
 * POST /api/auth/login
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password are required' });
        }
        if (!validateEmail(email)) {
            return res.status(400).json({ success: false, error: 'Invalid email format' });
        }

        const [rows] = await pool.query(
            `SELECT uc.userId, uc.email, uc.passwordHash, uc.role, up.fullName
             FROM UserCredentials uc
             LEFT JOIN UserProfile up ON uc.userId = up.userId
             WHERE uc.email = ?`,
            [email.toLowerCase()]
        );

        if (rows.length === 0) {
            return res.status(401).json({ success: false, error: 'Invalid email or password' });
        }

        const user = rows[0];
        const passwordMatch = await bcrypt.compare(password, user.passwordHash);

        if (!passwordMatch) {
            return res.status(401).json({ success: false, error: 'Invalid email or password' });
        }

        const sessionToken = `token_${Date.now()}_${user.userId}`;
        sessions.push({
            token: sessionToken,
            userId: user.userId,
            email: user.email,
            role: user.role,
            loginTime: new Date().toISOString()
        });

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            token: sessionToken,
            user: {
                id: user.userId,
                email: user.email,
                name: user.fullName,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ success: false, error: 'Server error during login' });
    }
};

/**
 * Logout user
 * GET /api/auth/logout
 */
const logout = (req, res) => {
    try {
        const { token } = req.query;
        if (token) {
            const idx = sessions.findIndex(s => s.token === token);
            if (idx !== -1) sessions.splice(idx, 1);
        }
        return res.status(200).json({ success: true, message: 'Logout successful' });
    } catch (error) {
        console.error('Logout error:', error);
        return res.status(500).json({ success: false, error: 'Server error during logout' });
    }
};

module.exports = { register, login, logout };