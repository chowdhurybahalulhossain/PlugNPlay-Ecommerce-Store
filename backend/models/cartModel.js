const pool = require('../config/db');

const getCartByUser = async (userId) => {
    const result = await pool.query(
        `SELECT c.id, c.quantity, p.id AS product_id, p.name, p.price, p.image_url
         FROM cart_items c
         JOIN products p ON c.product_id = p.id
         WHERE c.user_id = $1`,
        [userId]
    );
    return result.rows;
};

const addToCart = async (userId, productId, quantity) => {
    // If the product already exists in the cart, increase quantity; otherwise insert a new row
    const existing = await pool.query(
        'SELECT * FROM cart_items WHERE user_id = $1 AND product_id = $2',
        [userId, productId]
    );

    if (existing.rows.length > 0) {
        const result = await pool.query(
            'UPDATE cart_items SET quantity = quantity + $1 WHERE user_id = $2 AND product_id = $3 RETURNING *',
            [quantity, userId, productId]
        );
        return result.rows[0];
    } else {
        const result = await pool.query(
            'INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1, $2, $3) RETURNING *',
            [userId, productId, quantity]
        );
        return result.rows[0];
    }
};

const updateCartItem = async (cartItemId, quantity) => {
    const result = await pool.query(
        'UPDATE cart_items SET quantity = $1 WHERE id = $2 RETURNING *',
        [quantity, cartItemId]
    );
    return result.rows[0];
};

const removeCartItem = async (cartItemId) => {
    await pool.query('DELETE FROM cart_items WHERE id = $1', [cartItemId]);
};

module.exports = { getCartByUser, addToCart, updateCartItem, removeCartItem };