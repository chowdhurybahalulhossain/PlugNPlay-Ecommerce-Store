const express = require('express');
const router = express.Router();
const { verifyToken, optionalAuth } = require('../middleware/authMiddleware');
const {
    getProductReviewsHandler,
    getAllRatingsSummaryHandler,
    submitReviewHandler
} = require('../controllers/reviewController');

// Public route to get summary map of all product ratings
router.get('/summary', getAllRatingsSummaryHandler);

// Get reviews for a specific product (optionalAuth to attach user status)
router.get('/product/:id', optionalAuth, getProductReviewsHandler);

// Submit or update a review (requires auth)
router.post('/product/:id', verifyToken, submitReviewHandler);

module.exports = router;
