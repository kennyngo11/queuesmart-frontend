// server.js - main express server
// This file will be shared by all team members
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const serviceRoutes = require('./routes/service');
const notificationRoutes = require('./routes/notifications');

const queueRoutes = require('./routes/queue');
const historyRoutes = require('./routes/history');
const reportRoutes = require('./routes/reports');
const userRoutes = require('./routes/users');


const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/notifications', notificationRoutes);

app.use('/api/queue', queueRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);


// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'QueueSmart Backend is running' });
});

app.use(express.static(path.join(__dirname,'..')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..','index.html'));
});


// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Something went wrong!',
        message: err.message 
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
if (require.main === module){
    app.listen(PORT, () => {
        console.log(`QueueSmart Backend running on http://localhost:${PORT}`);
    });
};
module.exports = app;
