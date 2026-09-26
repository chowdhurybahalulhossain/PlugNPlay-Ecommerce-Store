const pool = require('../config/db');

const createOrder = async (userId, totalAmount, shippingAddress, stripePaymentId) => {
    const result = await pool.query(
        `INSERT INTO orders (user_id, total_amount, shipping_address, stripe_payment_id, status)
         VALUES ($1, $2, $3, $4, 'paid') RETURNING *`,
        [userId, totalAmount, shippingAddress, stripePaymentId]
    );
    return result.rows[0];
};

const addOrderItem = async (orderId, productId, quantity, priceAtPurchase) => {
    await pool.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase)
         VALUES ($1, $2, $3, $4)`,
        [orderId, productId, quantity, priceAtPurchase]
    );
};

const clearCart = async (userId) => {
    await pool.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
};

const getOrdersByUser = async (userId) => {
    const result = await pool.query(
        'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
    );
    return result.rows;
};

module.exports = { createOrder, addOrderItem, clearCart, getOrdersByUser };