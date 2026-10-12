-- =======================================================
-- Database Schema for PlugNPlay E-Commerce Store
-- Compatible with PostgreSQL
-- =======================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'customer', -- 'customer' or 'admin'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    image_url TEXT,
    category VARCHAR(100),
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Cart Items Table
CREATE TABLE IF NOT EXISTS cart_items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_product UNIQUE (user_id, product_id)
);

-- 4. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_amount NUMERIC(10, 2) NOT NULL,
    shipping_address TEXT NOT NULL,
    stripe_payment_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'paid', -- 'paid', 'shipped', 'delivered', 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    price_at_purchase NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Sample Initial Seed Data (PlugNPlay Store Products)
INSERT INTO products (name, description, price, image_url, category, stock_quantity) VALUES
('Nebula 75% Mechanical Keyboard', 'Gasket-mounted hot-swappable RGB keyboard with tactile switches, frosted keycaps, and coiled aviator cable.', 8500.00, 'images/nebula_keyboard.jpg', 'Keyboard', 25),
('AeroGlide Ultralight Wireless Mouse', '60g optical sensor wireless gaming mouse with 80-hour battery and zero-latency PTFE glides.', 4200.00, 'images/aeroglide_mouse.jpg', 'Mouse', 40),
('SonicPulse Wireless ANC Headset', 'Studio-grade acoustics with hybrid active noise cancellation, memory foam cups, and gunmetal trim.', 6800.00, 'images/sonicpulse_headset.jpg', 'Audio', 15),
('Vortex Cyberpunk Gaming Earbuds', 'Ultra low-latency 35ms gaming true wireless earbuds with cyan LED charging case and touch sensors.', 3200.00, 'images/vortex_earbuds.jpg', 'Audio', 30),
('Aura ScreenBar Monitor Light', 'Asymmetric anti-glare monitor lamp with touch dial, warm eye-care illumination, and aluminum build.', 4900.00, 'images/aura_lightbar.jpg', 'Lighting', 20),
('Prism Desk Mat & Cable Hub', 'Waterproof micro-weave felt desk pad with built-in magnetic cable routing channels.', 1800.00, 'images/prism_deskmat.jpg', 'Accessories', 50)
ON CONFLICT (name) DO UPDATE SET 
    image_url = EXCLUDED.image_url, 
    description = EXCLUDED.description, 
    price = EXCLUDED.price, 
    stock_quantity = EXCLUDED.stock_quantity;

