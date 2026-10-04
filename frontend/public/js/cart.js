const listEl = document.getElementById('cartList');
const subtotalEl = document.getElementById('subtotal');
const totalEl = document.getElementById('totalAmount');
const checkoutBtn = document.getElementById('checkoutBtn');

let items = [];

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));
const money = (n) => '৳' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

const svg = (inner) => `<svg viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
const ICON = svg('<rect x="26" y="26" width="44" height="44" rx="8"/><rect x="38" y="38" width="20" height="20" rx="3"/>');

const itemHTML = (item) => `
    <div class="cart-item" data-id="${item.id}">
        <div class="thumb">${ICON}</div>
        <div>
            <h3>${esc(item.name)}</h3>
            <p class="unit-price">${money(item.price)} each</p>
        </div>
        <div class="stepper">
            <button data-action="dec" aria-label="Decrease quantity">−</button>
            <span>${item.quantity}</span>
            <button data-action="inc" aria-label="Increase quantity">+</button>
        </div>
        <div class="line-total">${money(item.price * item.quantity)}</div>
        <button class="remove" data-action="remove">Remove</button>
    </div>`;

const renderSummary = () => {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    subtotalEl.textContent = money(subtotal);
    totalEl.textContent = money(subtotal);
    checkoutBtn.toggleAttribute('disabled', items.length === 0);
};

const render = () => {
    if (!items.length) {
        listEl.innerHTML = `
            <div class="cart-empty">
                <p>Your cart is empty.</p>
                <a href="index.html" class="btn">Browse gear</a>
            </div>`;
    } else {
        listEl.innerHTML = items.map(itemHTML).join('');
    }
    renderSummary();
};

const loadCart = async () => {
    if (!getToken()) {
        listEl.innerHTML = `
            <div class="cart-empty">
                <p>Sign in to see your cart.</p>
                <a href="login.html" class="btn">Sign in</a>
            </div>`;
        checkoutBtn.setAttribute('disabled', '');
        return;
    }
    listEl.innerHTML = Array(2).fill('<div class="skeleton-row"></div>').join('');
    try {
        items = await apiRequest('/cart', 'GET', null, true);
        render();
    } catch (err) {
        listEl.innerHTML = `<div class="cart-empty"><p>${esc(err.message)}</p></div>`;
    }
};

listEl.addEventListener('click', async (e) => {
    const row = e.target.closest('.cart-item');
    const action = e.target.dataset.action;
    if (!row || !action) return;

    const id = Number(row.dataset.id);
    const item = items.find((i) => i.id === id);
    if (!item) return;

    try {
        if (action === 'remove') {
            await apiRequest(`/cart/${id}`, 'DELETE', null, true);
            items = items.filter((i) => i.id !== id);
            showToast('Removed from cart');
        } else {
            const newQty = action === 'inc' ? item.quantity + 1 : item.quantity - 1;
            if (newQty < 1) return;
            await apiRequest(`/cart/${id}`, 'PUT', { quantity: newQty }, true);
            item.quantity = newQty;
        }
        render();
        updateCartCount();
    } catch (err) {
        showToast(err.message, 'error');
    }
});

loadCart();