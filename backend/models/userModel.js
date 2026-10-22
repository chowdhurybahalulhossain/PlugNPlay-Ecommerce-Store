const pool = require('../config/db');

const createUser = async (name, email, hashedPassword) => {
    const result = await pool.query(
        'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, role',
        [name, email, hashedPassword]
    );
    return result.rows[0];
};

const findUserByEmail = async (email) => {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
};

const findUserById = async (id) => {
    const result = await pool.query('SELECT id, name, email, phone, role, created_at FROM users WHERE id = $1', [id]);
    return result.rows[0];
};

const findUserByIdWithPassword = async (id) => {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
};

const getUserProfile = async (userId) => {
    const result = await pool.query(
        `SELECT u.id, u.name, u.email, u.phone, u.role, u.created_at,
            COALESCE(COUNT(o.id), 0)::INTEGER AS total_orders,
            COALESCE(SUM(o.total_amount), 0)::NUMERIC AS total_spent
         FROM users u
         LEFT JOIN orders o ON u.id = o.user_id
         WHERE u.id = $1
         GROUP BY u.id`,
        [userId]
    );
    return result.rows[0];
};

const updateUserProfile = async (userId, name, phone) => {
    const result = await pool.query(
        `UPDATE users
         SET name = COALESCE($2, name), phone = COALESCE($3, phone)
         WHERE id = $1
         RETURNING id, name, email, phone, role`,
        [userId, name, phone]
    );
    return result.rows[0];
};

const updateUserPassword = async (userId, hashedPassword) => {
    await pool.query('UPDATE users SET password = $2 WHERE id = $1', [userId, hashedPassword]);
    return true;
};

module.exports = {
    createUser,
    findUserByEmail,
    findUserById,
    findUserByIdWithPassword,
    getUserProfile,
    updateUserProfile,
    updateUserPassword
};