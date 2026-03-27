const { queues, queueHistory, services, users, notifications } = require('../data/mock-data');
const { validateJoinQueue, validateLeaveQueue } = require('../utils/queue-validators');
const { estimateWaitTime } = require('../utils/wait-time');


const joinQueue = (req, res) => {
  try {
    const { error } = validateJoinQueue(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error
      });
    }

    const userId = Number(req.body.userId);
    const serviceId = Number(req.body.serviceId);

    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const service = services.find(s => s.id === serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Service not found'
      });
    }

    if (service.status !== 'open') {
      return res.status(400).json({
        success: false,
        error: 'Service is not currently open'
      });
    }

    const existingEntry = queues.find(
      q => q.userId === userId && q.serviceId === serviceId && q.status === 'waiting'
    );

    if (existingEntry) {
      return res.status(409).json({
        success: false,
        error: 'User is already in this queue'
      });
    }

    const sameServiceWaiting = queues
      .filter(q => q.serviceId === serviceId && q.status === 'waiting')

    const nextPosition = sameServiceWaiting.length + 1;

    const newEntry = {
      id: queues.length ? Math.max(...queues.map(q => q.id)) + 1 : 1,
      serviceId,
      userId,
      position: nextPosition,
      status: 'waiting',
      joinedAt: new Date().toISOString()
    };

    queues.push(newEntry);

    const notification = {
      id: notifications.length ? Math.max(...notifications.map(n => n.id)) + 1 : 1,
      userId,
      message: `You have joined the queue for ${service.name}`,
      type: 'queue_joined',
      read: false,
      createdAt: new Date().toISOString()
    };

    notifications.push(notification);

    return res.status(201).json({
      success: true,
      message: 'Joined queue successfully',
      queueEntry: newEntry
    });
  } catch (err) {
    console.error('joinQueue error:', err);
    return res.status(500).json({
      success: false,
      error: 'Server error while joining queue'
    });
  }
};

const leaveQueue = (req, res) => {
  try {
    const { error } = validateLeaveQueue(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error
      });
    }

    const userId = Number(req.body.userId);
    const serviceId = Number(req.body.serviceId);

    const queueIndex = queues.findIndex(
      q => q.userId === userId && q.serviceId === serviceId && q.status === 'waiting'
    );

    if (queueIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Active queue entry not found'
      });
    }

    const entry = queues[queueIndex];
    const service = services.find(s => s.id === serviceId);

    const historyEntry = {
      id: queueHistory.length ? Math.max(...queueHistory.map(h => h.id)) + 1 : 1,
      userId: entry.userId,
      serviceId: entry.serviceId,
      serviceName: service ? service.name : 'Unknown Service',
      joinedAt: entry.joinedAt,
      leftAt: new Date().toISOString(),
      status: 'left'
    };

    queueHistory.push(historyEntry);
    queues.splice(queueIndex, 1);

    const remainingSameService = queues
      .filter(q => q.serviceId === serviceId && q.status === 'waiting')
      .sort((a, b) => a.position - b.position);

    remainingSameService.forEach((q, index) => {
      q.position = index + 1;
    });

    return res.status(200).json({
      success: true,
      message: 'Left queue successfully'
    });
  } catch (err) {
    console.error('leaveQueue error:', err);
    return res.status(500).json({
      success: false,
      error: 'Server error while leaving queue'
    });
  }
};


const getCurrentQueue = (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (Number.isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid userId is required'
      });
    }

    const entry = queues.find(q => q.userId === userId && q.status === 'waiting');

    if (!entry) {
      return res.status(404).json({
        success: false,
        error: 'No active queue entry found'
      });
    }

    const service = services.find(s => s.id === entry.serviceId);
    const sameServiceWaiting = queues
      .filter(q => q.serviceId === entry.serviceId && q.status === 'waiting')

    const peopleAhead = sameServiceWaiting.filter(q => q.position < entry.position).length;
    const serviceDuration = service ? service.expectedDuration : 0;
    const estimatedWaitMinutes = estimateWaitTime(peopleAhead, serviceDuration);

    return res.status(200).json({
      success: true,
      queue: {
        ...entry,
        serviceName: service ? service.name : null,
        peopleAhead,
        estimatedWaitMinutes
      }
    });
  } catch (err) {
    console.error('getCurrentQueue error:', err);
    return res.status(500).json({
      success: false,
      error: 'Server error while fetching current queue'
    });
  }
};

const serveNext = (req, res) => {
  try {
    const serviceId = Number(req.params.serviceId);

    if (Number.isNaN(serviceId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid serviceId is required'
      });
    }

    const waitingEntries = queues
      .filter(q => q.serviceId === serviceId && q.status === 'waiting')
      .sort((a, b) => a.position - b.position);

    if (waitingEntries.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No users are waiting in this queue'
      });
    }

    const nextEntry = waitingEntries[0];
    const queueIndex = queues.findIndex(q => q.id === nextEntry.id);
    const service = services.find(s => s.id === serviceId);

    const historyEntry = {
      id: queueHistory.length ? Math.max(...queueHistory.map(h => h.id)) + 1 : 1,
      userId: nextEntry.userId,
      serviceId: nextEntry.serviceId,
      serviceName: service ? service.name : 'Unknown Service',
      joinedAt: nextEntry.joinedAt,
      servedAt: new Date().toISOString(),
      status: 'served'
    };

    queueHistory.push(historyEntry);
    queues.splice(queueIndex, 1);

    const remainingSameService = queues
      .filter(q => q.serviceId === serviceId && q.status === 'waiting')
      .sort((a, b) => a.position - b.position);

    remainingSameService.forEach((q, index) => {
      q.position = index + 1;
    });

    return res.status(200).json({
      success: true,
      message: 'Next user served successfully',
      servedEntry: historyEntry
    });
  } catch (err) {
    console.error('serveNext error:', err);
    return res.status(500).json({
      success: false,
      error: 'Server error while serving next user'
    });
  }
};

module.exports = {
  joinQueue,
  leaveQueue,
  getCurrentQueue,
  serveNext
};