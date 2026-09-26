const { getAllProducts, getProductById } = require('../models/productModel');

const { createProduct, updateProduct, deleteProduct } = require('../models/productModel');

const listProducts = async (req, res) => {
    try {
        const products = await getAllProducts();
        res.json(products);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
};

const getProduct = async (req, res) => {
    try {
        const product = await getProductById(req.params.id);
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json(product);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
};

async function addProduct(req, res) {
    try {
        const { name, description, price, imageUrl, category, stockQuantity } = req.body;
        const product = await createProduct(name, description, price, imageUrl, category, stockQuantity);
        res.status(201).json(product);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create product' });
    }
}

const editProduct = async (req, res) => {
    try {
        const { name, description, price, imageUrl, category, stockQuantity } = req.body;
        const product = await updateProduct(req.params.id, name, description, price, imageUrl, category, stockQuantity);
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json(product);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update product' });
    }
};

const removeProduct = async (req, res) => {
    try {
        await deleteProduct(req.params.id);
        res.json({ message: 'Product deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete product' });
    }
};

module.exports = { listProducts, getProduct, addProduct, editProduct, removeProduct };