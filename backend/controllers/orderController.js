const { getOrdersByUser } = require('../models/orderModel');
const pool = require('../config/db');

const viewOrders = async (req, res) => {
    try {
        const userId = req.user.id;
        const orders = await getOrdersByUser(userId);
        res.json(orders);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
};

const viewOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.id;
        const userId = req.user.id;

        const orderResult = await pool.query(
            'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
            [orderId, userId]
        );
        if (orderResult.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const itemsResult = await pool.query(
            `SELECT oi.quantity, oi.price_at_purchase, p.name, p.image_url
             FROM order_items oi
             JOIN products p ON oi.product_id = p.id
             WHERE oi.order_id = $1`,
            [orderId]
        );

        res.json({ order: orderResult.rows[0], items: itemsResult.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch order details' });
    }
};

const viewAllOrders = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT o.*, 
                    u.name AS user_name, 
                    u.email AS user_email,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'product_id', oi.product_id,
                                'quantity', oi.quantity,
                                'price_at_purchase', oi.price_at_purchase,
                                'product_name', p.name,
                                'product_image', p.image_url
                            )
                        ) FILTER (WHERE oi.id IS NOT NULL), '[]'
                    ) AS items
             FROM orders o
             JOIN users u ON o.user_id = u.id
             LEFT JOIN order_items oi ON o.id = oi.order_id
             LEFT JOIN products p ON oi.product_id = p.id
             GROUP BY o.id, u.name, u.email
             ORDER BY o.created_at DESC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching admin orders:', err);
        res.status(500).json({ error: 'Failed to fetch all orders' });
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const result = await pool.query(
            'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
            [status, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update order status' });
    }
};

module.exports = { viewOrders, viewOrderDetails, viewAllOrders, updateOrderStatus };