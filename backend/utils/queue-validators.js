

const validateJoinQueue = (data) => {
  if (!data) {
    return { error: 'No data provided' };
  }

  const { userId, serviceId } = data;

  if (userId === undefined || userId === null || Number.isNaN(Number(userId))) {
    return { error: 'userId is required'};
  }

  if (serviceId === undefined || serviceId === null || Number.isNaN(Number(serviceId))) {
    return { error: 'serviceId is required'};
  }

  return { error: null };
};

const validateLeaveQueue = (data) => {
  if (!data) {
    return { error: 'No data provided' };
  }

  const { userId, serviceId } = data;

  if (userId === undefined || userId === null || Number.isNaN(Number(userId))) {
    return { error: 'userId is required' };
  }

  if (serviceId === undefined || serviceId === null || Number.isNaN(Number(serviceId))) {
    return { error: 'serviceId is required' };
  }

  return { error: null };
};



module.exports = {
  validateJoinQueue,
  validateLeaveQueue
};
