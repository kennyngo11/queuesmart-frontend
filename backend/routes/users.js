const express = require('express');
const router = express.Router();
const userController = require('../controllers/user-controller');

router.get('/profile/:email', userController.getProfile);

module.exports = router;