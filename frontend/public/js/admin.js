/* ================================================================
   admin.js — Admin Dashboard Controller
   Handles products catalog CRUD, order tracking, and live status changes.
   ================================================================ */

// Verify Admin Role immediately
const verifyAdminAccess = () => {
    const token = getToken();
    let user = null;
    try {
        user = JSON.parse(localStorage.getItem('user'));
    } catch (e) {}

    if (!token || !user || user.role !== 'admin') {
        alert('Access denied. Administrator privileges required.');
        window.location.href = 'login.html';
        return false;
    }
    return true;
};

if (!verifyAdminAccess()) {
    throw new Error('Unauthorized');
}

// State
let allProducts = [];
let allOrders = [];
let currentTab = 'products';
let productToDeleteId = null;

// Helpers
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));
const money = (n) => '৳' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// DOM Elements
const metricRevenue     = document.getElementById('metricRevenue');
const metricOrders      = document.getElementById('metricOrders');
const metricProducts    = document.getElementById('metricProducts');
const metricLowStock    = document.getElementById('metricLowStock');

const lowStockBanner    = document.getElementById('lowStockBanner');
const lowStockAlertCount= document.getElementById('lowStockAlertCount');
const filterLowStockBtn = document.getElementById('filterLowStockBtn');
const openRestockHubBtn = document.getElementById('openRestockHubBtn');

const tabBtnProducts    = document.getElementById('tabBtnProducts');
const tabBtnOrders      = document.getElementById('tabBtnOrders');
const tabBtnAnalytics   = document.getElementById('tabBtnAnalytics');
const tabPanelProducts  = document.getElementById('tabPanelProducts');
const tabPanelOrders    = document.getElementById('tabPanelOrders');
const tabPanelAnalytics = document.getElementById('tabPanelAnalytics');
const tabCountProducts  = document.getElementById('tabCountProducts');
const tabCountOrders    = document.getElementById('tabCountOrders');

const productsTableBody = document.getElementById('productsTableBody');
const productSearchInput = document.getElementById('productSearchInput');
const productCatFilter  = document.getElementById('productCategoryFilter');

const ordersListView    = document.getElementById('ordersListView');
const orderSearchInput  = document.getElementById('orderSearchInput');
const orderStatusFilter = document.getElementById('orderStatusFilter');

const productModal      = document.getElementById('productModal');
const productForm       = document.getElementById('productForm');
const modalTitle        = document.getElementById('modalTitle');
const productIdInput    = document.getElementById('productId');
const prodNameInput     = document.getElementById('prodName');
const prodCatInput      = document.getElementById('prodCategory');
const prodPriceInput    = document.getElementById('prodPrice');
const prodStockInput    = document.getElementById('prodStock');
const prodImageInput    = document.getElementById('prodImageUrl');
const prodDescInput     = document.getElementById('prodDesc');

const restockModal      = document.getElementById('restockModal');
const restockItemsContainer = document.getElementById('restockItemsContainer');
const closeRestockModalBtn = document.getElementById('closeRestockModalBtn');

const deleteModal       = document.getElementById('deleteModal');
const deleteModalText   = document.getElementById('deleteModalText');
const confirmDeleteBtn  = document.getElementById('confirmDeleteBtn');

// Analytics DOM elements
const kpiAov            = document.getElementById('kpiAov');
const kpiFulfillment    = document.getElementById('kpiFulfillment');
const kpiDeliveredCount = document.getElementById('kpiDeliveredCount');
const kpiTotalOrders    = document.getElementById('kpiTotalOrders');
const kpiCodRevenue     = document.getElementById('kpiCodRevenue');
const kpiCodCount       = document.getElementById('kpiCodCount');
const kpiCardRevenue    = document.getElementById('kpiCardRevenue');
const kpiCardCount      = document.getElementById('kpiCardCount');

const distInsideDhaka   = document.getElementById('distInsideDhaka');
const barInsideDhaka    = document.getElementById('barInsideDhaka');
const distOutsideDhaka  = document.getElementById('distOutsideDhaka');
const barOutsideDhaka   = document.getElementById('barOutsideDhaka');
const distCod           = document.getElementById('distCod');
const barCod            = document.getElementById('barCod');
const distCard          = document.getElementById('distCard');
const barCard           = document.getElementById('barCard');

const topProductsList   = document.getElementById('topProductsList');
const categoryBreakdownList = document.getElementById('categoryBreakdownList');

let filterLowStockOnly = false;

/* ================================================================
   TABS SWITCHING
   ================================================================ */
const switchTab = (tabName) => {
    currentTab = tabName;
    const isProd = tabName === 'products';
    const isOrders = tabName === 'orders';
    const isAnalytics = tabName === 'analytics';

    tabBtnProducts.classList.toggle('active', isProd);
    tabBtnProducts.setAttribute('aria-selected', isProd);
    tabPanelProducts.hidden = !isProd;

    tabBtnOrders.classList.toggle('active', isOrders);
    tabBtnOrders.setAttribute('aria-selected', isOrders);
    tabPanelOrders.hidden = !isOrders;

    if (tabBtnAnalytics && tabPanelAnalytics) {
        tabBtnAnalytics.classList.toggle('active', isAnalytics);
        tabBtnAnalytics.setAttribute('aria-selected', isAnalytics);
        tabPanelAnalytics.hidden = !isAnalytics;
        if (isAnalytics) {
            fetchAnalytics();
        }
    }
};

tabBtnProducts.addEventListener('click', () => switchTab('products'));
tabBtnOrders.addEventListener('click', () => switchTab('orders'));
if (tabBtnAnalytics) {
    tabBtnAnalytics.addEventListener('click', () => switchTab('analytics'));
}

/* ================================================================
   METRICS CALCULATION & INVENTORY ALERTS
   ================================================================ */
const updateMetrics = () => {
    // Total Revenue (excluding cancelled orders)
    const validOrders = allOrders.filter(o => o.status !== 'cancelled');
    const revenue = validOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    metricRevenue.textContent = money(revenue);

    // Total orders count
    metricOrders.textContent = allOrders.length;
    tabCountOrders.textContent = allOrders.length;

    // Total products count
    metricProducts.textContent = allProducts.length;
    tabCountProducts.textContent = allProducts.length;

    // Low stock count (<= 5)
    const lowStockItems = allProducts.filter(p => (p.stock_quantity ?? 0) <= 5);
    metricLowStock.textContent = lowStockItems.length;

    // Update Low-Stock Banner
    if (lowStockBanner && lowStockAlertCount) {
        if (lowStockItems.length > 0) {
            lowStockBanner.hidden = false;
            lowStockAlertCount.textContent = lowStockItems.length;
        } else {
            lowStockBanner.hidden = true;
        }
    }
};

/* ================================================================
   PRODUCTS CATALOG
   ================================================================ */
const fetchProducts = async () => {
    try {
        allProducts = await apiRequest('/products', 'GET');
        populateCategoryFilter();
        renderProducts();
        updateMetrics();
    } catch (err) {
        productsTableBody.innerHTML = `<tr><td colspan="6" class="table-loading">Failed to load products: ${esc(err.message)}</td></tr>`;
    }
};

const populateCategoryFilter = () => {
    const cats = Array.from(new Set(allProducts.map(p => p.category).filter(Boolean))).sort();
    const currentVal = productCatFilter.value;
    productCatFilter.innerHTML = '<option value="">All Categories</option>' +
        cats.map(c => `<option value="${esc(c)}" ${c === currentVal ? 'selected' : ''}>${esc(c)}</option>`).join('');
};

const renderProducts = () => {
    const query = productSearchInput.value.toLowerCase().trim();
    const cat = productCatFilter.value;

    const filtered = allProducts.filter(p => {
        const matchesQuery = !query ||
            p.name.toLowerCase().includes(query) ||
            (p.category && p.category.toLowerCase().includes(query));
        const matchesCat = !cat || p.category === cat;
        const matchesStock = !filterLowStockOnly || (p.stock_quantity ?? 0) <= 5;
        return matchesQuery && matchesCat && matchesStock;
    });

    if (filtered.length === 0) {
        productsTableBody.innerHTML = `<tr><td colspan="6" class="table-loading">No products found matching your search${filterLowStockOnly ? ' (Low Stock filter active)' : ''}.</td></tr>`;
        return;
    }

    productsTableBody.innerHTML = filtered.map(p => {
        const stock = p.stock_quantity ?? 0;
        let stockClass = 'in-stock';
        let stockLabel = `${stock} in stock`;

        if (stock === 0) {
            stockClass = 'out-of-stock';
            stockLabel = 'Out of stock';
        } else if (stock <= 5) {
            stockClass = 'low-stock';
            stockLabel = `${stock} left (Low)`;
        }

        const imgSrc = p.image_url || 'images/nebula_keyboard.jpg';

        return `
            <tr>
                <td>
                    <img src="${esc(imgSrc)}" alt="${esc(p.name)}" class="prod-cell-img" onerror="this.src='images/nebula_keyboard.jpg'">
                </td>
                <td>
                    <strong class="prod-cell-name">${esc(p.name)}</strong>
                    <span class="prod-cell-desc">${esc(p.description || '')}</span>
                </td>
                <td>
                    <span class="category-tag">${esc(p.category || 'General')}</span>
                </td>
                <td>
                    <strong>${money(p.price)}</strong>
                </td>
                <td>
                    <div style="display:flex; align-items:center; flex-wrap:wrap; gap:0.25rem;">
                        <span class="stock-badge ${stockClass}">${stockLabel}</span>
                        ${stock <= 5 ? `<button type="button" class="btn-table-restock" title="Quick add 10 units" onclick="quickRestockProduct(${p.id}, 10, this)">+10 Restock</button>` : ''}
                    </div>
                </td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon" title="Edit product" onclick="openEditModal(${p.id})">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button class="btn-icon delete" title="Delete product" onclick="openDeleteModal(${p.id}, '${esc(p.name)}')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
};

productSearchInput.addEventListener('input', renderProducts);
productCatFilter.addEventListener('change', renderProducts);

/* ================================================================
   PRODUCT MODAL (Add / Edit)
   ================================================================ */
const openAddModal = () => {
    modalTitle.textContent = 'Add New Product';
    productForm.reset();
    productIdInput.value = '';
    productModal.hidden = false;
    prodNameInput.focus();
};

window.openEditModal = (id) => {
    const prod = allProducts.find(p => p.id === id);
    if (!prod) return;

    modalTitle.textContent = 'Edit Product';
    productIdInput.value = prod.id;
    prodNameInput.value = prod.name;
    prodCatInput.value = prod.category || '';
    prodPriceInput.value = prod.price;
    prodStockInput.value = prod.stock_quantity ?? 0;
    prodImageInput.value = prod.image_url || '';
    prodDescInput.value = prod.description || '';

    productModal.hidden = false;
    prodNameInput.focus();
};

const closeProductModal = () => {
    productModal.hidden = true;
};

document.getElementById('openAddProductBtn').addEventListener('click', openAddModal);
document.getElementById('closeProductModalBtn').addEventListener('click', closeProductModal);
document.getElementById('cancelProductBtn').addEventListener('click', closeProductModal);

productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = productIdInput.value;
    const isEdit = Boolean(id);

    const payload = {
        name: prodNameInput.value.trim(),
        category: prodCatInput.value.trim(),
        price: parseFloat(prodPriceInput.value),
        stockQuantity: parseInt(prodStockInput.value, 10),
        imageUrl: prodImageInput.value.trim(),
        description: prodDescInput.value.trim()
    };

    try {
        if (isEdit) {
            await apiRequest(`/products/${id}`, 'PUT', payload, true);
            showToast('Product updated successfully!');
        } else {
            await apiRequest('/products', 'POST', payload, true);
            showToast('New product added to catalog!');
        }
        closeProductModal();
        await fetchProducts();
    } catch (err) {
        showToast(err.message || 'Operation failed', 'error');
    }
});

/* ================================================================
   DELETE PRODUCT
   ================================================================ */
window.openDeleteModal = (id, name) => {
    productToDeleteId = id;
    deleteModalText.textContent = `Are you sure you want to permanently delete "${name}"?`;
    deleteModal.hidden = false;
};

const closeDeleteModal = () => {
    productToDeleteId = null;
    deleteModal.hidden = true;
};

document.getElementById('closeDeleteModalBtn').addEventListener('click', closeDeleteModal);
document.getElementById('cancelDeleteBtn').addEventListener('click', closeDeleteModal);

confirmDeleteBtn.addEventListener('click', async () => {
    if (!productToDeleteId) return;
    try {
        await apiRequest(`/products/${productToDeleteId}`, 'DELETE', null, true);
        showToast('Product removed.');
        closeDeleteModal();
        await fetchProducts();
    } catch (err) {
        showToast(err.message || 'Failed to delete product', 'error');
    }
});

/* ================================================================
   ORDERS MANAGEMENT
   ================================================================ */
const fetchOrders = async () => {
    try {
        allOrders = await apiRequest('/orders/admin/all', 'GET', null, true);
        renderOrders();
        updateMetrics();
    } catch (err) {
        ordersListView.innerHTML = `<div class="table-loading">Failed to load customer orders: ${esc(err.message)}</div>`;
    }
};

const renderOrders = () => {
    const query = orderSearchInput.value.toLowerCase().trim();
    const statusFilter = orderStatusFilter.value;

    const filtered = allOrders.filter(o => {
        const matchesQuery = !query ||
            String(o.id).includes(query) ||
            (o.user_name && o.user_name.toLowerCase().includes(query)) ||
            (o.user_email && o.user_email.toLowerCase().includes(query)) ||
            (o.shipping_address && o.shipping_address.toLowerCase().includes(query));
        const matchesStatus = !statusFilter || o.status === statusFilter;
        return matchesQuery && matchesStatus;
    });

    if (filtered.length === 0) {
        ordersListView.innerHTML = '<div class="table-loading">No customer orders found matching your filters.</div>';
        return;
    }

    ordersListView.innerHTML = filtered.map(order => {
        const isCod = order.payment_method === 'cod';
        const payBadgeClass = isCod ? 'cod' : 'card';
        const payBadgeText  = isCod ? '💵 Cash on Delivery' : '💳 Paid by Card (Stripe)';

        const itemsList = Array.isArray(order.items) ? order.items : [];

        return `
            <div class="order-admin-card" id="order-card-${order.id}">
                <div class="order-card-header">
                    <div class="order-id-group">
                        <div>
                            <span class="order-id-text">Order #${order.id}</span>
                            <div class="order-date-text">${formatDate(order.created_at)}</div>
                        </div>
                    </div>

                    <div class="order-card-meta">
                        <span class="pay-method-badge ${payBadgeClass}">${payBadgeText}</span>
                        
                        <div class="status-select-wrap">
                            <select class="status-dropdown ${order.status}" 
                                onchange="changeOrderStatus(${order.id}, this.value, this)">
                                <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>⏳ Pending</option>
                                <option value="paid" ${order.status === 'paid' ? 'selected' : ''}>💳 Paid</option>
                                <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>🚚 Shipped</option>
                                <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>✅ Delivered</option>
                                <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>❌ Cancelled</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="order-card-body">
                    <!-- Customer Information -->
                    <div class="customer-info-box">
                        <span class="customer-name">👤 ${esc(order.user_name || 'Customer #' + order.user_id)}</span>
                        <span class="customer-email">✉️ ${esc(order.user_email || 'No email')}</span>
                        <div class="customer-address">
                            <strong>Shipping Destination:</strong><br>
                            ${esc(order.shipping_address || 'No address provided')}
                        </div>
                    </div>

                    <!-- Ordered Items Preview -->
                    <div class="order-items-preview">
                        ${itemsList.map(item => `
                            <div class="order-item-row">
                                <img src="${esc(item.product_image || 'images/nebula_keyboard.jpg')}" 
                                     alt="" class="order-item-thumb" 
                                     onerror="this.src='images/nebula_keyboard.jpg'">
                                <span class="order-item-title">${esc(item.product_name || 'Product')}</span>
                                <span class="order-item-qty">×${item.quantity}</span>
                                <span class="order-item-price">${money(item.price_at_purchase * item.quantity)}</span>
                            </div>
                        `).join('')}

                        <div class="order-card-total">
                            <span>Total Bill:</span>
                            <strong>${money(order.total_amount)}</strong>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
};

orderSearchInput.addEventListener('input', renderOrders);
orderStatusFilter.addEventListener('change', renderOrders);

// Change order status live
window.changeOrderStatus = async (orderId, newStatus, selectEl) => {
    try {
        selectEl.disabled = true;
        await apiRequest(`/orders/admin/${orderId}/status`, 'PUT', { status: newStatus }, true);
        
        // Update local object
        const target = allOrders.find(o => o.id === orderId);
        if (target) target.status = newStatus;

        // Update dropdown class colors
        selectEl.className = `status-dropdown ${newStatus}`;
        selectEl.disabled = false;

        showToast(`Order #${orderId} marked as ${newStatus}!`);
        updateMetrics();
    } catch (err) {
        showToast(err.message || 'Status update failed', 'error');
        selectEl.disabled = false;
    }
};

/* ================================================================
   LOW-STOCK ALERTS & QUICK RESTOCK
   ================================================================ */
if (filterLowStockBtn) {
    filterLowStockBtn.addEventListener('click', () => {
        filterLowStockOnly = !filterLowStockOnly;
        switchTab('products');
        filterLowStockBtn.classList.toggle('active', filterLowStockOnly);
        filterLowStockBtn.innerHTML = filterLowStockOnly 
            ? '✓ Showing Low Stock' 
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg> Filter Low Stock';
        renderProducts();
    });
}

const openRestockHub = () => {
    if (!restockModal || !restockItemsContainer) return;
    const lowItems = allProducts.filter(p => (p.stock_quantity ?? 0) <= 5);
    const itemsToShow = lowItems.length > 0 ? lowItems : allProducts;

    if (!itemsToShow.length) {
        restockItemsContainer.innerHTML = '<div class="table-loading">No products available in catalog.</div>';
    } else {
        restockItemsContainer.innerHTML = itemsToShow.map(p => {
            const stock = p.stock_quantity ?? 0;
            return `
                <div class="restock-row">
                    <div class="restock-prod-info">
                        <img src="${esc(p.image_url || 'images/nebula_keyboard.jpg')}" alt="" class="restock-prod-img" onerror="this.src='images/nebula_keyboard.jpg'">
                        <div class="restock-prod-meta">
                            <div class="restock-prod-name">${esc(p.name)}</div>
                            <div class="restock-prod-stock">Current Stock: <strong>${stock} units</strong> ${stock <= 5 ? '(Low)' : ''}</div>
                        </div>
                    </div>
                    <div class="restock-actions">
                        <button type="button" class="restock-btn-pill" onclick="quickRestockProduct(${p.id}, 5, this)">+5</button>
                        <button type="button" class="restock-btn-pill" onclick="quickRestockProduct(${p.id}, 10, this)">+10</button>
                        <button type="button" class="restock-btn-pill" onclick="quickRestockProduct(${p.id}, 25, this)">+25</button>
                    </div>
                </div>
            `;
        }).join('');
    }
    restockModal.hidden = false;
};

if (openRestockHubBtn) {
    openRestockHubBtn.addEventListener('click', openRestockHub);
}
if (closeRestockModalBtn) {
    closeRestockModalBtn.addEventListener('click', () => {
        restockModal.hidden = true;
    });
}

// 1-Click Quick Restock API Handler
window.quickRestockProduct = async (id, delta, btnEl) => {
    try {
        if (btnEl) btnEl.disabled = true;
        const res = await apiRequest(`/products/${id}/stock`, 'PATCH', { delta }, true);
        const target = allProducts.find(p => p.id === id);
        if (target && res.product) {
            target.stock_quantity = res.product.stock_quantity;
        }
        renderProducts();
        updateMetrics();
        if (restockModal && !restockModal.hidden) {
            openRestockHub();
        }
        showToast(`Stock updated: +${delta} units for ${target?.name || 'product'}!`, 'info');
    } catch (err) {
        showToast(err.message || 'Failed to update stock', 'error');
        if (btnEl) btnEl.disabled = false;
    }
};

/* ================================================================
   ANALYTICS & INSIGHTS
   ================================================================ */
const fetchAnalytics = async () => {
    try {
        const data = await apiRequest('/orders/admin/analytics', 'GET', null, true);
        const { overview = {}, topProducts = [], categoryStats = [] } = data;

        // KPI calculations
        if (kpiAov) kpiAov.textContent = money(overview.avg_order_value || 0);

        const delivered = overview.delivered_orders || 0;
        const totalValid = (overview.total_orders || 0) - (overview.cancelled_orders || 0);
        const rate = totalValid > 0 ? Math.round((delivered / totalValid) * 100) : 0;
        if (kpiFulfillment) kpiFulfillment.textContent = `${rate}%`;
        if (kpiDeliveredCount) kpiDeliveredCount.textContent = delivered;
        if (kpiTotalOrders) kpiTotalOrders.textContent = totalValid;

        if (kpiCodRevenue) kpiCodRevenue.textContent = money(overview.cod_revenue || 0);
        if (kpiCodCount) kpiCodCount.textContent = overview.cod_count || 0;

        if (kpiCardRevenue) kpiCardRevenue.textContent = money(overview.card_revenue || 0);
        if (kpiCardCount) kpiCardCount.textContent = overview.card_count || 0;

        // Delivery Area Progress Bars
        const insideCount = overview.inside_dhaka_count || 0;
        const outsideCount = overview.outside_dhaka_count || 0;
        const totalAreaOrders = insideCount + outsideCount || 1;
        const insidePct = Math.round((insideCount / totalAreaOrders) * 100);
        const outsidePct = 100 - insidePct;

        if (distInsideDhaka) distInsideDhaka.textContent = `${insideCount} orders (${insidePct}%)`;
        if (barInsideDhaka) barInsideDhaka.style.width = `${insidePct}%`;

        if (distOutsideDhaka) distOutsideDhaka.textContent = `${outsideCount} orders (${outsidePct}%)`;
        if (barOutsideDhaka) barOutsideDhaka.style.width = `${outsidePct}%`;

        // Payment Methods Split Progress Bars
        const codCount = overview.cod_count || 0;
        const cardCount = overview.card_count || 0;
        const totalPayOrders = codCount + cardCount || 1;
        const codPct = Math.round((codCount / totalPayOrders) * 100);
        const cardPct = 100 - codPct;

        if (distCod) distCod.textContent = `${codCount} orders (${codPct}%)`;
        if (barCod) barCod.style.width = `${codPct}%`;

        if (distCard) distCard.textContent = `${cardCount} orders (${cardPct}%)`;
        if (barCard) barCard.style.width = `${cardPct}%`;

        // Top Selling Products Leaderboard
        if (topProductsList) {
            if (!topProducts.length) {
                topProductsList.innerHTML = '<div class="table-loading">No sales recorded yet.</div>';
            } else {
                topProductsList.innerHTML = topProducts.map((p, idx) => `
                    <div class="top-product-item">
                        <div class="top-prod-left">
                            <span class="top-prod-rank">#${idx + 1}</span>
                            <img src="${esc(p.image_url || 'images/nebula_keyboard.jpg')}" alt="" class="top-prod-img" onerror="this.src='images/nebula_keyboard.jpg'">
                            <div class="top-prod-info">
                                <div class="top-prod-name">${esc(p.name)}</div>
                                <div class="top-prod-meta">${esc(p.category || 'Gear')} • Stock: ${p.stock_quantity ?? 0}</div>
                            </div>
                        </div>
                        <div class="top-prod-right">
                            <div class="top-prod-sold">${p.total_sold} Sold</div>
                            <div class="top-prod-rev">${money(p.total_revenue)}</div>
                        </div>
                    </div>
                `).join('');
            }
        }

        // Category Performance List
        if (categoryBreakdownList) {
            if (!categoryStats.length) {
                categoryBreakdownList.innerHTML = '<div class="table-loading">No categories found.</div>';
            } else {
                categoryBreakdownList.innerHTML = categoryStats.map((c) => {
                    const fillWidth = Math.min(100, Math.max(8, (c.units_sold * 25) || (c.product_count * 15)));
                    return `
                        <div class="cat-breakdown-item">
                            <div class="cat-labels">
                                <span class="cat-name-badge">
                                    <span>${esc(c.category)}</span>
                                    <span class="cat-count">(${c.product_count} items, ${c.units_sold} sold)</span>
                                </span>
                                <span class="cat-rev">${money(c.category_revenue)}</span>
                            </div>
                            <div class="progress-bar-track">
                                <div class="progress-bar-fill progress-bar-inside" style="width: ${fillWidth}%"></div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }
    } catch (err) {
        console.error('Failed to load analytics:', err);
    }
};

/* ================================================================
   INITIALIZATION
   ================================================================ */
fetchProducts();
fetchOrders();
fetchAnalytics();
