// JWT 認證 middleware
const jwt = require('jsonwebtoken');

// 驗證 JWT Token
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: '未提供認證 Token'
    });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token 已過期，請重新登入'
      });
    }
    return res.status(401).json({
      success: false,
      message: '無效的 Token'
    });
  }
};

// 檢查角色權限
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '請先登入'
      });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: '權限不足'
      });
    }
    next();
  };
};

// 可選認證（不強制，但有 Token 就解析）
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      // Token 無效也不阻擋
    }
  }
  next();
};

module.exports = { authenticate, authorize, optionalAuth };
