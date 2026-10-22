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
            `SELECT oi.quantity, oi.price_at_purchase,
                    p.name AS product_name, p.name, p.image_url
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

const getAdminAnalytics = async (req, res) => {
    try {
        const statsQuery = pool.query(`
            SELECT 
                COUNT(*)::INTEGER as total_orders,
                COALESCE(SUM(total_amount), 0)::FLOAT as total_revenue,
                COALESCE(AVG(total_amount), 0)::FLOAT as avg_order_value,
                COUNT(*) FILTER (WHERE status = 'delivered')::INTEGER as delivered_orders,
                COUNT(*) FILTER (WHERE status = 'shipped')::INTEGER as shipped_orders,
                COUNT(*) FILTER (WHERE status = 'paid')::INTEGER as paid_orders,
                COUNT(*) FILTER (WHERE status = 'pending')::INTEGER as pending_orders,
                COUNT(*) FILTER (WHERE status = 'cancelled')::INTEGER as cancelled_orders,
                COUNT(*) FILTER (WHERE payment_method = 'cod')::INTEGER as cod_count,
                COALESCE(SUM(total_amount) FILTER (WHERE payment_method = 'cod'), 0)::FLOAT as cod_revenue,
                COUNT(*) FILTER (WHERE payment_method = 'card')::INTEGER as card_count,
                COALESCE(SUM(total_amount) FILTER (WHERE payment_method = 'card'), 0)::FLOAT as card_revenue,
                COUNT(*) FILTER (WHERE delivery_area = 'inside_dhaka')::INTEGER as inside_dhaka_count,
                COUNT(*) FILTER (WHERE delivery_area = 'outside_dhaka')::INTEGER as outside_dhaka_count
            FROM orders
            WHERE status != 'cancelled'
        `);

        const topProductsQuery = pool.query(`
            SELECT 
                p.id,
                p.name,
                p.category,
                p.image_url,
                p.stock_quantity,
                COALESCE(SUM(oi.quantity), 0)::INTEGER as total_sold,
                COALESCE(SUM(oi.quantity * oi.price_at_purchase), 0)::FLOAT as total_revenue
            FROM products p
            JOIN order_items oi ON p.id = oi.product_id
            JOIN orders o ON oi.order_id = o.id
            WHERE o.status != 'cancelled'
            GROUP BY p.id, p.name, p.category, p.image_url, p.stock_quantity
            ORDER BY total_sold DESC
            LIMIT 5
        `);

        const categoryStatsQuery = pool.query(`
            SELECT 
                COALESCE(p.category, 'Uncategorized') as category,
                COUNT(DISTINCT p.id)::INTEGER as product_count,
                COALESCE(SUM(oi.quantity), 0)::INTEGER as units_sold,
                COALESCE(SUM(oi.quantity * oi.price_at_purchase), 0)::FLOAT as category_revenue
            FROM products p
            LEFT JOIN order_items oi ON p.id = oi.product_id
            LEFT JOIN orders o ON oi.order_id = o.id AND o.status != 'cancelled'
            GROUP BY p.category
            ORDER BY category_revenue DESC
        `);

        const lowStockQuery = pool.query(`
            SELECT id, name, category, price, stock_quantity, image_url
            FROM products
            WHERE stock_quantity <= 5
            ORDER BY stock_quantity ASC, name ASC
        `);

        const [statsRes, topProductsRes, categoryStatsRes, lowStockRes] = await Promise.all([
            statsQuery,
            topProductsQuery,
            categoryStatsQuery,
            lowStockQuery
        ]);

        res.json({
            overview: statsRes.rows[0] || {},
            topProducts: topProductsRes.rows || [],
            categoryStats: categoryStatsRes.rows || [],
            lowStockProducts: lowStockRes.rows || []
        });
    } catch (err) {
        console.error('Error fetching admin analytics:', err);
        res.status(500).json({ error: 'Failed to fetch analytics data' });
    }
};

module.exports = {
    viewOrders,
    viewOrderDetails,
    viewAllOrders,
    updateOrderStatus,
    getAdminAnalytics
};