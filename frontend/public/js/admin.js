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

const tabBtnProducts    = document.getElementById('tabBtnProducts');
const tabBtnOrders      = document.getElementById('tabBtnOrders');
const tabPanelProducts  = document.getElementById('tabPanelProducts');
const tabPanelOrders    = document.getElementById('tabPanelOrders');
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

const deleteModal       = document.getElementById('deleteModal');
const deleteModalText   = document.getElementById('deleteModalText');
const confirmDeleteBtn  = document.getElementById('confirmDeleteBtn');

/* ================================================================
   TABS SWITCHING
   ================================================================ */
const switchTab = (tabName) => {
    currentTab = tabName;
    const isProd = tabName === 'products';

    tabBtnProducts.classList.toggle('active', isProd);
    tabBtnProducts.setAttribute('aria-selected', isProd);
    tabPanelProducts.hidden = !isProd;

    tabBtnOrders.classList.toggle('active', !isProd);
    tabBtnOrders.setAttribute('aria-selected', !isProd);
    tabPanelOrders.hidden = isProd;
};

tabBtnProducts.addEventListener('click', () => switchTab('products'));
tabBtnOrders.addEventListener('click', () => switchTab('orders'));

/* ================================================================
   METRICS CALCULATION
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
    const lowStockCount = allProducts.filter(p => (p.stock_quantity ?? 0) <= 5).length;
    metricLowStock.textContent = lowStockCount;
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
        return matchesQuery && matchesCat;
    });

    if (filtered.length === 0) {
        productsTableBody.innerHTML = '<tr><td colspan="6" class="table-loading">No products found matching your search.</td></tr>';
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
                    <span class="stock-badge ${stockClass}">${stockLabel}</span>
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
   INITIALIZATION
   ================================================================ */
fetchProducts();
fetchOrders();
