// routes/auth.js - Authentication routes (Member 1)

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth-controller');
const userController = require('../controllers/user-controller');

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', authController.register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', authController.login);

// @route   GET /api/auth/logout
// @desc    Logout user
// @access  Public (in production would require auth)
router.get('/logout', authController.logout);

// @route   GET /api/users/profile
// @desc    Get current user profile
// @access  Public (in production would require auth)
router.get('/profile/:email', userController.getProfile);

module.exports = router;
