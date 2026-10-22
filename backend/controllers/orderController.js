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

/* ================================================================
   TIME-SERIES ANALYTICS — Daily / Monthly / Yearly revenue & profit
   ================================================================ */
const getTimeSeries = async (req, res) => {
    try {
        // Last 30 days — daily sales & profit
        const dailyQuery = pool.query(`
            SELECT
                TO_CHAR(o.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date_key,
                TO_CHAR(o.created_at AT TIME ZONE 'UTC', 'DD Mon')     AS label,
                COALESCE(SUM(o.total_amount), 0)::FLOAT                AS revenue,
                ROUND((COALESCE(SUM(o.total_amount), 0) * 0.35)::NUMERIC, 2)::FLOAT AS profit,
                COUNT(DISTINCT o.id)::INTEGER                          AS orders,
                COALESCE(SUM(oi.quantity), 0)::INTEGER                 AS units
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.status != 'cancelled'
              AND o.created_at >= NOW() - INTERVAL '30 days'
            GROUP BY date_key, label
            ORDER BY date_key ASC
        `);

        // Last 12 months — monthly sales & profit
        const monthlyQuery = pool.query(`
            SELECT
                TO_CHAR(DATE_TRUNC('month', o.created_at), 'YYYY-MM') AS date_key,
                TO_CHAR(DATE_TRUNC('month', o.created_at), 'Mon YYYY') AS label,
                COALESCE(SUM(o.total_amount), 0)::FLOAT               AS revenue,
                ROUND((COALESCE(SUM(o.total_amount), 0) * 0.35)::NUMERIC, 2)::FLOAT AS profit,
                COUNT(DISTINCT o.id)::INTEGER                         AS orders,
                COALESCE(SUM(oi.quantity), 0)::INTEGER                AS units
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.status != 'cancelled'
              AND o.created_at >= NOW() - INTERVAL '12 months'
            GROUP BY date_key, label
            ORDER BY date_key ASC
        `);

        // Last 5 years — yearly sales & profit
        const yearlyQuery = pool.query(`
            SELECT
                TO_CHAR(DATE_TRUNC('year', o.created_at), 'YYYY') AS date_key,
                TO_CHAR(DATE_TRUNC('year', o.created_at), 'YYYY') AS label,
                COALESCE(SUM(o.total_amount), 0)::FLOAT          AS revenue,
                ROUND((COALESCE(SUM(o.total_amount), 0) * 0.35)::NUMERIC, 2)::FLOAT AS profit,
                COUNT(DISTINCT o.id)::INTEGER                    AS orders,
                COALESCE(SUM(oi.quantity), 0)::INTEGER           AS units
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.status != 'cancelled'
              AND o.created_at >= NOW() - INTERVAL '5 years'
            GROUP BY date_key, label
            ORDER BY date_key ASC
        `);

        const [dailyRes, monthlyRes, yearlyRes] = await Promise.all([
            dailyQuery, monthlyQuery, yearlyQuery
        ]);

        res.json({
            daily:   dailyRes.rows,
            monthly: monthlyRes.rows,
            yearly:  yearlyRes.rows
        });
    } catch (err) {
        console.error('getTimeSeries error:', err);
        res.status(500).json({ error: 'Failed to fetch time-series data' });
    }
};

/* ================================================================
   PUBLIC BEST SELLERS — Customers can see top sold products
   ================================================================ */
const getPublicBestSellers = async (req, res) => {
    try {
        const limit = Math.min(12, Math.max(1, parseInt(req.query.limit, 10) || 6));
        
        const result = await pool.query(`
            SELECT
                p.id,
                p.name,
                p.price,
                p.image_url,
                p.category,
                p.stock_quantity,
                COALESCE(SUM(oi.quantity), 0)::INTEGER                         AS total_sold,
                COALESCE(SUM(oi.quantity * oi.price_at_purchase), 0)::FLOAT    AS total_revenue,
                COALESCE(AVG(r.rating), 5.0)::FLOAT                            AS avg_rating,
                COUNT(DISTINCT r.id)::INTEGER                                  AS review_count
            FROM products p
            LEFT JOIN order_items oi ON p.id = oi.product_id
            LEFT JOIN orders o ON oi.order_id = o.id AND o.status != 'cancelled'
            LEFT JOIN product_reviews r ON p.id = r.product_id
            GROUP BY p.id, p.name, p.price, p.image_url, p.category, p.stock_quantity
            ORDER BY total_sold DESC, avg_rating DESC, p.id ASC
            LIMIT $1
        `, [limit]);

        res.json(result.rows);
    } catch (err) {
        console.error('getPublicBestSellers error:', err);
        res.status(500).json({ error: 'Failed to fetch best sellers' });
    }
};

const getAdminAnalytics = async (req, res) => {
    try {
        const statsQuery = pool.query(`
            SELECT 
                COUNT(*)::INTEGER as total_orders,
                COALESCE(SUM(total_amount), 0)::FLOAT as total_revenue,
                ROUND((COALESCE(SUM(total_amount), 0) * 0.35)::NUMERIC, 2)::FLOAT as total_profit,
                ROUND((COALESCE(SUM(total_amount), 0) * 0.65)::NUMERIC, 2)::FLOAT as total_expense,
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

        const unitsSoldQuery = pool.query(`
            SELECT COALESCE(SUM(oi.quantity), 0)::INTEGER AS total_units_sold
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE o.status != 'cancelled'
        `);

        const inventoryValQuery = pool.query(`
            SELECT 
                COALESCE(SUM(price * stock_quantity), 0)::FLOAT AS inventory_valuation,
                COALESCE(SUM(stock_quantity), 0)::INTEGER        AS total_stock_units,
                COUNT(*)::INTEGER                                AS total_products_count
            FROM products
        `);

        const topProductsQuery = pool.query(`
            SELECT 
                p.id,
                p.name,
                p.category,
                p.price,
                p.image_url,
                p.stock_quantity,
                COALESCE(SUM(oi.quantity), 0)::INTEGER as total_sold,
                COALESCE(SUM(oi.quantity * oi.price_at_purchase), 0)::FLOAT as total_revenue,
                ROUND((COALESCE(SUM(oi.quantity * oi.price_at_purchase), 0) * 0.35)::NUMERIC, 2)::FLOAT as total_profit,
                COALESCE(AVG(r.rating), 5.0)::FLOAT as avg_rating
            FROM products p
            LEFT JOIN order_items oi ON p.id = oi.product_id
            LEFT JOIN orders o ON oi.order_id = o.id AND o.status != 'cancelled'
            LEFT JOIN product_reviews r ON p.id = r.product_id
            GROUP BY p.id, p.name, p.category, p.price, p.image_url, p.stock_quantity
            ORDER BY total_sold DESC, avg_rating DESC, p.id ASC
            LIMIT 10
        `);

        const categoryStatsQuery = pool.query(`
            SELECT 
                COALESCE(p.category, 'Uncategorized') as category,
                COUNT(DISTINCT p.id)::INTEGER as product_count,
                COALESCE(SUM(oi.quantity), 0)::INTEGER as units_sold,
                COALESCE(SUM(oi.quantity * oi.price_at_purchase), 0)::FLOAT as category_revenue,
                ROUND((COALESCE(SUM(oi.quantity * oi.price_at_purchase), 0) * 0.35)::NUMERIC, 2)::FLOAT as category_profit
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

        const recentActivityQuery = pool.query(`
            SELECT
                o.id,
                o.total_amount,
                o.status,
                o.payment_method,
                o.delivery_area,
                o.created_at,
                u.name AS customer_name,
                u.email AS customer_email
            FROM orders o
            JOIN users u ON o.user_id = u.id
            ORDER BY o.created_at DESC
            LIMIT 6
        `);

        const [statsRes, unitsRes, invRes, topProductsRes, categoryStatsRes, lowStockRes, recentActivityRes] = await Promise.all([
            statsQuery,
            unitsSoldQuery,
            inventoryValQuery,
            topProductsQuery,
            categoryStatsQuery,
            lowStockQuery,
            recentActivityQuery
        ]);

        const overview = {
            ...(statsRes.rows[0] || {}),
            total_units_sold: unitsRes.rows[0]?.total_units_sold || 0,
            inventory_valuation: invRes.rows[0]?.inventory_valuation || 0,
            total_stock_units: invRes.rows[0]?.total_stock_units || 0,
            total_products_count: invRes.rows[0]?.total_products_count || 0
        };

        res.json({
            overview,
            topProducts: topProductsRes.rows || [],
            categoryStats: categoryStatsRes.rows || [],
            lowStockProducts: lowStockRes.rows || [],
            recentActivity: recentActivityRes.rows || []
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
    getAdminAnalytics,
    getTimeSeries,
    getPublicBestSellers
};