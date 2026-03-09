function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `找不到路由：${req.method} ${req.originalUrl}`
  });
}

function errorHandler(error, _req, res, _next) {
  const status = error.status || 500;
  res.status(status).json({
    success: false,
    message: error.message || '系統發生未知錯誤',
    ...(error.details ? { details: error.details } : {})
  });
}

module.exports = {
  notFoundHandler,
  errorHandler
};
