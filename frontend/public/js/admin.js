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
const metricExpense     = document.getElementById('metricExpense');
const metricProfit      = document.getElementById('metricProfit');
const metricOrders      = document.getElementById('metricOrders');
const metricOrdersSub   = document.getElementById('metricOrdersSub');
const metricIncomeSub   = document.getElementById('metricIncomeSub');
const metricProfitMargin= document.getElementById('metricProfitMargin');
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

const chartStatProducts   = document.getElementById('chartStatProducts');
const chartStatStockVal   = document.getElementById('chartStatStockVal');
const chartStatSales      = document.getElementById('chartStatSales');
const chartStatOrdersCount= document.getElementById('chartStatOrdersCount');
const chartStatCost       = document.getElementById('chartStatCost');
const chartStatProfit     = document.getElementById('chartStatProfit');
const chartViewport       = document.getElementById('chartViewport');
const chartTooltip        = document.getElementById('chartTooltip');
const orderActivityFeed   = document.getElementById('orderActivityFeed');

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
let timeseriesCache = { daily: [], monthly: [], yearly: [] };
let currentTimeframe = 'daily';

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
    const expense = revenue * 0.65;
    const profit = revenue * 0.35;

    if (metricRevenue) metricRevenue.textContent = money(revenue);
    if (metricExpense) metricExpense.textContent = money(expense);
    if (metricProfit) metricProfit.textContent = money(profit);

    // Total orders count
    if (metricOrders) metricOrders.textContent = allOrders.length;
    if (metricOrdersSub) metricOrdersSub.textContent = `${validOrders.length} valid / ${allOrders.length - validOrders.length} cancelled`;
    if (metricIncomeSub) metricIncomeSub.textContent = `${validOrders.length} checkouts collected`;
    if (metricProfitMargin) metricProfitMargin.textContent = `35% net margin (৳${Math.round(profit).toLocaleString()} profit)`;

    tabCountOrders.textContent = allOrders.length;
    tabCountProducts.textContent = allProducts.length;

    // Total products count
    if (metricProducts) metricProducts.textContent = allProducts.length;

    // Low stock count (<= 5)
    const lowStockItems = allProducts.filter(p => (p.stock_quantity ?? 0) <= 5);
    if (metricLowStock) metricLowStock.textContent = lowStockItems.length;

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
   ANALYTICS & FINANCIAL REPORTS (Matching Reference UI)
   ================================================================ */
const renderInteractiveChart = (timeframe = 'daily') => {
    if (!chartViewport) return;
    const series = timeseriesCache[timeframe] || [];
    
    if (series.length === 0) {
        chartViewport.innerHTML = `
            <div style="text-align: center; color: var(--muted); padding: 2.5rem 1rem;">
                <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">📈</div>
                <div style="font-size: 1.05rem; font-weight: 700; color: var(--text);">No ${timeframe} sales data recorded yet</div>
                <div style="font-size: 0.82rem; margin-top: 0.25rem;">Data points populate automatically as customers complete checkouts.</div>
            </div>`;
        return;
    }

    // Chart dimensions
    const width = 800;
    const height = 240;
    const padX = 55;
    const padY = 30;
    const innerW = width - padX * 2;
    const innerH = height - padY * 2;

    const maxVal = Math.max(...series.map(p => Math.max(p.revenue, p.profit, 100)), 1000);
    const n = series.length;

    // Helper for coordinates
    const getX = (idx) => n === 1 ? padX + innerW / 2 : padX + (idx / (n - 1)) * innerW;
    const getY = (val) => padY + innerH - (val / maxVal) * innerH;

    // Build SVG paths for Sales & Profit
    const salesCoords = series.map((p, i) => ({ x: getX(i), y: getY(p.revenue), ...p }));
    const profitCoords = series.map((p, i) => ({ x: getX(i), y: getY(p.profit), ...p }));

    // Generate smooth bezier curve path string
    const buildPath = (coords) => {
        if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;
        let d = `M ${coords[0].x} ${coords[0].y}`;
        for (let i = 1; i < coords.length; i++) {
            const prev = coords[i - 1];
            const curr = coords[i];
            const cp1x = prev.x + (curr.x - prev.x) / 2;
            const cp1y = prev.y;
            const cp2x = prev.x + (curr.x - prev.x) / 2;
            const cp2y = curr.y;
            d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
        }
        return d;
    };

    const salesPathStr = buildPath(salesCoords);
    const profitPathStr = buildPath(profitCoords);

    const bottomY = padY + innerH;
    const salesAreaStr = `${salesPathStr} L ${salesCoords[salesCoords.length - 1].x} ${bottomY} L ${salesCoords[0].x} ${bottomY} Z`;
    const profitAreaStr = `${profitPathStr} L ${profitCoords[profitCoords.length - 1].x} ${bottomY} L ${profitCoords[0].x} ${bottomY} Z`;

    // Horizontal grid lines
    const gridSteps = 4;
    let gridLinesSvg = '';
    for (let s = 0; s <= gridSteps; s++) {
        const val = (maxVal / gridSteps) * s;
        const y = getY(val);
        const label = val >= 1000 ? `৳${Math.round(val / 1000)}k` : `৳${Math.round(val)}`;
        gridLinesSvg += `
            <line x1="${padX}" y1="${y}" x2="${width - padX}" y2="${y}" stroke="rgba(255,255,255,0.08)" stroke-dasharray="3,3" />
            <text x="${padX - 8}" y="${y + 4}" fill="var(--muted)" font-size="10" text-anchor="end">${label}</text>
        `;
    }

    // X Axis labels
    let xLabelsSvg = '';
    const stepLabel = Math.max(1, Math.ceil(n / 8));
    series.forEach((p, i) => {
        if (i % stepLabel === 0 || i === n - 1) {
            const x = getX(i);
            xLabelsSvg += `<text x="${x}" y="${height - 8}" fill="var(--muted)" font-size="11" text-anchor="middle">${esc(p.label)}</text>`;
        }
    });

    // Render SVG
    chartViewport.innerHTML = `
        <svg class="interactive-chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
            <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#10b981" stop-opacity="0.45"/>
                    <stop offset="100%" stop-color="#10b981" stop-opacity="0.0"/>
                </linearGradient>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.45"/>
                    <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.0"/>
                </linearGradient>
            </defs>
            ${gridLinesSvg}
            ${xLabelsSvg}
            <path d="${salesAreaStr}" fill="url(#salesGrad)" />
            <path d="${profitAreaStr}" fill="url(#profitGrad)" />
            <path d="${salesPathStr}" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
            <path d="${profitPathStr}" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            ${salesCoords.map((c, i) => `
                <circle class="chart-point-sales" cx="${c.x}" cy="${c.y}" r="4.5" fill="#10b981" stroke="#ffffff" stroke-width="2" style="cursor:pointer;"/>
                <circle class="chart-point-profit" cx="${profitCoords[i].x}" cy="${profitCoords[i].y}" r="4" fill="#f59e0b" stroke="#ffffff" stroke-width="1.8" style="cursor:pointer;"/>
            `).join('')}
            <line id="chartGuideLine" x1="0" y1="${padY}" x2="0" y2="${bottomY}" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" stroke-dasharray="2,2" style="display:none;"/>
        </svg>
    `;

    // Interactive mouse tracking
    const svgEl = chartViewport.querySelector('.interactive-chart-svg');
    const guideLine = chartViewport.querySelector('#chartGuideLine');

    if (svgEl) {
        svgEl.addEventListener('mousemove', (e) => {
            const rect = svgEl.getBoundingClientRect();
            const relX = (e.clientX - rect.left) / rect.width;
            const svgX = relX * width;

            let closestIdx = 0;
            let minDist = Infinity;
            salesCoords.forEach((c, idx) => {
                const dist = Math.abs(c.x - svgX);
                if (dist < minDist) {
                    minDist = dist;
                    closestIdx = idx;
                }
            });

            const point = series[closestIdx];
            if (!point) return;

            if (guideLine) {
                guideLine.setAttribute('x1', salesCoords[closestIdx].x);
                guideLine.setAttribute('x2', salesCoords[closestIdx].x);
                guideLine.style.display = 'block';
            }

            if (chartTooltip) {
                const clientX = (salesCoords[closestIdx].x / width) * rect.width;
                const clientY = (salesCoords[closestIdx].y / height) * rect.height;

                chartTooltip.innerHTML = `
                    <div class="chart-tooltip-date">${esc(point.label)} (${timeframe.toUpperCase()})</div>
                    <div class="chart-tooltip-row">
                        <span style="color:#10b981; font-weight:700;">● Gross Sales:</span>
                        <strong>${money(point.revenue)}</strong>
                    </div>
                    <div class="chart-tooltip-row">
                        <span style="color:#f59e0b; font-weight:700;">● Net Profit:</span>
                        <strong>${money(point.profit)}</strong>
                    </div>
                    <div class="chart-tooltip-row">
                        <span style="color:var(--muted);">● Orders Placed:</span>
                        <span>${point.orders} orders (${point.units || 0} units)</span>
                    </div>
                `;
                chartTooltip.style.left = `${clientX}px`;
                chartTooltip.style.top = `${Math.max(10, clientY - 10)}px`;
                chartTooltip.hidden = false;
            }
        });

        svgEl.addEventListener('mouseleave', () => {
            if (guideLine) guideLine.style.display = 'none';
            if (chartTooltip) chartTooltip.hidden = true;
        });
    }
};

// Timeframe Switcher Buttons
document.querySelectorAll('.btn-timeframe').forEach((btn) => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-timeframe').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTimeframe = btn.dataset.period || 'daily';
        renderInteractiveChart(currentTimeframe);
    });
});

// Render Order Activity Stream (Matching Screenshot Bottom-Left)
const renderOrderActivity = (activities = []) => {
    if (!orderActivityFeed) return;
    if (!activities.length) {
        orderActivityFeed.innerHTML = '<div class="table-loading">No recent order activity found.</div>';
        return;
    }

    const iconMap = {
        paid: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
        delivered: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
        shipped: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
        pending: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
        cancelled: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
    };

    orderActivityFeed.innerHTML = activities.map((act) => {
        const st = (act.status || 'pending').toLowerCase();
        const iconSvg = iconMap[st] || iconMap.pending;
        const areaLabel = act.delivery_area === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka';
        const methodLabel = act.payment_method === 'cod' ? 'Cash on Delivery' : 'Stripe Card';

        return `
            <div class="activity-item">
                <div class="activity-icon-badge ${st}">
                    ${iconSvg}
                </div>
                <div class="activity-info">
                    <div class="activity-title">
                        <span>${esc(act.customer_name || 'Customer')}</span>
                        <span class="activity-order-id">#ORD-${act.id}</span>
                    </div>
                    <div class="activity-meta">
                        ${areaLabel} • ${methodLabel} • <strong style="text-transform: capitalize;">${st}</strong>
                    </div>
                </div>
                <div class="activity-right">
                    <div class="activity-amount">${money(act.total_amount)}</div>
                    <div class="activity-time">${formatDate(act.created_at)}</div>
                </div>
            </div>
        `;
    }).join('');
};

const fetchAnalytics = async () => {
    try {
        const [data, tsData] = await Promise.all([
            apiRequest('/orders/admin/analytics', 'GET', null, true),
            apiRequest('/orders/admin/timeseries', 'GET', null, true).catch(() => ({ daily: [], monthly: [], yearly: [] }))
        ]);

        timeseriesCache = tsData || { daily: [], monthly: [], yearly: [] };

        const { overview = {}, topProducts = [], categoryStats = [], recentActivity = [] } = data;

        // Chart Stat Strip
        if (chartStatProducts) chartStatProducts.textContent = `${overview.total_products_count || allProducts.length} items`;
        if (chartStatStockVal) chartStatStockVal.textContent = `${money(overview.inventory_valuation || 0)} stock value`;
        if (chartStatSales) chartStatSales.textContent = money(overview.total_revenue || 0);
        if (chartStatOrdersCount) chartStatOrdersCount.textContent = `${overview.total_orders || 0} completed orders (${overview.total_units_sold || 0} units)`;
        if (chartStatCost) chartStatCost.textContent = money(overview.total_expense || (overview.total_revenue * 0.65) || 0);
        if (chartStatProfit) chartStatProfit.textContent = money(overview.total_profit || (overview.total_revenue * 0.35) || 0);

        // Render Interactive SVG Chart
        renderInteractiveChart(currentTimeframe);

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
                topProductsList.innerHTML = topProducts.map((p, idx) => {
                    const stars = '★'.repeat(Math.round(p.avg_rating || 5)) + '☆'.repeat(5 - Math.round(p.avg_rating || 5));
                    return `
                        <div class="top-product-item">
                            <div class="top-prod-left">
                                <span class="top-prod-rank">#${idx + 1}</span>
                                <img src="${esc(p.image_url || 'images/nebula_keyboard.jpg')}" alt="" class="top-prod-img" onerror="this.src='images/nebula_keyboard.jpg'">
                                <div class="top-prod-info">
                                    <div class="top-prod-name">${esc(p.name)}</div>
                                    <div class="top-prod-meta">${esc(p.category || 'Gear')} • <span style="color:#f59e0b;">${stars}</span> • Stock: ${p.stock_quantity ?? 0}</div>
                                </div>
                            </div>
                            <div class="top-prod-right">
                                <div class="top-prod-sold">${p.total_sold} Sold</div>
                                <div class="top-prod-rev">${money(p.total_revenue)} (Profit: ${money(p.total_profit || (p.total_revenue * 0.35))})</div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }

        // Render Order Activity Stream
        renderOrderActivity(recentActivity);

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
                                <span class="cat-rev">${money(c.category_revenue)} (Profit: ${money(c.category_profit || (c.category_revenue * 0.35))})</span>
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
