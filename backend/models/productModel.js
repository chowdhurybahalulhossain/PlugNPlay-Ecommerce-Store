const pool = require('../config/db');

const getAllProducts = async () => {
    const result = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
    return result.rows;
};

const getProductById = async (id) => {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    return result.rows[0];
};

async function createProduct(name, description, price, imageUrl, category, stockQuantity) {
    const result = await pool.query(
        `INSERT INTO products (name, description, price, image_url, category, stock_quantity)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [name, description, price, imageUrl, category, stockQuantity]
    );
    return result.rows[0];
}

const updateProduct = async (id, name, description, price, imageUrl, category, stockQuantity) => {
    const result = await pool.query(
        `UPDATE products SET name=$1, description=$2, price=$3, image_url=$4, category=$5, stock_quantity=$6
         WHERE id=$7 RETURNING *`,
        [name, description, price, imageUrl, category, stockQuantity, id]
    );
    return result.rows[0];
};

const deleteProduct = async (id) => {
    await pool.query('DELETE FROM products WHERE id = $1', [id]);
};

const updateProductStock = async (id, { stockQuantity, delta }) => {
    let result;
    if (typeof delta === 'number') {
        result = await pool.query(
            `UPDATE products 
             SET stock_quantity = GREATEST(0, stock_quantity + $1)
             WHERE id = $2 
             RETURNING *`,
            [delta, id]
        );
    } else {
        result = await pool.query(
            `UPDATE products 
             SET stock_quantity = GREATEST(0, $1::INTEGER)
             WHERE id = $2 
             RETURNING *`,
            [parseInt(stockQuantity, 10) || 0, id]
        );
    }
    return result.rows[0];
};

module.exports = {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    updateProductStock,
    deleteProduct
};