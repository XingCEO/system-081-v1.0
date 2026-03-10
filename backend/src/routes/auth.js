const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dayjs = require('dayjs');
const rateLimit = require('express-rate-limit');

const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/HttpError');
const { authenticate } = require('../middleware/auth');
const { normalizeString, requireString } = require('../utils/validation');

const router = express.Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: '登入嘗試過於頻繁，請 15 分鐘後再試'
    });
  }
});

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt
  };
}

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      name: user.name,
      role: user.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '8h'
    }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    {
      sub: user.id
    },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    {
      expiresIn: '7d'
    }
  );
}

async function issueTokens(user) {
  await prisma.refreshToken.deleteMany({
    where: {
      expiresAt: {
        lt: new Date()
      }
    }
  });

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: dayjs().add(7, 'day').toDate()
    }
  });

  return {
    accessToken,
    refreshToken
  };
}

router.post('/login', authLimiter, asyncHandler(async (req, res) => {
  const name = requireString(req.body.name, '帳號', { maxLength: 60 });
  const password = normalizeString(req.body.password);

  if (!password) {
    throw new HttpError(400, '請輸入帳號與密碼');
  }

  const user = await prisma.user.findUnique({
    where: {
      name
    }
  });

  if (!user) {
    throw new HttpError(401, '帳號或密碼錯誤');
  }

  const matched = await bcrypt.compare(password, user.passwordHash);
  if (!matched) {
    throw new HttpError(401, '帳號或密碼錯誤');
  }

  const tokens = await issueTokens(user);

  res.json({
    success: true,
    data: {
      user: sanitizeUser(user),
      ...tokens
    }
  });
}));

router.post('/pin', authLimiter, asyncHandler(async (req, res) => {
  const pin = normalizeString(req.body.pin);

  if (!pin || pin.length < 4 || pin.length > 12) {
    throw new HttpError(400, '請輸入 PIN 碼');
  }

  const users = await prisma.user.findMany();
  let matchedUser = null;

  for (const user of users) {
    const matched = await bcrypt.compare(pin, user.pin);
    if (matched) {
      matchedUser = user;
      break;
    }
  }

  if (!matchedUser) {
    throw new HttpError(401, 'PIN 碼錯誤');
  }

  const tokens = await issueTokens(matchedUser);

  res.json({
    success: true,
    data: {
      user: sanitizeUser(matchedUser),
      ...tokens
    }
  });
}));

router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new HttpError(400, '缺少 refresh token');
  }

  const tokenRecord = await prisma.refreshToken.findUnique({
    where: {
      token: refreshToken
    },
    include: {
      user: true
    }
  });

  if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
    throw new HttpError(401, 'refresh token 已失效');
  }

  jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);

  await prisma.refreshToken.delete({
    where: {
      id: tokenRecord.id
    }
  });

  const tokens = await issueTokens(tokenRecord.user);

  res.json({
    success: true,
    data: {
      user: sanitizeUser(tokenRecord.user),
      ...tokens
    }
  });
}));

router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  const { refreshToken, allDevices = false } = req.body || {};

  if (allDevices) {
    await prisma.refreshToken.deleteMany({
      where: {
        userId: req.user.id
      }
    });
  } else if (refreshToken) {
    await prisma.refreshToken.deleteMany({
      where: {
        token: refreshToken,
        userId: req.user.id
      }
    });
  }

  res.json({
    success: true,
    data: {
      loggedOut: true
    }
  });
}));

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id }
  });

  if (!user) {
    throw new HttpError(404, '找不到使用者');
  }

  res.json({
    success: true,
    data: sanitizeUser(user)
  });
}));

module.exports = router;
