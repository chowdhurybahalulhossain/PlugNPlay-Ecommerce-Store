const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get('/', (req, res) => {
    res.send('🛒 E-commerce API is running...');
});

const productRoutes = require('./routes/productRoutes');
app.use('/api/products', productRoutes);

// DB connection test
require('./config/db');

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});