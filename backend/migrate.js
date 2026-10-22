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

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'users' AND column_name = 'phone'
                ) THEN
                    ALTER TABLE users ADD COLUMN phone VARCHAR(30);
                    RAISE NOTICE 'Column phone added to users.';
                END IF;
            END $$;

            CREATE TABLE IF NOT EXISTS user_addresses (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                label VARCHAR(50) DEFAULT 'Home',
                recipient_name VARCHAR(100),
                phone VARCHAR(30),
                address_line TEXT NOT NULL,
                city VARCHAR(50) DEFAULT 'Dhaka',
                delivery_area VARCHAR(50) DEFAULT 'inside_dhaka',
                is_default BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS product_reviews (
                id SERIAL PRIMARY KEY,
                product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                title VARCHAR(255),
                comment TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unique_user_product_review UNIQUE (user_id, product_id)
            );

            CREATE TABLE IF NOT EXISTS wishlists (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unique_user_product_wishlist UNIQUE (user_id, product_id)
            );

            -- Sample initial reviews seed for live demo
            INSERT INTO product_reviews (product_id, user_id, rating, title, comment)
            SELECT p.id, u.id, 5, 'Insane acoustics & build quality!', 'The tactile switches and sound dampening foam make typing feel incredibly smooth. Highly recommend for developers & gamers!'
            FROM products p, users u
            WHERE p.name = 'Nebula 75% Mechanical Keyboard' AND u.id = 1
            ON CONFLICT (user_id, product_id) DO NOTHING;

            INSERT INTO product_reviews (product_id, user_id, rating, title, comment)
            SELECT p.id, u.id, 5, 'Zero latency and super lightweight', 'The PTFE skates glide like butter on my Prism mat. Battery lasts over a week easily.'
            FROM products p, users u
            WHERE p.name = 'AeroGlide Ultralight Wireless Mouse' AND u.id = 1
            ON CONFLICT (user_id, product_id) DO NOTHING;

            INSERT INTO product_reviews (product_id, user_id, rating, title, comment)
            SELECT p.id, u.id, 4, 'Game changer for late night work', 'The eye-care warm temperature reduces fatigue drastically. Solid aluminum build.'
            FROM products p, users u
            WHERE p.name = 'Aura ScreenBar Monitor Light' AND u.id = 1
            ON CONFLICT (user_id, product_id) DO NOTHING;
        `);
        console.log('✅ Migration complete: database schema updated successfully.');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
