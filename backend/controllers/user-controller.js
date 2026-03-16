// controllers/user-controller.js - user management logic

const { users } = require('../data/mock-data');

/**
 * Get user profile
 * GET /api/users/profile/:email
 */
const getProfile = (req, res) => {
    try {
        const { email } = req.params;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email is required'
            });
        }

        // Find user by email
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Return user data without password
        const { password, ...userWithoutPassword } = user;

        res.status(200).json({
            success: true,
            user: userWithoutPassword
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while fetching profile'
        });
    }
};

module.exports = {
    getProfile
};
