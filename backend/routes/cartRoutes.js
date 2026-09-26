const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { viewCart, addItem, updateItem, deleteItem } = require('../controllers/cartController');

router.get('/', verifyToken, viewCart);
router.post('/', verifyToken, addItem);
router.put('/:id', verifyToken, updateItem);
router.delete('/:id', verifyToken, deleteItem);

module.exports = router;