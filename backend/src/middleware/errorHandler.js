const { Prisma } = require('@prisma/client');
const multer = require('multer');

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `找不到路由：${req.method} ${req.originalUrl}`
  });
}

function errorHandler(error, _req, res, _next) {
  let status = error.status || 500;
  let message = error.message || '系統發生未知錯誤';
  let details = error.details;

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      status = 409;
      const targets = Array.isArray(error.meta?.target) ? error.meta.target.join('、') : '資料';
      message = `${targets} 已存在，請改用其他值`;
    } else if (error.code === 'P2025') {
      status = 404;
      message = '查無對應資料';
    }
  } else if (error instanceof multer.MulterError) {
    status = 400;
    message = error.code === 'LIMIT_FILE_SIZE'
      ? '上傳圖片不可超過 5MB'
      : '檔案上傳失敗';
  }

  if (status >= 500) {
    console.error(error);

    if (process.env.NODE_ENV === 'production') {
      message = '系統忙碌中，請稍後再試';
      details = undefined;
    }
  }

  res.status(status).json({
    success: false,
    message,
    ...(details ? { details } : {})
  });
}

module.exports = {
  notFoundHandler,
  errorHandler
};
