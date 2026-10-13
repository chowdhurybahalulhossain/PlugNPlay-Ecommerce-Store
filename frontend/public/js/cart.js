/* ================================================================
   cart.js — Cart page: render items, quantity controls, summary
   ================================================================ */

const listEl        = document.getElementById('cartList');
const subtotalEl    = document.getElementById('subtotal');
const totalEl       = document.getElementById('totalAmount');
const checkoutBtn   = document.getElementById('checkoutBtn');
const itemCountEl   = document.getElementById('cartItemCount');
const deliveryFeeEl = document.getElementById('cartDeliveryFee');
const cartAreaRadios = document.querySelectorAll('input[name="cartDeliveryArea"]');

let items = [];

/* ---- Helpers ---- */
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));
const money = (n) => '৳' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

const getCartDeliveryFee = () => {
    const sel = document.querySelector('input[name="cartDeliveryArea"]:checked');
    return sel && sel.value === 'outside_dhaka' ? 120 : 60;
};

// Restore saved area preference
const savedCartArea = localStorage.getItem('plugnplay_delivery_area');
if (savedCartArea) {
    const target = document.querySelector(`input[name="cartDeliveryArea"][value="${savedCartArea}"]`);
    if (target) {
        target.checked = true;
        document.querySelectorAll('.cart-area-option').forEach(c => c.classList.remove('active'));
        target.closest('.cart-area-option')?.classList.add('active');
    }
}

// Listen to cart delivery area changes
cartAreaRadios.forEach(radio => {
    radio.addEventListener('change', () => {
        document.querySelectorAll('.cart-area-option').forEach(c => c.classList.remove('active'));
        radio.closest('.cart-area-option')?.classList.add('active');
        localStorage.setItem('plugnplay_delivery_area', radio.value);
        renderSummary();
    });
});

const svgIcon = (inner) =>
    `<svg viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="3"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
const PLACEHOLDER = svgIcon('<rect x="26" y="26" width="44" height="44" rx="8"/><rect x="38" y="38" width="20" height="20" rx="3"/>');

/* ---- Item card HTML ---- */
const itemHTML = (item) => `
    <div class="cart-item" data-id="${item.id}">
        <div class="thumb">
            ${item.image_url
                ? `<img src="${esc(item.image_url)}" alt="${esc(item.name)}">`
                : PLACEHOLDER}
        </div>
        <div class="cart-item-info">
            <h3><a href="product.html?id=${item.product_id}">${esc(item.name)}</a></h3>
            <p class="unit-price">${money(item.price)} each</p>
        </div>
        <div class="stepper">
            <button data-action="dec" aria-label="Decrease quantity" title="${item.quantity === 1 ? 'Remove from cart' : 'Decrease quantity'}">
                ${item.quantity === 1 ? '🗑' : '−'}
            </button>
            <span>${item.quantity}</span>
            <button data-action="inc" aria-label="Increase quantity" title="Increase quantity">+</button>
        </div>
        <div class="line-total">${money(item.price * item.quantity)}</div>
        <button class="cart-remove-btn" data-action="remove" aria-label="Remove ${esc(item.name)} from cart" title="Remove item from cart">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
            </svg>
            <span>Remove</span>
        </button>
    </div>`;

/* ---- Update summary panel ---- */
const renderSummary = () => {
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const fee = items.length > 0 ? getCartDeliveryFee() : 0;
    subtotalEl.textContent = money(subtotal);
    if (deliveryFeeEl) deliveryFeeEl.textContent = money(fee);
    totalEl.textContent    = money(subtotal + fee);
    checkoutBtn.toggleAttribute('disabled', items.length === 0);

    // Item count badge
    if (itemCountEl) {
        const total = items.reduce((s, i) => s + i.quantity, 0);
        if (total > 0) {
            itemCountEl.textContent = `${total} item${total !== 1 ? 's' : ''}`;
            itemCountEl.hidden = false;
        } else {
            itemCountEl.hidden = true;
        }
    }
};

/* ---- Empty state ---- */
const emptyHTML = (icon, title, desc, btnHref, btnLabel) => `
    <div class="cart-empty">
        <div class="cart-empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-linecap="round" stroke-linejoin="round">${icon}</svg>
        </div>
        <h2>${title}</h2>
        <p>${desc}</p>
        <a href="${btnHref}" class="btn">${btnLabel}</a>
    </div>`;

/* ---- Render cart list ---- */
const render = () => {
    if (!items.length) {
        listEl.innerHTML = emptyHTML(
            '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
            'Your cart is empty',
            'Looks like you haven\'t added any gear yet. Browse our collection of keyboards, mice, and audio.',
            'index.html', 'Browse Gear'
        );
    } else {
        listEl.innerHTML = items.map(itemHTML).join('');
    }
    renderSummary();
};

/* ---- Load cart from API ---- */
const loadCart = async () => {
    if (!getToken()) {
        listEl.innerHTML = emptyHTML(
            '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>',
            'Sign in to view your cart',
            'Save your gear and access your cart from anywhere by signing in to your account.',
            'login.html', 'Sign In'
        );
        checkoutBtn.setAttribute('disabled', '');
        return;
    }

    listEl.innerHTML = Array(3).fill('<div class="skeleton-row"></div>').join('');

    try {
        items = await apiRequest('/cart', 'GET', null, true);
        render();
    } catch (err) {
        listEl.innerHTML = `<div class="cart-empty"><p style="color:var(--muted)">${esc(err.message)}</p></div>`;
    }
};

/* ---- Cart interactions (quantity + remove) ---- */
listEl.addEventListener('click', async (e) => {
    const row    = e.target.closest('.cart-item');
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (!row || !action) return;

    const id   = Number(row.dataset.id);
    const item = items.find((i) => i.id === id);
    if (!item) return;

    try {
        if (action === 'remove' || (action === 'dec' && item.quantity <= 1)) {
            await apiRequest(`/cart/${id}`, 'DELETE', null, true);
            items = items.filter((i) => i.id !== id);
            showToast('Removed from cart');
        } else {
            const newQty = action === 'inc' ? item.quantity + 1 : item.quantity - 1;
            await apiRequest(`/cart/${id}`, 'PUT', { quantity: newQty }, true);
            item.quantity = newQty;
        }
        render();
        updateCartCount();
    } catch (err) {
        showToast(err.message, 'error');
    }
});

/* ---- Init ---- */
loadCart();