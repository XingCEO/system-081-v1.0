const jwt = require('jsonwebtoken');

const prisma = require('../lib/prisma');
const HttpError = require('../utils/HttpError');

async function authenticate(req, _res, next) {
  try {
    const authorization = req.headers.authorization || '';
    const token = authorization.startsWith('Bearer ')
      ? authorization.replace('Bearer ', '')
      : null;

    if (!token) {
      throw new HttpError(401, '未提供登入憑證');
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: {
        id: Number(payload.sub)
      }
    });

    if (!user) {
      throw new HttpError(401, '登入狀態已失效');
    }

    req.user = {
      id: user.id,
      name: user.name,
      role: user.role
    };

    next();
  } catch (error) {
    next(error instanceof HttpError ? error : new HttpError(401, '登入狀態已失效'));
  }
}

function optionalAuth(req, _res, next) {
  const authorization = req.headers.authorization || '';
  if (!authorization.startsWith('Bearer ')) {
    next();
    return;
  }

  authenticate(req, _res, next);
}

function authorize(...roles) {
  return function authorizeHandler(req, _res, next) {
    if (!req.user) {
      next(new HttpError(401, '請先登入'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new HttpError(403, '權限不足'));
      return;
    }

    next();
  };
}

module.exports = {
  authenticate,
  optionalAuth,
  authorize
};
