/* ================================================================
   orders.js — Renders user order history with status, payment
   method badge, expandable item drawer, and rich empty states.
   ================================================================ */

const ordersList    = document.getElementById('ordersList');
const ordersSubtitle = document.getElementById('ordersSubtitle');

// Cache item details to avoid repeat API calls
const orderItemsCache = new Map();

/* ---- Helpers ---- */
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));
const money = (n) => '৳' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

/* ---- SVG helpers ---- */
const svgBox = (inner) =>
    `<svg viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="3"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
const ITEM_ICON = svgBox('<rect x="26" y="26" width="44" height="44" rx="8"/><rect x="38" y="38" width="20" height="20" rx="3"/>');

/* ---- Payment method badge ---- */
const paymentBadge = (method) => {
    if (!method) return '';
    const label = method === 'cod' ? '💵 Cash on Delivery' : '💳 Card';
    return `<span class="payment-method-badge ${esc(method)}">${label}</span>`;
};

/* ---- Order card HTML ---- */
const orderHTML = (order) => {
    const status = (order.status || 'paid').toLowerCase();
    return `
    <article class="order-card" data-order-id="${order.id}">
        <div class="order-header">
            <div class="order-id-group">
                <span class="order-id">Order #${order.id}</span>
                <span class="order-date">${formatDate(order.created_at)}</span>
            </div>
            <div class="order-header-right">
                ${paymentBadge(order.payment_method)}
                <span class="order-badge ${status}">${esc(order.status || 'paid')}</span>
            </div>
        </div>

        <div class="order-body">
            <div class="order-meta-info">
                <span class="meta-label">Shipping Address</span>
                <span class="order-address">${esc(order.shipping_address || 'No address specified')}</span>
                ${order.stripe_payment_id
                    ? `<span class="order-payment-id">TXN: ${esc(order.stripe_payment_id)}</span>`
                    : ''}
            </div>
            <div class="order-total-block">
                <span class="meta-label">Total</span>
                <span class="order-total-amount">${money(order.total_amount)}</span>
            </div>
        </div>

        <div class="order-footer">
            <button class="btn-toggle-items" data-action="toggle-items"
                aria-expanded="false" data-id="${order.id}">
                <span>View Items</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M6 9l6 6 6-6"/>
                </svg>
            </button>
        </div>

        <div class="order-items-drawer" id="items-${order.id}" hidden></div>
    </article>`;
};

/* ---- Item row HTML ---- */
const itemHTML = (item) => `
    <div class="order-item-row">
        <div class="order-item-thumb">
            ${item.product_image || item.image_url
                ? `<img src="${esc(item.product_image || item.image_url)}" alt="${esc(item.product_name || item.name)}">`
                : ITEM_ICON}
        </div>
        <div>
            <p class="order-item-name">${esc(item.product_name || item.name)}</p>
            <span class="order-item-unit">${money(item.price_at_purchase)} each</span>
        </div>
        <span class="order-item-qty">×${item.quantity}</span>
        <span class="order-item-price">${money(item.price_at_purchase * item.quantity)}</span>
    </div>`;

/* ---- Empty States ---- */
const emptyHTML = (icon, title, desc, btnHref, btnText) => `
    <div class="orders-empty">
        <div class="orders-empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-linecap="round" stroke-linejoin="round">${icon}</svg>
        </div>
        <h2>${title}</h2>
        <p>${desc}</p>
        <a href="${btnHref}" class="btn">${btnText}</a>
    </div>`;

/* ---- Load Orders ---- */
const loadOrders = async () => {
    if (!getToken()) {
        ordersSubtitle.textContent = 'Sign in to access your order history.';
        ordersList.innerHTML = emptyHTML(
            '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>',
            'Sign in to view orders',
            'Track your purchases, check past invoices, and view delivery status in one place.',
            'login.html', 'Sign In'
        );
        return;
    }

    // Skeleton loaders
    ordersList.innerHTML = Array(3).fill('<div class="skeleton-order"></div>').join('');

    try {
        const orders = await apiRequest('/orders', 'GET', null, true);

        if (!orders || orders.length === 0) {
            ordersSubtitle.textContent = 'No orders placed yet.';
            ordersList.innerHTML = emptyHTML(
                '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
                'No orders placed yet',
                'When you buy keyboards, mice, audio gear, or accessories — your orders will appear here.',
                'index.html', 'Browse Gear'
            );
            return;
        }

        ordersSubtitle.textContent =
            orders.length === 1 ? '1 order placed' : `${orders.length} orders placed`;
        ordersList.innerHTML = orders.map(orderHTML).join('');

    } catch (err) {
        ordersList.innerHTML = emptyHTML(
            '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
            'Could not load orders',
            esc(err.message),
            '#', 'Try Again'
        );
        ordersList.querySelector('.btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            loadOrders();
        });
    }
};

/* ---- Toggle Item Drawer ---- */
ordersList.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="toggle-items"]');
    if (!btn) return;

    const orderId = Number(btn.dataset.id);
    const drawer  = document.getElementById(`items-${orderId}`);
    if (!drawer) return;

    const isOpen = btn.getAttribute('aria-expanded') === 'true';

    if (isOpen) {
        drawer.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
        btn.querySelector('span').textContent = 'View Items';
        return;
    }

    drawer.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    btn.querySelector('span').textContent = 'Hide Items';

    // Serve from cache if available
    if (orderItemsCache.has(orderId)) {
        const cached = orderItemsCache.get(orderId);
        drawer.innerHTML = cached.length
            ? cached.map(itemHTML).join('')
            : '<p class="order-item-unit" style="padding:12px">No items found.</p>';
        return;
    }

    drawer.innerHTML = '<p class="order-item-unit" style="padding:12px;color:var(--muted)">Loading items…</p>';

    try {
        const data  = await apiRequest(`/orders/${orderId}`, 'GET', null, true);
        const items = data.items || [];
        orderItemsCache.set(orderId, items);
        drawer.innerHTML = items.length
            ? items.map(itemHTML).join('')
            : '<p class="order-item-unit" style="padding:12px">No items found for this order.</p>';
    } catch (err) {
        drawer.innerHTML =
            `<p class="order-item-unit" style="color:var(--err);padding:12px">Failed to load: ${esc(err.message)}</p>`;
    }
});

/* ---- Init ---- */
loadOrders();
