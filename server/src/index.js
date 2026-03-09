// 081 POS 系統 - 伺服器入口
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);

// Socket.IO 設定
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? false
      : ['http://localhost:5173', 'http://localhost:5174'],
    methods: ['GET', 'POST']
  }
});

// 全域 middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 靜態檔案（上傳的圖片）
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 將 prisma 和 io 掛載到 req
app.use((req, res, next) => {
  req.prisma = prisma;
  req.io = io;
  next();
});

// 載入路由
const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/order');
const tableRoutes = require('./routes/table');
const memberRoutes = require('./routes/member');
const reportRoutes = require('./routes/report');
const settingRoutes = require('./routes/setting');
const printerRoutes = require('./routes/printer');
const uploadRoutes = require('./routes/upload');
const kdsRoutes = require('./routes/kds');

app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/printers', printerRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/kds', kdsRoutes);

// 健康檢查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 生產環境：提供前端靜態檔
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}

// 全域錯誤處理
app.use((err, req, res, next) => {
  console.error('❌ 錯誤:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || '伺服器內部錯誤',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Socket.IO 連線處理
require('./socket')(io, prisma);

// 啟動伺服器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 POS 伺服器啟動於 http://localhost:${PORT}`);
  console.log(`📡 Socket.IO 就緒`);
  console.log(`🗄️  環境: ${process.env.NODE_ENV || 'development'}`);
});

// 優雅關閉
process.on('SIGTERM', async () => {
  console.log('正在關閉伺服器...');
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});
