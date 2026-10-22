const {
    getReviewsByProduct,
    getProductRatingSummary,
    getAllProductsRatingSummary,
    createOrUpdateReview,
    getUserProductReview,
    hasUserPurchased
} = require('../models/reviewModel');

/**
 * GET /api/reviews/product/:id
 * Public: Returns reviews and rating breakdown for a product
 */
const getProductReviewsHandler = async (req, res) => {
    try {
        const productId = parseInt(req.params.id, 10);
        if (isNaN(productId)) {
            return res.status(400).json({ error: 'Invalid product ID' });
        }

        const [reviews, summary] = await Promise.all([
            getReviewsByProduct(productId),
            getProductRatingSummary(productId)
        ]);

        let userReview = null;
        let isVerifiedBuyer = false;

        // If user is authenticated, check their review & purchase status
        if (req.user?.id) {
            const [existing, purchased] = await Promise.all([
                getUserProductReview(productId, req.user.id),
                hasUserPurchased(productId, req.user.id)
            ]);
            userReview = existing;
            isVerifiedBuyer = purchased;
        }

        const formattedSummary = {
            averageRating: Number(summary?.avg_rating || 0),
            totalReviews: parseInt(summary?.total_reviews || 0, 10),
            ratingBreakdown: {
                5: parseInt(summary?.star_5 || 0, 10),
                4: parseInt(summary?.star_4 || 0, 10),
                3: parseInt(summary?.star_3 || 0, 10),
                2: parseInt(summary?.star_2 || 0, 10),
                1: parseInt(summary?.star_1 || 0, 10)
            },
            avg_rating: Number(summary?.avg_rating || 0),
            total_reviews: parseInt(summary?.total_reviews || 0, 10)
        };

        res.json({
            summary: formattedSummary,
            reviews,
            userReview,
            isVerifiedBuyer
        });
    } catch (err) {
        console.error('getProductReviewsHandler error:', err);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
};

/**
 * GET /api/reviews/summary
 * Public: Returns map of { [productId]: { avg_rating, total_reviews } }
 */
const getAllRatingsSummaryHandler = async (req, res) => {
    try {
        const map = await getAllProductsRatingSummary();
        res.json(map);
    } catch (err) {
        console.error('getAllRatingsSummaryHandler error:', err);
        res.status(500).json({ error: 'Failed to fetch ratings summary' });
    }
};

/**
 * POST /api/reviews/product/:id
 * Protected: Submit or update review
 */
const submitReviewHandler = async (req, res) => {
    try {
        const productId = parseInt(req.params.id, 10);
        const userId = req.user.id;
        const { rating, title, comment } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
        }

        if (!comment || comment.trim().length === 0) {
            return res.status(400).json({ error: 'Review text/comment is required' });
        }

        const review = await createOrUpdateReview(productId, userId, {
            rating: parseInt(rating, 10),
            title: title ? title.trim() : '',
            comment: comment.trim()
        });

        const summary = await getProductRatingSummary(productId);

        res.status(201).json({
            message: 'Review submitted successfully!',
            review,
            summary
        });
    } catch (err) {
        console.error('submitReviewHandler error:', err);
        res.status(500).json({ error: 'Failed to submit review' });
    }
};

module.exports = {
    getProductReviewsHandler,
    getAllRatingsSummaryHandler,
    submitReviewHandler
};
