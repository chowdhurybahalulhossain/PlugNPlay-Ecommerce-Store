const pool = require('../config/db');

/**
 * Creates a new order.
 * @param {string} paymentMethod - 'card' or 'cod'
 * @param {string|null} stripePaymentId - Only set for card payments.
 * Status is 'paid' for card (Stripe confirmed), 'pending' for COD (not yet collected).
 */
const createOrder = async (userId, totalAmount, shippingAddress, paymentMethod, stripePaymentId, client = pool) => {
    const status = paymentMethod === 'cod' ? 'pending' : 'paid';
    const result = await client.query(
        `INSERT INTO orders (user_id, total_amount, shipping_address, stripe_payment_id, payment_method, status)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [userId, totalAmount, shippingAddress, stripePaymentId || null, paymentMethod, status]
    );
    return result.rows[0];
};

const addOrderItem = async (orderId, productId, quantity, priceAtPurchase, client = pool) => {
    await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase)
         VALUES ($1, $2, $3, $4)`,
        [orderId, productId, quantity, priceAtPurchase]
    );
};

const decrementStock = async (productId, quantity, client = pool) => {
    await client.query(
        'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
        [quantity, productId]
    );
};

const clearCart = async (userId, client = pool) => {
    await client.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
};

const getOrdersByUser = async (userId) => {
    const result = await pool.query(
        `SELECT o.*, 
            json_agg(json_build_object(
                'product_id', oi.product_id,
                'quantity', oi.quantity,
                'price_at_purchase', oi.price_at_purchase,
                'product_name', p.name,
                'product_image', p.image_url
            )) AS items
         FROM orders o
         LEFT JOIN order_items oi ON o.id = oi.order_id
         LEFT JOIN products p ON oi.product_id = p.id
         WHERE o.user_id = $1
         GROUP BY o.id
         ORDER BY o.created_at DESC`,
        [userId]
    );
    return result.rows;
};

module.exports = { createOrder, addOrderItem, decrementStock, clearCart, getOrdersByUser };