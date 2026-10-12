const ordersList = document.getElementById('ordersList');
const ordersSubtitle = document.getElementById('ordersSubtitle');

const orderItemsCache = new Map();

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const money = (n) => '৳' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const svg = (inner) => `<svg viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
const ITEM_ICON = svg('<rect x="26" y="26" width="44" height="44" rx="8"/><rect x="38" y="38" width="20" height="20" rx="3"/>');

const orderHTML = (order) => `
    <article class="order-card" data-order-id="${order.id}">
        <div class="order-header">
            <div class="order-id-group">
                <span class="order-id">Order #${order.id}</span>
                <span class="order-date">${formatDate(order.created_at)}</span>
            </div>
            <span class="order-badge ${(order.status || 'paid').toLowerCase()}">${esc(order.status || 'paid')}</span>
        </div>
        <div class="order-details-grid">
            <div class="order-meta-info">
                <span class="meta-label">Shipping Address</span>
                <span class="order-address">${esc(order.shipping_address || 'No shipping address specified')}</span>
                ${order.stripe_payment_id ? `<span class="order-payment-id">Transaction: ${esc(order.stripe_payment_id)}</span>` : ''}
            </div>
            <div class="order-total-block">
                <span class="meta-label">Total Amount</span>
                <span class="order-total-amount">${money(order.total_amount)}</span>
            </div>
        </div>
        <div class="order-actions">
            <button class="btn-toggle-items" data-action="toggle-items" aria-expanded="false" data-id="${order.id}">
                <span>View items</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
            </button>
        </div>
        <div class="order-items-drawer" id="items-${order.id}" hidden></div>
    </article>`;

const itemHTML = (item) => `
    <div class="order-item-row">
        <div class="order-item-thumb">${ITEM_ICON}</div>
        <div>
            <p class="order-item-name">${esc(item.name)}</p>
            <span class="order-item-unit">${money(item.price_at_purchase)} each</span>
        </div>
        <span class="order-item-qty">Qty: ${item.quantity}</span>
        <span class="order-item-price">${money(item.price_at_purchase * item.quantity)}</span>
    </div>`;

const loadOrders = async () => {
    if (!getToken()) {
        ordersSubtitle.textContent = 'Sign in to access your order history.';
        ordersList.innerHTML = `
            <div class="orders-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="8.5" cy="7" r="4"/>
                    <line x1="20" y1="8" x2="20" y2="14"/>
                    <line x1="23" y1="11" x2="17" y2="11"/>
                </svg>
                <h2>Sign in to view orders</h2>
                <p>Track your orders, check past invoices, and view order statuses easily.</p>
                <a href="login.html" class="btn">Sign in</a>
            </div>`;
        return;
    }

    ordersList.innerHTML = Array(2).fill('<div class="skeleton-order"></div>').join('');

    try {
        const orders = await apiRequest('/orders', 'GET', null, true);

        if (!orders || orders.length === 0) {
            ordersSubtitle.textContent = 'No past orders found.';
            ordersList.innerHTML = `
                <div class="orders-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="9" cy="21" r="1"/>
                        <circle cx="20" cy="21" r="1"/>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                    </svg>
                    <h2>No orders placed yet</h2>
                    <p>When you purchase keyboards, mice, or tech gear, your orders will appear here.</p>
                    <a href="index.html" class="btn">Browse collection</a>
                </div>`;
            return;
        }

        ordersSubtitle.textContent = orders.length === 1 ? '1 order placed' : `${orders.length} orders placed`;
        ordersList.innerHTML = orders.map(orderHTML).join('');
    } catch (err) {
        ordersList.innerHTML = `
            <div class="orders-empty">
                <h2>Could not load orders</h2>
                <p>${esc(err.message)}</p>
                <button class="btn btn-ghost" onclick="loadOrders()">Try again</button>
            </div>`;
    }
};

ordersList.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="toggle-items"]');
    if (!btn) return;

    const orderId = Number(btn.dataset.id);
    const drawer = document.getElementById(`items-${orderId}`);
    if (!drawer) return;

    const isExpanded = btn.getAttribute('aria-expanded') === 'true';

    if (isExpanded) {
        drawer.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
        btn.querySelector('span').textContent = 'View items';
        return;
    }

    drawer.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    btn.querySelector('span').textContent = 'Hide items';

    if (orderItemsCache.has(orderId)) {
        const items = orderItemsCache.get(orderId);
        drawer.innerHTML = items.length
            ? items.map(itemHTML).join('')
            : '<p class="order-item-unit" style="padding: 10px;">No items found for this order.</p>';
        return;
    }

    drawer.innerHTML = '<p class="order-item-unit" style="padding: 10px;">Loading order items...</p>';

    try {
        const data = await apiRequest(`/orders/${orderId}`, 'GET', null, true);
        const items = data.items || [];
        orderItemsCache.set(orderId, items);

        drawer.innerHTML = items.length
            ? items.map(itemHTML).join('')
            : '<p class="order-item-unit" style="padding: 10px;">No items found for this order.</p>';
    } catch (err) {
        drawer.innerHTML = `<p class="order-item-unit" style="color: var(--err); padding: 10px;">Failed to load items: ${esc(err.message)}</p>`;
    }
});

loadOrders();
