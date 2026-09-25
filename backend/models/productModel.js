const pool = require('../config/db');

const getAllProducts = async () => {
    const result = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
    return result.rows;
};

const getProductById = async (id) => {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    return result.rows[0];
};

module.exports = { getAllProducts, getProductById };