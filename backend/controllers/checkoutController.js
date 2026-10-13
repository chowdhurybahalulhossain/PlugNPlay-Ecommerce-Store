const stripe = require('../config/stripe');
const pool = require('../config/db');
const { createOrder, addOrderItem, decrementStock, clearCart } = require('../models/orderModel');

const checkout = async (req, res) => {
    try {
        const userId = req.user.id;
        // paymentType: 'card' | 'cod'
        // paymentMethodId: only required for 'card' payments
        // deliveryArea: 'inside_dhaka' | 'outside_dhaka'
        const { shippingAddress, paymentType, paymentMethodId, deliveryArea = 'inside_dhaka' } = req.body;

        if (!shippingAddress) {
            return res.status(400).json({ error: 'Shipping address is required.' });
        }
        if (!paymentType || !['card', 'cod'].includes(paymentType)) {
            return res.status(400).json({ error: 'A valid payment method (card or cod) is required.' });
        }
        if (paymentType === 'card' && !paymentMethodId) {
            return res.status(400).json({ error: 'Card details are required for card payment.' });
        }

        // Determine delivery fee: Inside Dhaka = 60, Outside Dhaka = 120
        const selectedArea = deliveryArea === 'outside_dhaka' ? 'outside_dhaka' : 'inside_dhaka';
        const deliveryFee = selectedArea === 'outside_dhaka' ? 120 : 60;

        // --- Fetch cart items with product details ---
        const cartResult = await pool.query(
            `SELECT c.product_id, c.quantity, p.name, p.price, p.stock_quantity
             FROM cart_items c
             JOIN products p ON c.product_id = p.id
             WHERE c.user_id = $1`,
            [userId]
        );
        const cartItems = cartResult.rows;

        if (cartItems.length === 0) {
            return res.status(400).json({ error: 'Your cart is empty.' });
        }

        // --- Validate stock before doing anything financial ---
        for (const item of cartItems) {
            if (item.stock_quantity < item.quantity) {
                return res.status(400).json({
                    error: `Insufficient stock for "${item.name}". Only ${item.stock_quantity} left.`
                });
            }
        }

        // --- Calculate subtotal and total amount including delivery ---
        const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const totalAmount = subtotal + deliveryFee;

        // --- Payment Path ---
        let stripePaymentId = null;

        if (paymentType === 'card') {
            // Charge via Stripe (amount in smallest currency unit — cents/paisa)
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(totalAmount * 100),
                currency: 'usd',
                payment_method: paymentMethodId,
                confirm: true,
                automatic_payment_methods: { enabled: true, allow_redirects: 'never' }
            });
            stripePaymentId = paymentIntent.id;
        }
        // COD: No payment gateway needed. Order is saved with 'pending' status.

        // --- Atomic DB Transaction ---
        const client = await pool.connect();
        let order;
        try {
            await client.query('BEGIN');

            order = await createOrder(userId, totalAmount, shippingAddress, paymentType, stripePaymentId, deliveryFee, selectedArea, client);

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

        res.status(201).json({
            message: paymentType === 'cod'
                ? 'Order placed! Pay on delivery.'
                : 'Payment successful! Order confirmed.',
            order
        });

    } catch (err) {
        console.error('Checkout Error:', err);
        res.status(500).json({ error: 'Checkout failed.', details: err.message });
    }
};

module.exports = { checkout };