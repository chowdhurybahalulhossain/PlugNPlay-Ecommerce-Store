const stripe = require('../config/stripe');
const pool = require('../config/db');
const { createOrder, addOrderItem, clearCart } = require('../models/orderModel');

const checkout = async (req, res) => {
    try {
        const userId = req.user.id;
        const { shippingAddress, paymentMethodId } = req.body;

        // Get user's cart items with product prices
        const cartResult = await pool.query(
            `SELECT c.product_id, c.quantity, p.price, p.stock_quantity
             FROM cart_items c
             JOIN products p ON c.product_id = p.id
             WHERE c.user_id = $1`,
            [userId]
        );
        const cartItems = cartResult.rows;

        if (cartItems.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
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

        // Create order in DB
        const order = await createOrder(userId, totalAmount, shippingAddress, paymentIntent.id);

        // Add order items
        for (const item of cartItems) {
            await addOrderItem(order.id, item.product_id, item.quantity, item.price);
        }

        // Clear cart
        await clearCart(userId);

        res.status(201).json({ message: 'Order placed successfully', order, paymentIntent });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Checkout failed', details: err.message });
    }
};

module.exports = { checkout };