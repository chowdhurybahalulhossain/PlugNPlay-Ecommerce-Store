/* ================================================================
   wishlist.js — Wishlist Controller
   Handles fetching saved products, 1-click move to cart, and removal.
   ================================================================ */

const gridEl = document.getElementById('wishlistGrid');
const emptyEl = document.getElementById('wishlistEmpty');
const headerActions = document.getElementById('wishlistHeaderActions');
const moveAllBtn = document.getElementById('moveAllToCartBtn');

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));
const money = (n) => '৳' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });

let wishlistItems = [];

const showSignInPrompt = (title = 'Sign in to view your Wishlist', subtitle = 'Sign in to your PlugNPlay account to save gear, track favorites, and move them to cart with one click.') => {
    gridEl.innerHTML = '';
    emptyEl.hidden = false;
    const h2 = emptyEl.querySelector('h2');
    const p = emptyEl.querySelector('p');
    const cta = emptyEl.querySelector('a');
    if (h2) h2.textContent = title;
    if (p) p.textContent = subtitle;
    if (cta) {
        cta.textContent = 'Sign In to Account';
        cta.href = 'login.html';
    }
    if (headerActions) headerActions.hidden = true;
};

const loadWishlist = async () => {
    if (!getToken()) {
        showSignInPrompt();
        return;
    }

    try {
        wishlistItems = await apiRequest('/wishlist', 'GET', null, true);
        renderWishlist();
        updateWishlistCount();
    } catch (err) {
        if (err.message && err.message.toLowerCase().includes('token')) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            showSignInPrompt('Your session has expired', 'Please sign in again to access your saved hardware and favorites.');
            if (typeof initAuthLink === 'function') initAuthLink();
            return;
        }
        gridEl.innerHTML = `<div class="table-loading">Failed to load wishlist: ${esc(err.message)}</div>`;
        if (headerActions) headerActions.hidden = true;
    }
};

const renderWishlist = () => {
    if (!wishlistItems || wishlistItems.length === 0) {
        gridEl.innerHTML = '';
        emptyEl.hidden = false;
        if (headerActions) headerActions.hidden = true;
        return;
    }

    emptyEl.hidden = true;
    if (headerActions) headerActions.hidden = false;

    gridEl.innerHTML = wishlistItems.map((p) => {
        const stock = p.stock_quantity ?? 0;
        let stockTag = '<span class="wishlist-stock-tag in">In Stock</span>';
        if (stock === 0) {
            stockTag = '<span class="wishlist-stock-tag out">Sold Out</span>';
        } else if (stock <= 5) {
            stockTag = `<span class="wishlist-stock-tag low">Only ${stock} left</span>`;
        }

        const imgSrc = p.image_url || 'images/nebula_keyboard.jpg';

        return `
            <article class="wishlist-card" id="wishlist-card-${p.id}">
                <div class="wishlist-card-art">
                    <img src="${esc(imgSrc)}" alt="${esc(p.name)}" class="wishlist-card-img" onerror="this.src='images/nebula_keyboard.jpg'">
                    ${stockTag}
                    <button type="button" class="wishlist-remove-btn" title="Remove from wishlist" onclick="handleRemoveFromWishlist(${p.id})">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="wishlist-card-body">
                    <p class="wishlist-cat">${esc(p.category || 'Gear')}</p>
                    <a href="product.html?id=${p.id}" class="wishlist-prod-title">${esc(p.name)}</a>
                    <div class="wishlist-price">${money(p.price)}</div>

                    <div class="wishlist-card-actions">
                        <button type="button" class="btn-move-cart" ${stock <= 0 ? 'disabled' : ''} onclick="handleMoveToCart(${p.id})">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1rem; height:1rem;">
                                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                            </svg>
                            ${stock <= 0 ? 'Out of Stock' : 'Move to Cart'}
                        </button>
                    </div>
                </div>
            </article>
        `;
    }).join('');
};

window.handleRemoveFromWishlist = async (productId) => {
    try {
        await apiRequest(`/wishlist/${productId}`, 'DELETE', null, true);
        wishlistItems = wishlistItems.filter(p => p.id !== productId);
        renderWishlist();
        updateWishlistCount();
        showToast('Removed from your wishlist', 'info');
    } catch (err) {
        showToast(err.message || 'Failed to remove', 'error');
    }
};

window.handleMoveToCart = async (productId) => {
    try {
        await apiRequest('/cart', 'POST', { productId, quantity: 1 }, true);
        updateCartCount(true);
        showToast('Added to your cart!', 'info');
    } catch (err) {
        showToast(err.message || 'Failed to add to cart', 'error');
    }
};

if (moveAllBtn) {
    moveAllBtn.addEventListener('click', async () => {
        const availableItems = wishlistItems.filter(p => (p.stock_quantity ?? 0) > 0);
        if (!availableItems.length) {
            showToast('No in-stock items to move', 'info');
            return;
        }

        moveAllBtn.disabled = true;
        moveAllBtn.textContent = 'Moving items…';

        try {
            for (const item of availableItems) {
                await apiRequest('/cart', 'POST', { productId: item.id, quantity: 1 }, true);
            }
            updateCartCount(true);
            showToast(`Moved ${availableItems.length} items to your cart!`, 'info');
        } catch (err) {
            showToast(err.message || 'Error moving items', 'error');
        } finally {
            moveAllBtn.disabled = false;
            moveAllBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1rem;height:1rem;"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                Move All to Cart
            `;
        }
    });
}

// Init
loadWishlist();
