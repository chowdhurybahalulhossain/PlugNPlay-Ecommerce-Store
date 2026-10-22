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

const searchProducts = async (query, limit = 8) => {
    const q = `%${query.trim()}%`;
    const result = await pool.query(
        `SELECT p.*,
                COALESCE(ROUND(AVG(r.rating)::NUMERIC, 1), 0.0)::FLOAT AS avg_rating,
                COUNT(r.id)::INTEGER AS total_reviews
         FROM products p
         LEFT JOIN product_reviews r ON p.id = r.product_id
         WHERE p.name ILIKE $1 
            OR p.description ILIKE $1 
            OR p.category ILIKE $1
         GROUP BY p.id
         ORDER BY 
            CASE 
                WHEN p.name ILIKE $1 THEN 1 
                WHEN p.category ILIKE $1 THEN 2 
                ELSE 3 
            END,
            p.stock_quantity DESC,
            p.name ASC
         LIMIT $2`,
        [q, limit]
    );
    return result.rows;
};

module.exports = {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    updateProductStock,
    deleteProduct,
    searchProducts
};