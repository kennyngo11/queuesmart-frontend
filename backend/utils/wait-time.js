const estimateWaitTime = (peopleAhead, avgServiceTime) => {
  if (
    peopleAhead === undefined ||
    avgServiceTime === undefined ||
    Number.isNaN(Number(peopleAhead)) ||
    Number.isNaN(Number(avgServiceTime))
  ) 
  {
    return 0;
  }

  return Number(peopleAhead) * Number(avgServiceTime);
};

module.exports = {
  estimateWaitTime
};