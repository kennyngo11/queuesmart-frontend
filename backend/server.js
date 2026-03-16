// server.js - Main Express server
// This file will be shared by all team members

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// TODO: Other team members will add their routes here
// app.use('/api/queue', queueRoutes);      // Member 2
// app.use('/api/admin', adminRoutes);      // Member 3
// app.use('/api/notifications', notificationRoutes); // Member 4

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'QueueSmart Backend is running' });
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
app.listen(PORT, () => {
    console.log(`QueueSmart Backend running on http://localhost:${PORT}`);
});

module.exports = app;
