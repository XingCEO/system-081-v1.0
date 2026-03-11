const dayjs = require('dayjs');

function getTodayRange(target = new Date()) {
  return {
    start: dayjs(target).startOf('day').toDate(),
    end: dayjs(target).endOf('day').toDate()
  };
}

async function generateOrderNumber(prisma, target = new Date()) {
  const prefix = dayjs(target).format('YYYYMMDD');
  const latestOrder = await prisma.order.findFirst({
    where: {
      orderNumber: {
        startsWith: `${prefix}-`
      }
    },
    orderBy: {
      orderNumber: 'desc'
    },
    select: {
      orderNumber: true
    }
  });

  const latestSequence = latestOrder
    ? Number(String(latestOrder.orderNumber).split('-')[1] || 0)
    : 0;

  return `${prefix}-${String(latestSequence + 1).padStart(4, '0')}`;
}

module.exports = {
  getTodayRange,
  generateOrderNumber
};
