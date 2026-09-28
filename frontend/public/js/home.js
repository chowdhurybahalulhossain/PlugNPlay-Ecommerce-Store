const gridEl = document.getElementById('productGrid');
const chipsEl = document.getElementById('chips');
const countEl = document.getElementById('resultCount');
const searchEl = document.getElementById('searchInput');
const sortEl = document.getElementById('sortSelect');

const quickView = document.getElementById('quickView');
const qvArt = document.getElementById('qvArt');
const qvCat = document.getElementById('qvCat');
const qvName = document.getElementById('qvName');
const qvDesc = document.getElementById('qvDesc');
const qvStock = document.getElementById('qvStock');
const qvPrice = document.getElementById('qvPrice');
const qvQty = document.getElementById('qvQty');
const qvAdd = document.getElementById('qvAdd');

const state = { products: [], category: 'All', sort: 'new', query: '' };
let selected = null;
let qty = 1;

// Escape text before putting it into HTML (product data is admin-entered)
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));
const money = (n) => '৳' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

const svg = (inner) => `<svg viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
const ICONS = {
    keyboard: svg('<rect x="8" y="26" width="80" height="44" rx="8"/><path d="M20 40h4M32 40h4M44 40h4M56 40h4M68 40h8M20 50h8M36 50h4M48 50h4M60 50h4M72 50h4M28 60h40"/>'),
    mouse: svg('<rect x="30" y="14" width="36" height="68" rx="18"/><path d="M48 14v24M30 38h36"/>'),
    audio: svg('<path d="M18 58V48a30 30 0 0 1 60 0v10"/><rect x="14" y="54" width="14" height="24" rx="6"/><rect x="68" y="54" width="14" height="24" rx="6"/>'),
    chip: svg('<rect x="26" y="26" width="44" height="44" rx="8"/><rect x="38" y="38" width="20" height="20" rx="3"/><path d="M38 14v12M58 14v12M38 70v12M58 70v12M14 38h12M14 58h12M70 38h12M70 58h12"/>')
};
const iconFor = (p) => {
    const text = `${p.name} ${p.category}`.toLowerCase();
    if (/keyboard/.test(text)) return ICONS.keyboard;
    if (/mouse/.test(text)) return ICONS.mouse;
    if (/head|ear|audio|speaker/.test(text)) return ICONS.audio;
    return ICONS.chip;
};

const visibleProducts = () => {
    const q = state.query.trim().toLowerCase();
    const list = state.products.filter((p) =>
        (state.category === 'All' || p.category === state.category) &&
        (!q || `${p.name} ${p.category} ${p.description || ''}`.toLowerCase().includes(q))
    );
    if (state.sort === 'low') list.sort((a, b) => a.price - b.price);
    if (state.sort === 'high') list.sort((a, b) => b.price - a.price);
    return list;
};

const stockTag = (p) => {
    if (p.stock_quantity <= 0) return '<span class="tag">Sold out</span>';
    if (p.stock_quantity <= 5) return `<span class="tag">Only ${p.stock_quantity} left</span>`;
    return '';
};

const cardHTML = (p) => `
    <article class="card" data-id="${p.id}" tabindex="0">
        ${stockTag(p)}
        <div class="card-art">${iconFor(p)}</div>
        <div class="card-body">
            <p class="cat">${esc(p.category)}</p>
            <h3>${esc(p.name)}</h3>
            <div class="card-foot">
                <span class="price">${money(p.price)}</span>
                <button class="btn-add" data-add="${p.id}" ${p.stock_quantity <= 0 ? 'disabled' : ''}>Add</button>
            </div>
        </div>
    </article>`;

const renderChips = () => {
    const categories = ['All', ...new Set(state.products.map((p) => p.category).filter(Boolean))];
    chipsEl.innerHTML = categories.map((c) =>
        `<button class="chip ${c === state.category ? 'active' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`
    ).join('');
};

const renderProducts = () => {
    const list = visibleProducts();
    countEl.textContent = list.length === 1 ? '1 product' : `${list.length} products`;
    if (!list.length) {
        gridEl.innerHTML = '<div class="empty"><p>No products match your filters.</p><button class="btn btn-ghost" id="clearFilters">Clear filters</button></div>';
        return;
    }
    gridEl.innerHTML = list.map(cardHTML).join('');
};

const loadProducts = async () => {
    gridEl.innerHTML = Array(6).fill('<div class="skeleton"></div>').join('');
    try {
        state.products = await apiRequest('/products');
        renderChips();
        renderProducts();
    } catch (err) {
        console.error(err);
        gridEl.innerHTML = '<div class="empty"><p>Could not load products. Check that the server is running.</p><button class="btn btn-ghost" id="retryLoad">Try again</button></div>';
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

// ---------- Quick view ----------
const openQuickView = (id) => {
    selected = state.products.find((p) => p.id === id);
    if (!selected) return;
    qty = 1;
    qvArt.innerHTML = iconFor(selected);
    qvCat.textContent = selected.category || '';
    qvName.textContent = selected.name;
    qvDesc.textContent = selected.description || 'No description yet.';
    qvPrice.textContent = money(selected.price);
    qvStock.textContent = selected.stock_quantity > 0 ? `${selected.stock_quantity} in stock` : 'Sold out';
    qvAdd.disabled = selected.stock_quantity <= 0;
    qvQty.textContent = qty;
    quickView.showModal();
};

document.getElementById('qvMinus').addEventListener('click', () => {
    qty = Math.max(1, qty - 1);
    qvQty.textContent = qty;
});
document.getElementById('qvPlus').addEventListener('click', () => {
    qty = Math.min(selected.stock_quantity, qty + 1);
    qvQty.textContent = qty;
});
qvAdd.addEventListener('click', async () => {
    if (await addToCart(selected.id, qty)) quickView.close();
});
document.getElementById('qvClose').addEventListener('click', () => quickView.close());
quickView.addEventListener('click', (e) => { if (e.target === quickView) quickView.close(); });

// ---------- Events ----------
chipsEl.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    state.category = chip.dataset.cat;
    renderChips();
    renderProducts();
});
sortEl.addEventListener('change', () => { state.sort = sortEl.value; renderProducts(); });
searchEl.addEventListener('input', () => { state.query = searchEl.value; renderProducts(); });

gridEl.addEventListener('click', (e) => {
    if (e.target.closest('#retryLoad')) return loadProducts();
    if (e.target.closest('#clearFilters')) {
        state.category = 'All';
        state.query = '';
        searchEl.value = '';
        renderChips();
        return renderProducts();
    }
    const addBtn = e.target.closest('[data-add]');
    if (addBtn) return addToCart(Number(addBtn.dataset.add));
    const card = e.target.closest('.card');
    if (card) openQuickView(Number(card.dataset.id));
});
gridEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.classList.contains('card')) openQuickView(Number(e.target.dataset.id));
});

// 3D tilt on cards (only for devices with hover, and not with reduced motion)
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

loadProducts();