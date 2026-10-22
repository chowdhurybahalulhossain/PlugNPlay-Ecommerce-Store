const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
    getWishlistHandler,
    getWishlistIdsHandler,
    toggleWishlistHandler,
    removeFromWishlistHandler
} = require('../controllers/wishlistController');

// All wishlist routes require authentication
router.use(verifyToken);

router.get('/', getWishlistHandler);
router.get('/ids', getWishlistIdsHandler);
router.post('/toggle', toggleWishlistHandler);
router.post('/toggle/:productId', toggleWishlistHandler);
router.delete('/:productId', removeFromWishlistHandler);

module.exports = router;
