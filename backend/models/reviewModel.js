const pool = require('../config/db');

/**
 * Review Model for Customer Reviews & Star Ratings
 */

const getReviewsByProduct = async (productId) => {
    const result = await pool.query(
        `SELECT r.id, r.product_id, r.user_id, r.rating, r.title, r.comment, r.created_at,
                u.name AS user_name,
                EXISTS(
                    SELECT 1 FROM orders o
                    JOIN order_items oi ON o.id = oi.order_id
                    WHERE o.user_id = r.user_id 
                      AND oi.product_id = r.product_id 
                      AND o.status != 'cancelled'
                ) AS is_verified_buyer
         FROM product_reviews r
         JOIN users u ON r.user_id = u.id
         WHERE r.product_id = $1
         ORDER BY r.created_at DESC`,
        [productId]
    );
    return result.rows;
};

const getProductRatingSummary = async (productId) => {
    const result = await pool.query(
        `SELECT 
            COUNT(*)::INTEGER AS total_reviews,
            COALESCE(ROUND(AVG(rating)::NUMERIC, 1), 0.0)::FLOAT AS avg_rating,
            COUNT(*) FILTER (WHERE rating = 5)::INTEGER AS star_5,
            COUNT(*) FILTER (WHERE rating = 4)::INTEGER AS star_4,
            COUNT(*) FILTER (WHERE rating = 3)::INTEGER AS star_3,
            COUNT(*) FILTER (WHERE rating = 2)::INTEGER AS star_2,
            COUNT(*) FILTER (WHERE rating = 1)::INTEGER AS star_1
         FROM product_reviews
         WHERE product_id = $1`,
        [productId]
    );
    return result.rows[0] || {
        total_reviews: 0,
        avg_rating: 0,
        star_5: 0,
        star_4: 0,
        star_3: 0,
        star_2: 0,
        star_1: 0
    };
};

const getAllProductsRatingSummary = async () => {
    const result = await pool.query(
        `SELECT 
            product_id,
            COUNT(*)::INTEGER AS total_reviews,
            COALESCE(ROUND(AVG(rating)::NUMERIC, 1), 0.0)::FLOAT AS avg_rating
         FROM product_reviews
         GROUP BY product_id`
    );
    const map = {};
    result.rows.forEach(r => {
        map[r.product_id] = {
            avg_rating: r.avg_rating,
            total_reviews: r.total_reviews
        };
    });
    return map;
};

const createOrUpdateReview = async (productId, userId, { rating, title, comment }) => {
    const cleanRating = Math.max(1, Math.min(5, parseInt(rating, 10) || 5));
    const result = await pool.query(
        `INSERT INTO product_reviews (product_id, user_id, rating, title, comment)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, product_id)
         DO UPDATE SET
            rating = EXCLUDED.rating,
            title = EXCLUDED.title,
            comment = EXCLUDED.comment,
            created_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [productId, userId, cleanRating, (title || '').trim(), (comment || '').trim()]
    );
    return result.rows[0];
};

const getUserProductReview = async (productId, userId) => {
    const result = await pool.query(
        'SELECT * FROM product_reviews WHERE product_id = $1 AND user_id = $2',
        [productId, userId]
    );
    return result.rows[0] || null;
};

const hasUserPurchased = async (productId, userId) => {
    const result = await pool.query(
        `SELECT EXISTS(
            SELECT 1 FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            WHERE o.user_id = $1 
              AND oi.product_id = $2 
              AND o.status != 'cancelled'
         ) AS purchased`,
        [userId, productId]
    );
    return !!result.rows[0]?.purchased;
};

module.exports = {
    getReviewsByProduct,
    getProductRatingSummary,
    getAllProductsRatingSummary,
    createOrUpdateReview,
    getUserProductReview,
    hasUserPurchased
};
