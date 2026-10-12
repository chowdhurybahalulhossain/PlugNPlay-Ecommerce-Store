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

async function check() {
    const client = await pool.connect();
    try {
        const res = await client.query(`
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'orders'
            ORDER BY ordinal_position
        `);
        console.log('Orders table columns:');
        res.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type}) default: ${r.column_default}`));

        // Also check if status column exists
        const hasStatus = res.rows.some(r => r.column_name === 'status');
        const hasPaymentMethod = res.rows.some(r => r.column_name === 'payment_method');
        
        if (!hasStatus) {
            console.log('\n⚠️  status column missing! Adding...');
            await client.query(`ALTER TABLE orders ADD COLUMN status VARCHAR(50) DEFAULT 'pending'`);
            console.log('✅ status column added.');
        } else {
            console.log('\n✅ status column exists.');
        }
        if (hasPaymentMethod) {
            console.log('✅ payment_method column exists.');
        }
    } finally {
        client.release();
        await pool.end();
    }
}

check();
