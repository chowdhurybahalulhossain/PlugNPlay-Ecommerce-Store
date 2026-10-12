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
        const { name, description, category } = req.body;
        const price = parseFloat(req.body.price);
        const imageUrl = req.body.imageUrl || req.body.image_url || '';
        const stockQuantity = parseInt(req.body.stockQuantity ?? req.body.stock_quantity ?? 0, 10);

        if (!name || isNaN(price)) {
            return res.status(400).json({ error: 'Product name and valid price are required' });
        }

        const product = await createProduct(name, description, price, imageUrl, category, stockQuantity);
        res.status(201).json(product);
    } catch (err) {
        console.error('Error adding product:', err);
        res.status(500).json({ error: 'Failed to create product', details: err.message });
    }
}

const editProduct = async (req, res) => {
    try {
        const { name, description, category } = req.body;
        const price = parseFloat(req.body.price);
        const imageUrl = req.body.imageUrl || req.body.image_url || '';
        const stockQuantity = parseInt(req.body.stockQuantity ?? req.body.stock_quantity ?? 0, 10);

        if (!name || isNaN(price)) {
            return res.status(400).json({ error: 'Product name and valid price are required' });
        }

        const product = await updateProduct(req.params.id, name, description, price, imageUrl, category, stockQuantity);
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json(product);
    } catch (err) {
        console.error('Error updating product:', err);
        res.status(500).json({ error: 'Failed to update product', details: err.message });
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