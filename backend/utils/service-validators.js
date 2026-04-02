// queuesmart/backend/utils/service-validators.js
function validateService(data) {
  if (!data) return { error: new Error('No data provided') };
  const { serviceName, description, duration, priority } = data;
  if (!serviceName || typeof serviceName !== 'string' || serviceName.trim().length === 0) {
    return { error: new Error('Service Name is required') };
  }
  if (serviceName.length > 100) {
    return { error: new Error('Service Name must be at most 100 characters') };
  }
  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    return { error: new Error('Description is required') };
  }
  if (description.length > 300) {
    return { error: new Error('Description must be at most 300 characters') };
  }
  if (typeof duration !== 'number' || isNaN(duration)) {
    return { error: new Error('Expected Duration must be a number') };
  }
  if (duration < 1 || duration > 240) {
    return { error: new Error('Duration must be between 1 and 240 minutes') };
  }
  if (!priority || !['low', 'medium', 'high'].includes(priority)) {
    return { error: new Error('Priority Level is required and must be one of: low, medium, high') };
  }
  return { error: null };
}

module.exports = { validateService };
