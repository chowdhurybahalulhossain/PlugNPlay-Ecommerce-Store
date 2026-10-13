const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');

const pool = new Pool({
    user:     process.env.DB_USER,
    host:     process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port:     Number(process.env.DB_PORT) || 5432,
});

async function migrate() {
    const client = await pool.connect();
    try {
        // Add payment_method column if it doesn't exist
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'orders' AND column_name = 'payment_method'
                ) THEN
                    ALTER TABLE orders ADD COLUMN payment_method VARCHAR(50) DEFAULT 'card';
                    RAISE NOTICE 'Column payment_method added.';
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'orders' AND column_name = 'delivery_fee'
                ) THEN
                    ALTER TABLE orders ADD COLUMN delivery_fee NUMERIC DEFAULT 60;
                    RAISE NOTICE 'Column delivery_fee added.';
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'orders' AND column_name = 'delivery_area'
                ) THEN
                    ALTER TABLE orders ADD COLUMN delivery_area VARCHAR(50) DEFAULT 'inside_dhaka';
                    RAISE NOTICE 'Column delivery_area added.';
                END IF;
            END $$;
        `);
        console.log('✅ Migration complete: payment_method column is ready.');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
