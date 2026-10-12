const stripe = require('../config/stripe');
const pool = require('../config/db');
const { createOrder, addOrderItem, decrementStock, clearCart } = require('../models/orderModel');

const checkout = async (req, res) => {
    try {
        const userId = req.user.id;
        const { shippingAddress, paymentMethodId } = req.body;

        if (!shippingAddress) {
            return res.status(400).json({ error: 'Shipping address is required' });
        }

        // Get user's cart items with product details
        const cartResult = await pool.query(
            `SELECT c.product_id, c.quantity, p.name, p.price, p.stock_quantity
             FROM cart_items c
             JOIN products p ON c.product_id = p.id
             WHERE c.user_id = $1`,
            [userId]
        );
        const cartItems = cartResult.rows;

        if (cartItems.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }

        // Validate stock availability before charging payment
        for (const item of cartItems) {
            if (item.stock_quantity < item.quantity) {
                return res.status(400).json({
                    error: `Insufficient stock for "${item.name}". Only ${item.stock_quantity} left.`
                });
            }
        }

        // Calculate total
        const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // Create Stripe Payment Intent (amount in cents)
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(totalAmount * 100),
            currency: 'usd',
            payment_method: paymentMethodId,
            confirm: true,
            automatic_payment_methods: { enabled: true, allow_redirects: 'never' }
        });

        // Run DB operations in an atomic transaction
        const client = await pool.connect();
        let order;
        try {
            await client.query('BEGIN');

            order = await createOrder(userId, totalAmount, shippingAddress, paymentIntent.id, client);

            for (const item of cartItems) {
                await addOrderItem(order.id, item.product_id, item.quantity, item.price, client);
                await decrementStock(item.product_id, item.quantity, client);
            }

            await clearCart(userId, client);

            await client.query('COMMIT');
        } catch (dbErr) {
            await client.query('ROLLBACK');
            throw dbErr;
        } finally {
            client.release();
        }

        res.status(201).json({ message: 'Order placed successfully', order, paymentIntent });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Checkout failed', details: err.message });
    }
};

module.exports = { checkout };