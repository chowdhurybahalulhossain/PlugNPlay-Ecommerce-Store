const pool = require('./config/db');

const seedProducts = [
    {
        name: 'Nebula 75% Mechanical Keyboard',
        description: 'Gasket-mounted hot-swappable RGB keyboard with tactile switches, frosted keycaps, and coiled aviator cable.',
        price: 8500.00,
        image_url: 'images/nebula_keyboard.jpg',
        category: 'Keyboard',
        stock_quantity: 25
    },
    {
        name: 'AeroGlide Ultralight Wireless Mouse',
        description: '60g optical sensor wireless gaming mouse with 80-hour battery and zero-latency PTFE glides.',
        price: 4200.00,
        image_url: 'images/aeroglide_mouse.jpg',
        category: 'Mouse',
        stock_quantity: 40
    },
    {
        name: 'SonicPulse Wireless ANC Headset',
        description: 'Studio-grade acoustics with hybrid active noise cancellation, memory foam cups, and gunmetal trim.',
        price: 6800.00,
        image_url: 'images/sonicpulse_headset.jpg',
        category: 'Audio',
        stock_quantity: 15
    },
    {
        name: 'Vortex Cyberpunk Gaming Earbuds',
        description: 'Ultra low-latency 35ms gaming true wireless earbuds with cyan LED charging case and touch sensors.',
        price: 3200.00,
        image_url: 'images/vortex_earbuds.jpg',
        category: 'Audio',
        stock_quantity: 30
    },
    {
        name: 'Aura ScreenBar Monitor Light',
        description: 'Asymmetric anti-glare monitor lamp with touch dial, warm eye-care illumination, and aluminum build.',
        price: 4900.00,
        image_url: 'images/aura_lightbar.jpg',
        category: 'Lighting',
        stock_quantity: 20
    },
    {
        name: 'Prism Desk Mat & Cable Hub',
        description: 'Waterproof micro-weave felt desk pad with built-in magnetic cable routing channels.',
        price: 1800.00,
        image_url: 'images/prism_deskmat.jpg',
        category: 'Accessories',
        stock_quantity: 50
    }
];

async function runSeed() {
    try {
        console.log('🌱 Starting database seed...');

        // 1. Clean up old test products that had empty images or duplicates
        await pool.query("DELETE FROM products WHERE image_url IS NULL OR image_url = ''");

        // 2. Add unique constraint on name if not already present
        await pool.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'products_name_key'
                ) THEN
                    ALTER TABLE products ADD CONSTRAINT products_name_key UNIQUE (name);
                END IF;
            END $$;
        `);

        // 3. Upsert products
        for (const p of seedProducts) {
            await pool.query(`
                INSERT INTO products (name, description, price, image_url, category, stock_quantity)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (name) DO UPDATE SET
                    description = EXCLUDED.description,
                    price = EXCLUDED.price,
                    image_url = EXCLUDED.image_url,
                    category = EXCLUDED.category,
                    stock_quantity = EXCLUDED.stock_quantity
            `, [p.name, p.description, p.price, p.image_url, p.category, p.stock_quantity]);
        }

        console.log('✅ Successfully seeded 6 unique products with images into database!');
    } catch (err) {
        console.error('❌ Seeding failed:', err);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

runSeed();
