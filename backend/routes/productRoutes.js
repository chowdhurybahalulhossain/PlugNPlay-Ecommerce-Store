const express = require('express');
const router = express.Router();
const { listProducts, getProduct } = require('../controllers/productController');

router.get('/', listProducts);
router.get('/:id', getProduct);

module.exports = router;