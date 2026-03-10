const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const dayjs = require('dayjs');
const isoWeek = require('dayjs/plugin/isoWeek');

const prisma = require('../lib/prisma');
const { getTodayRange } = require('../utils/order');

dayjs.extend(isoWeek);

function resolveRange({ date, week, month, range }) {
  if (date) {
    return {
      start: dayjs(date).startOf('day').toDate(),
      end: dayjs(date).endOf('day').toDate(),
      label: dayjs(date).format('YYYY-MM-DD')
    };
  }

  if (week) {
    const target = week.includes('W') ? dayjs(`${week}-1`) : dayjs(week);
    return {
      start: target.startOf('week').toDate(),
      end: target.endOf('week').toDate(),
      label: `${target.startOf('week').format('YYYY-MM-DD')} ~ ${target.endOf('week').format('YYYY-MM-DD')}`
    };
  }

  if (month) {
    const target = dayjs(`${month}-01`);
    return {
      start: target.startOf('month').toDate(),
      end: target.endOf('month').toDate(),
      label: target.format('YYYY-MM')
    };
  }

  if (range) {
    const [start, end] = String(range).split(',');
    return {
      start: dayjs(start).startOf('day').toDate(),
      end: dayjs(end || start).endOf('day').toDate(),
      label: `${start} ~ ${end || start}`
    };
  }

  const today = getTodayRange();
  return {
    start: today.start,
    end: today.end,
    label: dayjs().format('YYYY-MM-DD')
  };
}

async function loadOrders(rangeInput) {
  const resolvedRange = resolveRange(rangeInput);
  const orders = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: resolvedRange.start,
        lte: resolvedRange.end
      },
      status: {
        not: 'CANCELLED'
      }
    },
    include: {
      items: {
        include: {
          menuItem: true
        }
      }
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  return {
    orders,
    range: resolvedRange
  };
}

function buildSummary(orders) {
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const totalOrders = orders.length;

  return {
    totalOrders,
    totalRevenue,
    averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
  };
}

function buildTopItems(orders) {
  const itemMap = new Map();

  orders.forEach((order) => {
    order.items.forEach((item) => {
      const current = itemMap.get(item.menuItemId) || {
        name: item.menuItem.name,
        quantity: 0,
        revenue: 0,
        cost: 0
      };

      current.quantity += item.quantity;
      current.revenue += item.unitPrice * item.quantity;
      current.cost += item.menuItem.cost * item.quantity;
      itemMap.set(item.menuItemId, current);
    });
  });

  return [...itemMap.values()]
    .sort((left, right) => right.quantity - left.quantity)
    .slice(0, 10);
}

function buildHourlyHeatmap(orders) {
  const hours = Array.from({ length: 24 }).map((_, hour) => ({
    hour,
    orders: 0,
    revenue: 0
  }));

  orders.forEach((order) => {
    const hour = new Date(order.createdAt).getHours();
    hours[hour].orders += 1;
    hours[hour].revenue += order.total;
  });

  return hours;
}

function buildProfitSummary(orders) {
  let cost = 0;
  let revenue = 0;

  orders.forEach((order) => {
    revenue += order.total;
    order.items.forEach((item) => {
      cost += item.menuItem.cost * item.quantity;
    });
  });

  const grossProfit = revenue - cost;
  return {
    revenue,
    cost,
    grossProfit,
    grossMargin: revenue > 0 ? (grossProfit / revenue) * 100 : 0
  };
}

async function getDashboardMetrics() {
  const { orders } = await loadOrders({});
  const lowStockItems = await prisma.menuItem.findMany({
    where: {
      isActive: true
    },
    orderBy: {
      stock: 'asc'
    }
  });

  return {
    ...buildSummary(orders),
    hourlyOrders: buildHourlyHeatmap(orders),
    lowStockItems: lowStockItems.filter((item) => item.stock <= item.stockAlert).slice(0, 8)
  };
}

async function getDailyReport(date) {
  const { orders, range } = await loadOrders({ date });
  return {
    range,
    summary: buildSummary(orders),
    topItems: buildTopItems(orders),
    peakHours: buildHourlyHeatmap(orders),
    profit: buildProfitSummary(orders)
  };
}

async function getWeeklyReport(week) {
  const { orders, range } = await loadOrders({ week });
  const byDay = {};

  orders.forEach((order) => {
    const key = dayjs(order.createdAt).format('YYYY-MM-DD');
    byDay[key] = byDay[key] || { date: key, totalRevenue: 0, totalOrders: 0 };
    byDay[key].totalRevenue += order.total;
    byDay[key].totalOrders += 1;
  });

  return {
    range,
    summary: buildSummary(orders),
    series: Object.values(byDay)
  };
}

async function getMonthlyReport(month) {
  const { orders, range } = await loadOrders({ month });
  const byDay = {};

  orders.forEach((order) => {
    const key = dayjs(order.createdAt).format('YYYY-MM-DD');
    byDay[key] = byDay[key] || { date: key, totalRevenue: 0, totalOrders: 0 };
    byDay[key].totalRevenue += order.total;
    byDay[key].totalOrders += 1;
  });

  return {
    range,
    summary: buildSummary(orders),
    series: Object.values(byDay)
  };
}

async function exportReportAsExcel(range) {
  const daily = await getDailyReport(range?.split(',')[0]);
  const workbook = new ExcelJS.Workbook();
  const summarySheet = workbook.addWorksheet('Summary');
  const itemSheet = workbook.addWorksheet('Top Items');
  const hourSheet = workbook.addWorksheet('Peak Hours');

  summarySheet.addRows([
    ['Report Range', daily.range.label],
    ['Total Orders', daily.summary.totalOrders],
    ['Total Revenue', daily.summary.totalRevenue],
    ['Average Order Value', Number(daily.summary.averageOrderValue.toFixed(2))]
  ]);

  itemSheet.columns = [
    { header: 'Item Name', key: 'name', width: 24 },
    { header: 'Quantity', key: 'quantity', width: 12 },
    { header: 'Revenue', key: 'revenue', width: 16 }
  ];
  itemSheet.addRows(daily.topItems);

  hourSheet.columns = [
    { header: 'Hour', key: 'hour', width: 10 },
    { header: 'Orders', key: 'orders', width: 12 },
    { header: 'Revenue', key: 'revenue', width: 16 }
  ];
  hourSheet.addRows(daily.peakHours);

  return workbook.xlsx.writeBuffer();
}

async function exportReportAsPdf(range) {
  const daily = await getDailyReport(range?.split(',')[0]);
  const doc = new PDFDocument({ margin: 40 });
  const chunks = [];

  return new Promise((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text('Breakfast POS Daily Report');
    doc.moveDown();
    doc.fontSize(11).text(`Range: ${daily.range.label}`);
    doc.text(`Total Orders: ${daily.summary.totalOrders}`);
    doc.text(`Total Revenue: NT$${daily.summary.totalRevenue.toFixed(0)}`);
    doc.text(`Average Order Value: NT$${daily.summary.averageOrderValue.toFixed(0)}`);
    doc.moveDown();
    doc.fontSize(14).text('Top 10 Items');
    doc.moveDown(0.5);
    daily.topItems.forEach((item, index) => {
      doc.fontSize(11).text(`${index + 1}. ${item.name} / ${item.quantity} items / NT$${item.revenue.toFixed(0)}`);
    });
    doc.end();
  });
}

module.exports = {
  getDashboardMetrics,
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  buildTopItems,
  buildHourlyHeatmap,
  buildProfitSummary,
  loadOrders,
  exportReportAsExcel,
  exportReportAsPdf
};
