const express = require('express');
const router = express.Router();
const { listProducts, getProduct, addProduct, editProduct, removeProduct } = require('../controllers/productController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// Public routes
router.get('/', listProducts);
router.get('/:id', getProduct);

// Admin-only routes
router.post('/', verifyToken, isAdmin, addProduct);
router.put('/:id', verifyToken, isAdmin, editProduct);
router.delete('/:id', verifyToken, isAdmin, removeProduct);

module.exports = router;