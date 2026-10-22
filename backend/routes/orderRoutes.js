const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
const {
    viewOrders,
    viewOrderDetails,
    viewAllOrders,
    updateOrderStatus,
    getAdminAnalytics,
    getTimeSeries,
    getPublicBestSellers
} = require('../controllers/orderController');

router.get('/best-sellers', getPublicBestSellers);
router.get('/admin/analytics', verifyToken, isAdmin, getAdminAnalytics);
router.get('/admin/timeseries', verifyToken, isAdmin, getTimeSeries);
router.get('/admin/all', verifyToken, isAdmin, viewAllOrders);
router.put('/admin/:id/status', verifyToken, isAdmin, updateOrderStatus);

router.get('/', verifyToken, viewOrders);
router.get('/:id', verifyToken, viewOrderDetails);

module.exports = router;