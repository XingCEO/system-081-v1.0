const express = require('express');

const authRoutes = require('./auth');
const menuRoutes = require('./menu');
const orderRoutes = require('./orders');
const memberRoutes = require('./members');
const reportRoutes = require('./reports');
const staffRoutes = require('./staff');
const tableRoutes = require('./tables');
const reservationRoutes = require('./reservations');
const deliveryRoutes = require('./delivery');
const settingsRoutes = require('./settings');
const notificationsRoutes = require('./notifications');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/menu', menuRoutes);
router.use('/orders', orderRoutes);
router.use('/members', memberRoutes);
router.use('/reports', reportRoutes);
router.use('/staff', staffRoutes);
router.use('/tables', tableRoutes);
router.use('/reservations', reservationRoutes);
router.use('/delivery', deliveryRoutes);
router.use('/settings', settingsRoutes);
router.use('/notifications', notificationsRoutes);

module.exports = router;
