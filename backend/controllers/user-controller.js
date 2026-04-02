// controllers/user-controller.js - user management logic

const pool = require('../db');

/**
 * Get user profile
 * GET /api/users/profile/:email
 */
const getProfile = async (req, res) => {
    try {
        const { email } = req.params;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email is required'
            });
        }

        const [rows] = await pool.query(
            `SELECT uc.userId, uc.email, uc.role, uc.createdDate, up.fullName, up.phone
             FROM UserCredentials uc
             LEFT JOIN UserProfile up ON uc.userId = up.userId
             WHERE uc.email = ?`,
            [email.toLowerCase()]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const user = rows[0];

        return res.status(200).json({
            success: true,
            user: {
                id: user.userId,
                email: user.email,
                name: user.fullName,
                phone: user.phone,
                role: user.role,
                createdAt: user.createdDate
            }
        });

    } catch (error) {
        console.error('Get profile error:', error);
        return res.status(500).json({
            success: false,
            error: 'Server error while fetching profile'
        });
    }
};

module.exports = {
    getProfile
};