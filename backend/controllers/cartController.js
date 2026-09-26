const { getCartByUser, addToCart, updateCartItem, removeCartItem } = require('../models/cartModel');

const viewCart = async (req, res) => {
    try {
        const userId = req.user.id; // Comes from verified token now
        const cart = await getCartByUser(userId);
        res.json(cart);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch cart' });
    }
};

const addItem = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId, quantity } = req.body;
        const item = await addToCart(userId, productId, quantity || 1);
        res.status(201).json(item);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add to cart' });
    }
};

const updateItem = async (req, res) => {
    try {
        const { quantity } = req.body;
        const item = await updateCartItem(req.params.id, quantity);
        res.json(item);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update cart item' });
    }
};

const deleteItem = async (req, res) => {
    try {
        await removeCartItem(req.params.id);
        res.json({ message: 'Item removed from cart' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to remove item' });
    }
};

module.exports = { viewCart, addItem, updateItem, deleteItem };