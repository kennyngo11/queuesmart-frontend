// data/mock-data.js - In-memory data storage (shared by all team members)

// Users array - stores all registered users
const users = [
    {
        id: 1,
        email: 'admin@queuesmart.com',
        password: 'admin123',
        name: 'Admin',
        role: 'admin',
        createdAt: '2024-02-01T10:00:00.000Z'
    },
    {
        id: 2,
        email: 'user@example.com',
        password: 'password123',
        name: 'user',
        role: 'user',
        createdAt: '2024-02-10T14:30:00.000Z'
    }
];

// Sessions array - stores active user sessions
const sessions = [];

// Services array - stores all services (Member 3 will use this)
const services = [
    {
        id: 1,
        name: 'Academic Advising',
        description: 'Get help with course selection and academic planning',
        expectedDuration: 15,
        priority: 'medium',
        status: 'open',
        createdAt: '2024-02-01T10:00:00.000Z'
    },
    {
        id: 2,
        name: 'IT Help Desk',
        description: 'Technical support for students',
        expectedDuration: 10,
        priority: 'high',
        status: 'open',
        createdAt: '2024-02-01T10:00:00.000Z'
    },
    {
        id: 3,
        name: 'Student Services',
        description: 'General student inquiries and support',
        expectedDuration: 20,
        priority: 'low',
        status: 'closed',
        createdAt: '2024-02-01T10:00:00.000Z'
    }
];

// Queues array - stores all active queues (Member 2 will use this)
const queues = [
    {
        id: 1,
        serviceId: 1,
        userId: 2,
        position: 1,
        status: 'waiting',
        joinedAt: '2024-02-13T14:00:00.000Z'
    }
];

// Queue history - stores past queue entries (Member 2 will use this)
const queueHistory = [
    {
        id: 1,
        userId: 2,
        serviceId: 1,
        serviceName: 'Academic Advising',
        joinedAt: '2024-02-12T11:00:00.000Z',
        servedAt: '2024-02-12T11:20:00.000Z',
        status: 'served'
    },
    {
        id: 2,
        userId: 2,
        serviceId: 2,
        serviceName: 'IT Help Desk',
        joinedAt: '2024-02-11T09:00:00.000Z',
        leftAt: '2024-02-11T09:10:00.000Z',
        status: 'left'
    }
];

// Notifications array - stores notifications (Member 4 will use this)
const notifications = [
    {
        id: 1,
        userId: 2,
        message: 'You have joined the queue for Academic Advising',
        type: 'queue_joined',
        read: false,
        createdAt: '2024-02-13T14:00:00.000Z'
    }
];

module.exports = {
    users,
    sessions,
    services,
    queues,
    queueHistory,
    notifications
};
