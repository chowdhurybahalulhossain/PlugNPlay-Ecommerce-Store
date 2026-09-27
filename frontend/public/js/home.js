const categoryIcon = (category) => {
    const icons = { Electronics: '⚙️', Accessories: '🎧', Default: '📦' };
    return icons[category] || icons.Default;
};

const loadProducts = async () => {
    try {
        const products = await apiRequest('/products');
        const grid = document.getElementById('productGrid');

        grid.innerHTML = products.map(p => `
            <div class="product-card">
                <div class="product-thumb">${categoryIcon(p.category)}</div>
                <h3>${p.name}</h3>
                <p class="category">${p.category}</p>
                <p class="price">৳${p.price}</p>
                <button class="btn-add" onclick="addToCart(${p.id})">Add to Cart</button>
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
        document.getElementById('productGrid').innerHTML = '<p>Failed to load products.</p>';
    }
};

const addToCart = async (productId) => {
    if (!getToken()) {
        alert('Please login first');
        window.location.href = 'login.html';
        return;
    }
    try {
        await apiRequest('/cart', 'POST', { productId, quantity: 1 }, true);
        alert('Added to cart!');
    } catch (err) {
        alert(err.message);
    }
};

loadProducts();