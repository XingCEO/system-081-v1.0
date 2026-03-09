const dayjs = require('dayjs');

function getTodayRange(target = new Date()) {
  return {
    start: dayjs(target).startOf('day').toDate(),
    end: dayjs(target).endOf('day').toDate()
  };
}

async function generateOrderNumber(prisma, target = new Date()) {
  const { start, end } = getTodayRange(target);
  const sequence = await prisma.order.count({
    where: {
      createdAt: {
        gte: start,
        lte: end
      }
    }
  });

  return `${dayjs(target).format('YYYYMMDD')}-${String(sequence + 1).padStart(4, '0')}`;
}

module.exports = {
  getTodayRange,
  generateOrderNumber
};
