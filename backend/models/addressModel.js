const pool = require('../config/db');

/**
 * Address Model for User Address Book
 */

const getAddresses = async (userId) => {
    const result = await pool.query(
        `SELECT * FROM user_addresses
         WHERE user_id = $1
         ORDER BY is_default DESC, created_at DESC`,
        [userId]
    );
    return result.rows;
};

const getAddressById = async (id, userId) => {
    const result = await pool.query(
        'SELECT * FROM user_addresses WHERE id = $1 AND user_id = $2',
        [id, userId]
    );
    return result.rows[0];
};

const addAddress = async (userId, data) => {
    const {
        label = 'Home',
        recipient_name,
        phone,
        address_line,
        city = 'Dhaka',
        delivery_area = 'inside_dhaka',
        is_default = false
    } = data;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if user has any existing addresses
        const countRes = await client.query(
            'SELECT COUNT(*)::INTEGER as count FROM user_addresses WHERE user_id = $1',
            [userId]
        );
        const shouldBeDefault = is_default || countRes.rows[0].count === 0;

        if (shouldBeDefault) {
            await client.query(
                'UPDATE user_addresses SET is_default = false WHERE user_id = $1',
                [userId]
            );
        }

        const result = await client.query(
            `INSERT INTO user_addresses
             (user_id, label, recipient_name, phone, address_line, city, delivery_area, is_default)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [userId, label, recipient_name, phone, address_line, city, delivery_area, shouldBeDefault]
        );

        await client.query('COMMIT');
        return result.rows[0];
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

const updateAddress = async (id, userId, data) => {
    const {
        label,
        recipient_name,
        phone,
        address_line,
        city,
        delivery_area,
        is_default
    } = data;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        if (is_default) {
            await client.query(
                'UPDATE user_addresses SET is_default = false WHERE user_id = $1',
                [userId]
            );
        }

        const result = await client.query(
            `UPDATE user_addresses
             SET label = COALESCE($3, label),
                 recipient_name = COALESCE($4, recipient_name),
                 phone = COALESCE($5, phone),
                 address_line = COALESCE($6, address_line),
                 city = COALESCE($7, city),
                 delivery_area = COALESCE($8, delivery_area),
                 is_default = COALESCE($9, is_default)
             WHERE id = $1 AND user_id = $2
             RETURNING *`,
            [id, userId, label, recipient_name, phone, address_line, city, delivery_area, is_default]
        );

        await client.query('COMMIT');
        return result.rows[0];
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

const deleteAddress = async (id, userId) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if address being deleted was default
        const check = await client.query(
            'SELECT is_default FROM user_addresses WHERE id = $1 AND user_id = $2',
            [id, userId]
        );

        if (check.rows.length === 0) {
            await client.query('ROLLBACK');
            return null;
        }

        const wasDefault = check.rows[0].is_default;

        const result = await client.query(
            'DELETE FROM user_addresses WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, userId]
        );

        // If it was default, make the most recent remaining address the default
        if (wasDefault) {
            await client.query(
                `UPDATE user_addresses
                 SET is_default = true
                 WHERE id = (
                     SELECT id FROM user_addresses
                     WHERE user_id = $1
                     ORDER BY created_at DESC
                     LIMIT 1
                 )`,
                [userId]
            );
        }

        await client.query('COMMIT');
        return result.rows[0];
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

const setDefaultAddress = async (id, userId) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(
            'UPDATE user_addresses SET is_default = false WHERE user_id = $1',
            [userId]
        );

        const result = await client.query(
            'UPDATE user_addresses SET is_default = true WHERE id = $1 AND user_id = $2 RETURNING *',
            [id, userId]
        );

        await client.query('COMMIT');
        return result.rows[0];
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

module.exports = {
    getAddresses,
    getAddressById,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress
};
