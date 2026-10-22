/* ================================================================
   home.js — Storefront Controller
   Handles live product catalog, multi-criteria filtering, price filters,
   in-stock toggle, sorting, and interactive product cards.
   ================================================================ */

const gridEl          = document.getElementById('productGrid');
const chipsEl         = document.getElementById('chips');
const countEl         = document.getElementById('resultCount');
const navSearchEl     = document.getElementById('searchInput');
const shopSearchEl    = document.getElementById('shopSearchInput');
const clearSearchBtn  = document.getElementById('clearSearchBtn');
const sortEl          = document.getElementById('sortSelect');
const inStockToggle   = document.getElementById('inStockToggle');
const pricePillsEl    = document.getElementById('pricePills');
const activeBarEl     = document.getElementById('activeFiltersBar');
const activeTagsEl    = document.getElementById('activeTags');
const resetFiltersBtn = document.getElementById('resetFiltersBtn');

const quickView = document.getElementById('quickView');
const qvArt     = document.getElementById('qvArt');
const qvCat     = document.getElementById('qvCat');
const qvName    = document.getElementById('qvName');
const qvDesc    = document.getElementById('qvDesc');
const qvStock   = document.getElementById('qvStock');
const qvPrice   = document.getElementById('qvPrice');
const qvQty     = document.getElementById('qvQty');
const qvAdd     = document.getElementById('qvAdd');

// Store Filter State
const state = {
    products: [],
    category: 'All',
    sort: 'new',
    query: '',
    minPrice: 0,
    maxPrice: Infinity,
    priceLabel: 'All Prices',
    inStockOnly: false
};

let selected = null;
let qty = 1;
let ratingsMap = {};
let wishlistIds = new Set();

// Escaper & Money Formatter
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));
const money = (n) => '৳' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

const svg = (inner) => `<svg viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
const ICONS = {
    keyboard: svg('<rect x="8" y="26" width="80" height="44" rx="8"/><path d="M20 40h4M32 40h4M44 40h4M56 40h4M68 40h8M20 50h8M36 50h4M48 50h4M60 50h4M72 50h4M28 60h40"/>'),
    mouse:    svg('<rect x="30" y="14" width="36" height="68" rx="18"/><path d="M48 14v24M30 38h36"/>'),
    audio:    svg('<path d="M18 58V48a30 30 0 0 1 60 0v10"/><rect x="14" y="54" width="14" height="24" rx="6"/><rect x="68" y="54" width="14" height="24" rx="6"/>'),
    chip:     svg('<rect x="26" y="26" width="44" height="44" rx="8"/><rect x="38" y="38" width="20" height="20" rx="3"/><path d="M38 14v12M58 14v12M38 70v12M58 70v12M14 38h12M14 58h12M70 38h12M70 58h12"/>')
};

const iconFor = (p) => {
    const text = `${p.name} ${p.category}`.toLowerCase();
    if (/keyboard/.test(text)) return ICONS.keyboard;
    if (/mouse/.test(text))    return ICONS.mouse;
    if (/head|ear|audio|speaker/.test(text)) return ICONS.audio;
    return ICONS.chip;
};

// Filtered & Sorted Products
const visibleProducts = () => {
    const q = state.query.trim().toLowerCase();

    const list = state.products.filter((p) => {
        // Category filter
        const matchCat = state.category === 'All' || p.category === state.category;

        // Search query filter
        const matchQuery = !q || `${p.name} ${p.category} ${p.description || ''}`.toLowerCase().includes(q);

        // Price filter
        const price = parseFloat(p.price || 0);
        const matchPrice = price >= state.minPrice && price <= state.maxPrice;

        // In-stock only filter
        const matchStock = !state.inStockOnly || (p.stock_quantity ?? 0) > 0;

        return matchCat && matchQuery && matchPrice && matchStock;
    });

    // Sorting
    if (state.sort === 'low')   list.sort((a, b) => a.price - b.price);
    if (state.sort === 'high')  list.sort((a, b) => b.price - a.price);
    if (state.sort === 'alpha') list.sort((a, b) => a.name.localeCompare(b.name));
    if (state.sort === 'new')   list.sort((a, b) => b.id - a.id);

    return list;
};

const stockTag = (p) => {
    if (p.stock_quantity <= 0) return '<span class="tag">Sold out</span>';
    if (p.stock_quantity <= 5) return `<span class="tag">Only ${p.stock_quantity} left</span>`;
    return '';
};

const imageOrIcon = (p) => {
    if (p.image_url) {
        return `<img src="${esc(p.image_url)}" alt="${esc(p.name)}" class="card-img" loading="lazy">`;
    }
    return iconFor(p);
};

const cardHTML = (p) => {
    const inWishlist = wishlistIds.has(p.id);
    const r = ratingsMap[p.id];
    const ratingHtml = r && r.total_reviews > 0
        ? `<div class="card-stars"><span class="star-icon">★</span> <strong>${r.avg_rating}</strong> <span class="card-rev-count">(${r.total_reviews})</span></div>`
        : `<div class="card-stars new"><span class="star-icon">★</span> <strong>5.0</strong> <span class="card-rev-count">(Verified)</span></div>`;

    return `
    <article class="card" data-id="${p.id}" tabindex="0" style="cursor: pointer;">
        ${stockTag(p)}
        <button type="button" class="btn-card-heart ${inWishlist ? 'active' : ''}" data-wishlist-id="${p.id}" title="${inWishlist ? 'Remove from wishlist' : 'Save to wishlist'}" aria-label="Save to wishlist">
            <svg viewBox="0 0 24 24" fill="${inWishlist ? '#f43f5e' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
        </button>
        <div class="card-art">${imageOrIcon(p)}</div>
        <div class="card-body">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <p class="cat">${esc(p.category)}</p>
                ${ratingHtml}
            </div>
            <h3>${esc(p.name)}</h3>
            <div class="card-foot">
                <span class="price">${money(p.price)}</span>
                <button class="btn-add" data-add="${p.id}" ${p.stock_quantity <= 0 ? 'disabled' : ''}>Add</button>
            </div>
        </div>
    </article>`;
};

// Render Category Chips with Live Counts
const renderChips = () => {
    const rawCategories = state.products.map((p) => p.category).filter(Boolean);
    const uniqueCats = ['All', ...new Set(rawCategories)];

    chipsEl.innerHTML = uniqueCats.map((c) => {
        const count = c === 'All'
            ? state.products.length
            : state.products.filter(p => p.category === c).length;
        return `
            <button class="chip ${c === state.category ? 'active' : ''}" data-cat="${esc(c)}">
                ${esc(c)}
                <span class="chip-count">${count}</span>
            </button>
        `;
    }).join('');
};

// Render Active Filter Tags
const renderActiveTags = () => {
    const tags = [];

    if (state.category !== 'All') {
        tags.push({ label: `Category: ${state.category}`, clear: () => { state.category = 'All'; renderChips(); } });
    }
    if (state.query) {
        tags.push({ label: `Search: "${state.query}"`, clear: () => setQuery('') });
    }
    if (state.priceLabel !== 'All Prices') {
        tags.push({ label: `Price: ${state.priceLabel}`, clear: () => resetPriceFilter() });
    }
    if (state.inStockOnly) {
        tags.push({ label: 'In Stock Only', clear: () => toggleInStock(false) });
    }

    if (tags.length === 0) {
        activeBarEl.hidden = true;
        activeTagsEl.innerHTML = '';
        return;
    }

    activeBarEl.hidden = false;
    activeTagsEl.innerHTML = tags.map((t, idx) => `
        <span class="active-tag-chip">
            ${esc(t.label)}
            <button type="button" data-tag-idx="${idx}" aria-label="Remove filter">&times;</button>
        </span>
    `).join('');

    // Attach clear event listeners to active tags
    activeTagsEl.querySelectorAll('button').forEach((btn) => {
        btn.addEventListener('click', () => {
            const idx = Number(btn.dataset.tagIdx);
            if (tags[idx]) tags[idx].clear();
            renderActiveTags();
            renderProducts();
        });
    });
};

const renderProducts = () => {
    const list = visibleProducts();
    countEl.textContent = list.length === 1 ? '1 product found' : `${list.length} products found`;

    if (!list.length) {
        gridEl.innerHTML = `
            <div class="empty" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                <p style="font-size: 1.1rem; color: var(--muted); margin-bottom: 16px;">No products match your current filters.</p>
                <button class="btn btn-ghost" id="clearAllFiltersBtn">Clear all filters</button>
            </div>`;
        return;
    }
    gridEl.innerHTML = list.map(cardHTML).join('');
};

// Sync Search Queries across both inputs
const setQuery = (val) => {
    state.query = val;
    if (shopSearchEl) shopSearchEl.value = val;
    if (navSearchEl)  navSearchEl.value = val;
    if (clearSearchBtn) clearSearchBtn.hidden = !val;
    renderActiveTags();
    renderProducts();
};

const resetPriceFilter = () => {
    state.minPrice = 0;
    state.maxPrice = Infinity;
    state.priceLabel = 'All Prices';
    pricePillsEl?.querySelectorAll('.price-pill').forEach(b => {
        b.classList.toggle('active', b.dataset.max === 'all');
    });
};

const toggleInStock = (forceValue = null) => {
    state.inStockOnly = forceValue !== null ? forceValue : !state.inStockOnly;
    inStockToggle.classList.toggle('active', state.inStockOnly);
    inStockToggle.setAttribute('aria-pressed', state.inStockOnly);
    renderActiveTags();
    renderProducts();
};

const resetAllFilters = () => {
    state.category = 'All';
    setQuery('');
    resetPriceFilter();
    toggleInStock(false);
    state.sort = 'new';
    if (sortEl) sortEl.value = 'new';
    renderChips();
    renderActiveTags();
    renderProducts();
};

// Load Initial Catalog
const loadProducts = async () => {
    gridEl.innerHTML = Array(6).fill('<div class="skeleton"></div>').join('');
    try {
        const promises = [
            apiRequest('/products'),
            apiRequest('/reviews/summary').catch(() => ({}))
        ];
        if (getToken()) {
            promises.push(apiRequest('/wishlist/ids', 'GET', null, true).catch(() => []));
        }

        const [prods, ratings, wIds = []] = await Promise.all(promises);
        state.products = prods || [];
        ratingsMap = ratings || {};
        wishlistIds = new Set(Array.isArray(wIds) ? wIds : []);

        // Support direct ?search=... URL parameters from global search or links
        const urlParams = new URLSearchParams(window.location.search);
        const searchParam = urlParams.get('search');
        if (searchParam) {
            state.query = searchParam;
            if (shopSearchEl) shopSearchEl.value = searchParam;
            if (clearSearchBtn) clearSearchBtn.hidden = false;
            setTimeout(() => {
                document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
            }, 300);
        }

        renderChips();
        renderProducts();
    } catch (err) {
        console.error(err);
        gridEl.innerHTML = '<div class="empty" style="grid-column: 1 / -1;"><p>Could not load products. Check that the server is running.</p><button class="btn btn-ghost" id="retryLoad">Try again</button></div>';
    }
};

const addToCart = async (productId, quantity = 1) => {
    if (!getToken()) {
        showToast('Sign in to add items to your cart', 'error');
        setTimeout(() => { window.location.href = 'login.html'; }, 1100);
        return false;
    }
    try {
        await apiRequest('/cart', 'POST', { productId, quantity }, true);
        showToast('Added to cart');
        updateCartCount(true);
        return true;
    } catch (err) {
        showToast(err.message, 'error');
        return false;
    }
};

// ---------- Quick view Modal ----------
const openQuickView = (id) => {
    selected = state.products.find((p) => p.id === id);
    if (!selected) return;
    qty = 1;
    qvArt.innerHTML = imageOrIcon(selected);
    qvCat.textContent = selected.category || '';
    qvName.textContent = selected.name;
    qvDesc.textContent = selected.description || 'No description yet.';
    qvPrice.textContent = money(selected.price);
    qvStock.textContent = selected.stock_quantity > 0 ? `${selected.stock_quantity} in stock` : 'Sold out';
    qvAdd.disabled = selected.stock_quantity <= 0;
    qvQty.textContent = qty;
    quickView.showModal();
};

document.getElementById('qvMinus')?.addEventListener('click', () => {
    qty = Math.max(1, qty - 1);
    qvQty.textContent = qty;
});
document.getElementById('qvPlus')?.addEventListener('click', () => {
    qty = Math.min(selected.stock_quantity, qty + 1);
    qvQty.textContent = qty;
});
qvAdd?.addEventListener('click', async () => {
    if (await addToCart(selected.id, qty)) quickView.close();
});
document.getElementById('qvClose')?.addEventListener('click', () => quickView.close());
quickView?.addEventListener('click', (e) => { if (e.target === quickView) quickView.close(); });

// ---------- Event Listeners ----------

// Quick Jump Category Pills in Hero
document.querySelectorAll('.hero-pill').forEach(pill => {
    pill.addEventListener('click', () => {
        const cat = pill.dataset.jumpCat;
        if (!cat) return;
        state.category = cat;
        renderChips();
        renderActiveTags();
        renderProducts();
        document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
    });
});

// Category Chips
chipsEl.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    state.category = chip.dataset.cat;
    renderChips();
    renderActiveTags();
    renderProducts();
});

// Price Pills
pricePillsEl?.addEventListener('click', (e) => {
    const pill = e.target.closest('.price-pill');
    if (!pill) return;

    pricePillsEl.querySelectorAll('.price-pill').forEach(b => b.classList.remove('active'));
    pill.classList.add('active');

    const min = pill.dataset.min ? parseFloat(pill.dataset.min) : 0;
    const max = pill.dataset.max === 'all' ? Infinity : (pill.dataset.max ? parseFloat(pill.dataset.max) : Infinity);

    state.minPrice = min;
    state.maxPrice = max;
    state.priceLabel = pill.textContent.trim();

    renderActiveTags();
    renderProducts();
});

// In Stock Toggle
inStockToggle?.addEventListener('click', () => toggleInStock());

// In-Shop Live Search Popover & Autocomplete
const shopSearchBox = document.querySelector('.shop-search-box');
let shopPopover = null;
if (shopSearchBox) {
    shopPopover = document.createElement('div');
    shopPopover.className = 'shop-search-popover';
    shopPopover.id = 'shopSearchPopover';
    shopPopover.hidden = true;
    shopSearchBox.appendChild(shopPopover);
}

const renderShopPopover = (query) => {
    if (!shopPopover) return;
    const q = (query || '').trim().toLowerCase();
    if (!q || q.length < 2) {
        shopPopover.hidden = true;
        return;
    }

    const matches = state.products.filter(p => {
        const text = `${p.name} ${p.category} ${p.description || ''}`.toLowerCase();
        return text.includes(q);
    }).slice(0, 4);

    if (matches.length === 0) {
        shopPopover.hidden = true;
        return;
    }

    const highlightMatch = (text, term) => {
        const escText = esc(text);
        if (!term) return escText;
        const escaped = term.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return escText.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>');
    };

    shopPopover.innerHTML = matches.map((p) => {
        const r = ratingsMap[p.id];
        const rating = r ? Number(r.avg_rating).toFixed(1) : '5.0';
        return `
            <a href="product.html?id=${p.id}" class="search-result-item" style="padding: 8px 10px;">
                <div class="search-item-art" style="width: 40px; height: 40px;">
                    ${p.image_url ? `<img src="${esc(p.image_url)}" alt="${esc(p.name)}">` : imageOrIcon(p)}
                </div>
                <div class="search-item-info">
                    <div class="search-item-meta">
                        <span class="search-item-cat">${esc(p.category)}</span>
                        <span class="search-item-stars">★ ${rating}</span>
                    </div>
                    <h4 class="search-item-title" style="font-size: 0.88rem;">${highlightMatch(p.name, q)}</h4>
                </div>
                <div class="search-item-right">
                    <span class="search-item-price" style="font-size: 0.9rem;">${money(p.price)}</span>
                </div>
            </a>`;
    }).join('') + `
        <a href="#shop" class="popover-view-all" onclick="document.getElementById('shopSearchPopover').hidden=true;">
            View all matching items in catalog ↓
        </a>`;

    shopPopover.hidden = false;
};

document.addEventListener('click', (e) => {
    if (shopPopover && !shopSearchBox?.contains(e.target)) {
        shopPopover.hidden = true;
    }
});

// Live Search Inputs (Shop & Nav)
shopSearchEl?.addEventListener('input', (e) => {
    setQuery(e.target.value);
    renderShopPopover(e.target.value);
});
navSearchEl?.addEventListener('input', (e) => setQuery(e.target.value));

clearSearchBtn?.addEventListener('click', () => {
    setQuery('');
    if (shopPopover) shopPopover.hidden = true;
});
resetFiltersBtn?.addEventListener('click', resetAllFilters);

// Sort dropdown
sortEl?.addEventListener('change', () => {
    state.sort = sortEl.value;
    renderProducts();
});

// Grid Events: Card Click, Add to Cart, Clear Filters, Wishlist
gridEl.addEventListener('click', (e) => {
    if (e.target.closest('#retryLoad')) return loadProducts();
    if (e.target.closest('#clearAllFiltersBtn')) return resetAllFilters();

    const wishlistBtn = e.target.closest('[data-wishlist-id]');
    if (wishlistBtn) {
        e.stopPropagation();
        const pId = Number(wishlistBtn.dataset.wishlistId);
        window.toggleWishlist(pId, wishlistBtn).then((inW) => {
            if (typeof inW === 'boolean') {
                if (inW) wishlistIds.add(pId);
                else wishlistIds.delete(pId);
                const svgEl = wishlistBtn.querySelector('svg');
                if (svgEl) svgEl.setAttribute('fill', inW ? '#f43f5e' : 'none');
            }
        });
        return;
    }

    const addBtn = e.target.closest('[data-add]');
    if (addBtn) return addToCart(Number(addBtn.dataset.add));

    const card = e.target.closest('.card');
    if (card) {
        window.location.href = `product.html?id=${card.dataset.id}`;
    }
});

gridEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.classList.contains('card')) {
        window.location.href = `product.html?id=${e.target.dataset.id}`;
    }
});

// 3D Tilt on Product Cards
const canTilt = matchMedia('(hover: hover)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches;
if (canTilt) {
    gridEl.addEventListener('pointermove', (e) => {
        const card = e.target.closest('.card');
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        card.style.setProperty('--ry', `${((x - 0.5) * 8).toFixed(2)}deg`);
        card.style.setProperty('--rx', `${((0.5 - y) * 8).toFixed(2)}deg`);
        card.style.setProperty('--gx', `${x * 100}%`);
        card.style.setProperty('--gy', `${y * 100}%`);
    });
    gridEl.addEventListener('pointerout', (e) => {
        const card = e.target.closest('.card');
        if (card && !card.contains(e.relatedTarget)) {
            card.style.setProperty('--rx', '0deg');
            card.style.setProperty('--ry', '0deg');
        }
    });
}

// Initial Catalog Load
loadProducts();