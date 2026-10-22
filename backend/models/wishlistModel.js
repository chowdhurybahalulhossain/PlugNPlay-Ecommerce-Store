const pool = require('../config/db');

/**
 * Wishlist Model for User Favorite Gear
 */

const getWishlist = async (userId) => {
    const result = await pool.query(
        `SELECT w.id AS wishlist_id, w.created_at AS added_at,
                p.id, p.name, p.description, p.price, p.image_url, p.category, p.stock_quantity
         FROM wishlists w
         JOIN products p ON w.product_id = p.id
         WHERE w.user_id = $1
         ORDER BY w.created_at DESC`,
        [userId]
    );
    return result.rows;
};

const getWishlistProductIds = async (userId) => {
    const result = await pool.query(
        'SELECT product_id FROM wishlists WHERE user_id = $1',
        [userId]
    );
    return result.rows.map(r => r.product_id);
};

const addToWishlist = async (userId, productId) => {
    const result = await pool.query(
        `INSERT INTO wishlists (user_id, product_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, product_id) DO NOTHING
         RETURNING *`,
        [userId, productId]
    );
    return result.rows[0] || null;
};

const removeFromWishlist = async (userId, productId) => {
    const result = await pool.query(
        'DELETE FROM wishlists WHERE user_id = $1 AND product_id = $2 RETURNING *',
        [userId, productId]
    );
    return result.rows.length > 0;
};

const isProductInWishlist = async (userId, productId) => {
    const result = await pool.query(
        'SELECT 1 FROM wishlists WHERE user_id = $1 AND product_id = $2',
        [userId, productId]
    );
    return result.rows.length > 0;
};

module.exports = {
    getWishlist,
    getWishlistProductIds,
    addToWishlist,
    removeFromWishlist,
    isProductInWishlist
};
