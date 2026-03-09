function toMinutes(time) {
  const [hours, minutes] = String(time).split(':').map(Number);
  return (hours * 60) + minutes;
}

function getActiveTimePricing(timePricing, now = new Date()) {
  if (!Array.isArray(timePricing) || timePricing.length === 0) {
    return null;
  }

  const currentMinutes = (now.getHours() * 60) + now.getMinutes();
  const currentDay = now.getDay();

  return timePricing.find((rule) => {
    const days = Array.isArray(rule.days) ? rule.days : [];
    return (
      days.includes(currentDay) &&
      currentMinutes >= toMinutes(rule.start) &&
      currentMinutes <= toMinutes(rule.end)
    );
  }) || null;
}

function getCurrentPrice(menuItem, now = new Date()) {
  const activeRule = getActiveTimePricing(menuItem.timePricing, now);
  return activeRule?.price ?? menuItem.basePrice;
}

function calculatePoints(total, pointsRule = {}) {
  const earnEvery = Number(pointsRule.earnEvery || 30);
  const earnPoints = Number(pointsRule.earnPoints || 1);
  return Math.floor(total / earnEvery) * earnPoints;
}

module.exports = {
  getActiveTimePricing,
  getCurrentPrice,
  calculatePoints
};
