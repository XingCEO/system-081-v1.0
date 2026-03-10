const express = require('express');

const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');
const {
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
} = require('../services/reportService');

const router = express.Router();

router.use(authenticate, authorize('OWNER', 'MANAGER'));

router.get('/dashboard', asyncHandler(async (_req, res) => {
  const data = await getDashboardMetrics();
  res.json({
    success: true,
    data
  });
}));

router.get('/daily', asyncHandler(async (req, res) => {
  const data = await getDailyReport(req.query.date);
  res.json({
    success: true,
    data
  });
}));

router.get('/weekly', asyncHandler(async (req, res) => {
  const data = await getWeeklyReport(req.query.week);
  res.json({
    success: true,
    data
  });
}));

router.get('/monthly', asyncHandler(async (req, res) => {
  const data = await getMonthlyReport(req.query.month);
  res.json({
    success: true,
    data
  });
}));

router.get('/top-items', asyncHandler(async (req, res) => {
  const { orders, range } = await loadOrders({ range: req.query.range });
  res.json({
    success: true,
    data: {
      range,
      items: buildTopItems(orders)
    }
  });
}));

router.get('/peak-hours', asyncHandler(async (req, res) => {
  const { orders, range } = await loadOrders({ date: req.query.date });
  res.json({
    success: true,
    data: {
      range,
      hours: buildHourlyHeatmap(orders)
    }
  });
}));

router.get('/profit', asyncHandler(async (req, res) => {
  const { orders, range } = await loadOrders({ range: req.query.range });
  res.json({
    success: true,
    data: {
      range,
      ...buildProfitSummary(orders)
    }
  });
}));

router.get('/export', asyncHandler(async (req, res) => {
  const exportType = req.query.type;
  const range = req.query.range;

  if (exportType === 'excel') {
    const buffer = await exportReportAsExcel(range);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="breakfast-pos-report.xlsx"');
    res.send(buffer);
    return;
  }

  if (exportType !== 'pdf' && exportType !== undefined) {
    return res.status(400).json({
      success: false,
      message: '匯出格式只支援 excel 或 pdf'
    });
  }

  const buffer = await exportReportAsPdf(range);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="breakfast-pos-report.pdf"');
  res.send(buffer);
}));

module.exports = router;
