const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const prisma = require('./lib/prisma');
const { initializeSocket } = require('./lib/socket');
const apiRoutes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { createCorsOriginHandler } = require('./utils/cors');

const app = express();
const server = http.createServer(app);

initializeSocket(server);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: createCorsOriginHandler(),
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 300
}));

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString()
    }
  });
});

app.use('/api', apiRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

const port = Number(process.env.PORT || process.env.BACKEND_PORT || 3001);

server.listen(port, () => {
  console.log(`Breakfast POS backend listening on http://localhost:${port}`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
