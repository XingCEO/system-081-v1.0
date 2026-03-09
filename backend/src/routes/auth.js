const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dayjs = require('dayjs');

const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/HttpError');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

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

router.post('/login', asyncHandler(async (req, res) => {
  const { name, password } = req.body;

  if (!name || !password) {
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

router.post('/pin', asyncHandler(async (req, res) => {
  const { pin } = req.body;

  if (!pin) {
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
