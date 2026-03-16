// controllers/auth-controller.js - Authentication logic (Member 1)

const { users, sessions } = require('../data/mock-data');
const { validateEmail, validatePassword } = require('../utils/validators');

/**
 * Register a new user
 * POST /api/auth/register
 */
const register = (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation: Required fields
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        // Validation: Email format
        if (!validateEmail(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }

        // Validation: Password length (6-50 characters)
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            return res.status(400).json({
                success: false,
                error: passwordValidation.error
            });
        }

        // Check for duplicate email
        const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'An account with this email already exists'
            });
        }

        // Create new user
        const newUser = {
            id: users.length + 1,
            email: email.toLowerCase(),
            password: password, // In production, this would be hashed
            name: email.split('@')[0],
            role: 'user', // Default role
            createdAt: new Date().toISOString()
        };

        users.push(newUser);

        // Return success (don't send password back)
        const { password: _, ...userWithoutPassword } = newUser;
        
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: userWithoutPassword
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error during registration'
        });
    }
};

/**
 * Login user
 * POST /api/auth/login
 */
const login = (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation: Required fields
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        // Validation: Email format
        if (!validateEmail(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }

        // Find user
        const user = users.find(
            u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
        );

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // Create session (mock token)
        const sessionToken = `token_${Date.now()}_${user.id}`;
        const session = {
            token: sessionToken,
            userId: user.id,
            email: user.email,
            role: user.role,
            loginTime: new Date().toISOString()
        };

        sessions.push(session);

        // Return user data without password
        const { password: _, ...userWithoutPassword } = user;

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token: sessionToken,
            user: userWithoutPassword
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error during login'
        });
    }
};

/**
 * Logout user
 * GET /api/auth/logout
 */
const logout = (req, res) => {
    try {
        // In a real app, we'd get the token from Authorization header
        // and remove it from sessions
        // For this mock, we'll just return success
        
        const { token } = req.query;

        if (token) {
            const sessionIndex = sessions.findIndex(s => s.token === token);
            if (sessionIndex !== -1) {
                sessions.splice(sessionIndex, 1);
            }
        }

        res.status(200).json({
            success: true,
            message: 'Logout successful'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error during logout'
        });
    }
};

module.exports = {
    register,
    login,
    logout
};
