const params = new URLSearchParams(window.location.search);
const productId = params.get('id');

const bcCategory = document.getElementById('bcCategory');
const bcName = document.getElementById('bcName');
const productImage = document.getElementById('productImage');
const mainImageWrap = document.getElementById('mainImageWrap');
const productCategory = document.getElementById('productCategory');
const stockBadge = document.getElementById('stockBadge');
const productTitle = document.getElementById('productTitle');
const productPrice = document.getElementById('productPrice');
const originalPrice = document.getElementById('originalPrice');
const productDescription = document.getElementById('productDescription');
const qtyMinus = document.getElementById('qtyMinus');
const qtyPlus = document.getElementById('qtyPlus');
const qtyDisplay = document.getElementById('qtyDisplay');
const addToCartBtn = document.getElementById('addToCartBtn');
const buyNowBtn = document.getElementById('buyNowBtn');
const specsTable = document.getElementById('specsTable');
const relatedGrid = document.getElementById('relatedGrid');

let currentProduct = null;
let currentQty = 1;

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

const getSpecsForProduct = (p) => {
    const cat = (p.category || '').toLowerCase();
    if (cat.includes('keyboard')) {
        return [
            { name: 'Switch Type', val: 'Hot-Swappable Custom Tactile / Linear' },
            { name: 'Connectivity', val: 'Tri-Mode: 2.4GHz Wireless + BT 5.3 + USB-C' },
            { name: 'Chassis & Plate', val: 'CNC Aluminum + Gasket Mount Structure' },
            { name: 'Battery Life', val: 'Up to 240 Hours (RGB off)' },
            { name: 'Keycaps', val: 'Double-shot Frosted PBT' },
            { name: 'OS Compatibility', val: 'Windows, macOS, Linux, Android, iOS' }
        ];
    } else if (cat.includes('mouse')) {
        return [
            { name: 'Sensor Engine', val: 'PixArt Flagship 26,000 DPI Optical' },
            { name: 'Weight', val: 'Ultra-lightweight 60g Aerodynamic Shell' },
            { name: 'Battery Capacity', val: '80 Hours Continuous Playtime' },
            { name: 'Switches', val: 'Optical Micro-Switches (Rated 90M Clicks)' },
            { name: 'Polling Rate', val: '1000Hz (4000Hz Wireless Ready)' },
            { name: 'Feet', val: '100% Virgin Grade Rounded PTFE' }
        ];
    } else if (cat.includes('audio')) {
        return [
            { name: 'Acoustic Driver', val: '40mm Custom Titanium Bio-Diaphragm' },
            { name: 'Noise Cancellation', val: 'Hybrid Active Noise Cancellation (-38dB)' },
            { name: 'Microphone', val: 'AI Beamforming Environmental Noise Cancelling' },
            { name: 'Battery Endurance', val: 'Up to 50 Hours (ANC Active)' },
            { name: 'Latency', val: 'Ultra Low-Latency 35ms Gaming Mode' },
            { name: 'Connectivity', val: 'Bluetooth 5.3 + Low-Latency USB Dongle' }
        ];
    } else if (cat.includes('light')) {
        return [
            { name: 'Optical Design', val: 'Asymmetrical Anti-Glare Screen Illumination' },
            { name: 'Color Temp Range', val: '2700K (Warm) – 6500K (Daylight Crisp)' },
            { name: 'Color Rendering', val: 'Ra ≥ 95 High Color Fidelity' },
            { name: 'Power Connection', val: '5V USB Type-C (Screen / PC / Adapter)' },
            { name: 'Controls', val: 'Wireless Desktop Smart Touch Dial' },
            { name: 'Mount Clamp', val: 'Weighted Counterbalance (Curved & Flat monitors)' }
        ];
    } else {
        return [
            { name: 'Material', val: 'Waterproof High-Density Micro-Weave & Felt' },
            { name: 'Dimensions', val: '900mm × 400mm × 4mm (Extended XL)' },
            { name: 'Cable Management', val: 'Embedded Dual Magnetic Cable Clips' },
            { name: 'Underbase', val: 'Anti-Slip Textured Natural Rubber Grip' },
            { name: 'Edges', val: 'Anti-Fray Precision Reinforced Stitching' },
            { name: 'Maintenance', val: 'Spill-Resistant & Easy Wipe Clean' }
        ];
    }
};

const renderCardHTML = (p) => `
    <article class="card" data-id="${p.id}" tabindex="0" onclick="window.location.href='product.html?id=${p.id}'" style="cursor: pointer;">
        <div class="card-art">
            ${p.image_url 
                ? `<img src="${esc(p.image_url)}" alt="${esc(p.name)}" class="card-img" loading="lazy">` 
                : iconFor(p)}
        </div>
        <div class="card-body">
            <p class="cat">${esc(p.category)}</p>
            <h3>${esc(p.name)}</h3>
            <div class="card-foot">
                <span class="price">${money(p.price)}</span>
                <button class="btn-add" data-add="${p.id}" onclick="event.stopPropagation(); addToCartDirect(${p.id})">Add</button>
            </div>
        </div>
    </article>`;

const loadProductDetails = async () => {
    if (!productId) {
        window.location.href = 'index.html';
        return;
    }

    // Show skeleton while loading
    document.getElementById('productLayout').innerHTML = `
        <div class="product-skeleton">
            <div class="skel-img"></div>
            <div class="skel-lines">
                <div class="skel-line short"></div>
                <div class="skel-line wide"></div>
                <div class="skel-line med"></div>
                <div class="skel-line full"></div>
                <div class="skel-line full"></div>
                <div class="skel-line wide"></div>
            </div>
        </div>`;

    try {
        // ✅ Fetch product data first
        currentProduct = await apiRequest(`/products/${productId}`);

        // Then rebuild the layout (replacing skeleton)
        document.getElementById('productLayout').innerHTML = `
            <div class="product-gallery">
                <div class="main-image-wrap" id="mainImageWrap">
                    <img id="productImage" src="" alt="" class="main-product-img" style="display:none">
                </div>
            </div>
            <div class="product-details" id="productDetails"></div>`;

        // Re-query elements after re-render
        const productImage2    = document.getElementById('productImage');
        const mainImageWrap2   = document.getElementById('mainImageWrap');
        const productDetails   = document.getElementById('productDetails');

        document.title = `${currentProduct.name} — PlugNPlay`;
        bcCategory.textContent = currentProduct.category || 'Gear';
        bcName.textContent = currentProduct.name;

        // Image or placeholder
        if (currentProduct.image_url) {
            productImage2.src = currentProduct.image_url;
            productImage2.alt = currentProduct.name;
            productImage2.style.display = 'block';
        } else {
            mainImageWrap2.innerHTML = `
                <div class="img-placeholder">
                    ${iconFor(currentProduct)}
                </div>`;
        }

        // Stock state
        let stockClass = 'in-stock', stockText = 'In stock &amp; ready to ship';
        if (currentProduct.stock_quantity <= 0) {
            stockClass = 'sold-out'; stockText = 'Sold out';
        } else if (currentProduct.stock_quantity <= 5) {
            stockClass = 'low-stock'; stockText = `Only ${currentProduct.stock_quantity} left`;
        }

        const disabledAttr = currentProduct.stock_quantity <= 0 ? 'disabled' : '';

        // Build details panel
        productDetails.innerHTML = `
            <div class="product-badge-row">
                <span class="cat-pill">${esc(currentProduct.category || 'Gear')}</span>
                <span class="stock-pill ${stockClass}">${stockText}</span>
            </div>
            <h1 class="product-title">${esc(currentProduct.name)}</h1>
            <div class="rating-row">
                <div class="stars">★★★★★</div>
                <span class="rating-score">4.9</span>
                <span class="rating-count">(124 verified reviews)</span>
            </div>
            <div class="price-row">
                <span class="current-price">${money(currentProduct.price)}</span>
                <span class="original-price">${money(Math.round(currentProduct.price * 1.15))}</span>
                <span class="discount-badge">Save 15%</span>
            </div>
            <p class="product-description">${esc(currentProduct.description || 'Premium gear built for high performance and daily reliability.')}</p>
            <div class="highlights-box">
                <div class="hl-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    <span>Official PlugNPlay Grade-A Certified Hardware</span>
                </div>
                <div class="hl-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                    <span>Fast delivery across Bangladesh in 24–48 hours</span>
                </div>
                <div class="hl-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    <span>1 Year Full Replacement Warranty</span>
                </div>
            </div>
            <div class="purchase-controls">
                <div class="qty-stepper">
                    <button id="qtyMinus" aria-label="Decrease quantity" ${disabledAttr}>−</button>
                    <span id="qtyDisplay">1</span>
                    <button id="qtyPlus" aria-label="Increase quantity" ${disabledAttr}>+</button>
                </div>
                <button class="btn btn-add-cart" id="addToCartBtn" ${disabledAttr}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                    ${currentProduct.stock_quantity <= 0 ? 'Out of Stock' : 'Add to Cart'}
                </button>
                <button class="btn-buy-now" id="buyNowBtn" ${disabledAttr}>Buy Now</button>
            </div>`;

        // Re-bind controls
        const qMinus = document.getElementById('qtyMinus');
        const qPlus  = document.getElementById('qtyPlus');
        const qDisp  = document.getElementById('qtyDisplay');
        const addBtn = document.getElementById('addToCartBtn');
        const buyBtn = document.getElementById('buyNowBtn');

        qMinus.addEventListener('click', () => {
            currentQty = Math.max(1, currentQty - 1);
            qDisp.textContent = currentQty;
        });
        qPlus.addEventListener('click', () => {
            if (currentQty < currentProduct.stock_quantity) {
                currentQty++;
                qDisp.textContent = currentQty;
            }
        });
        addBtn.addEventListener('click', async () => {
            if (!getToken()) { showToast('Sign in to add items', 'error'); return; }
            try {
                addBtn.disabled = true;
                addBtn.textContent = 'Adding…';
                await apiRequest('/cart', 'POST', { productId: currentProduct.id, quantity: currentQty }, true);
                showToast(`Added ${currentQty} item${currentQty > 1 ? 's' : ''} to cart`);
                updateCartCount(true);
                addBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Added!`;
                setTimeout(() => {
                    addBtn.disabled = false;
                    addBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> Add to Cart`;
                }, 2000);
            } catch (err) { showToast(err.message, 'error'); addBtn.disabled = false; }
        });
        buyBtn.addEventListener('click', async () => {
            if (!getToken()) { showToast('Sign in to proceed', 'error'); return; }
            try {
                await apiRequest('/cart', 'POST', { productId: currentProduct.id, quantity: currentQty }, true);
                window.location.href = 'checkout.html';
            } catch (err) { showToast(err.message, 'error'); }
        });

        // Render Specs
        const specs = getSpecsForProduct(currentProduct);
        specsTable.innerHTML = specs.map((s) => `
            <div class="spec-card">
                <div class="spec-name">${esc(s.name)}</div>
                <div class="spec-val">${esc(s.val)}</div>
            </div>`).join('');

        // Load recommended products
        loadRelated();
    } catch (err) {
        document.getElementById('productPage').innerHTML = `
            <div style="text-align:center; padding: 5rem 2rem;">
                <div style="width:72px;height:72px;border-radius:50%;background:hsl(0 85% 60% / 0.1);border:1px solid hsl(0 85% 60% / 0.2);display:grid;place-items:center;color:hsl(0 85% 60%);margin:0 auto 1.5rem;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" style="width:32px;height:32px">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                </div>
                <h2 style="font-family:var(--font-display);font-size:1.4rem;margin-bottom:.5rem">Product Not Found</h2>
                <p style="color:var(--muted);font-size:.9rem;max-width:380px;margin:0 auto 1.5rem;line-height:1.6">
                    The product you are looking for may have been removed or is temporarily unavailable.
                </p>
                <a href="index.html" class="btn">Return to Shop</a>
            </div>`;
    }
};

const loadRelated = async () => {
    try {
        const all = await apiRequest('/products');
        const related = all
            .filter((p) => p.id !== Number(productId))
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);
        relatedGrid.innerHTML = related.map(renderCardHTML).join('');
    } catch (err) {
        console.error('Failed to load related gear', err);
    }
};

window.addToCartDirect = async (id) => {
    if (!getToken()) {
        showToast('Sign in to add items to your cart', 'error');
        setTimeout(() => { window.location.href = 'login.html'; }, 1000);
        return;
    }
    try {
        await apiRequest('/cart', 'POST', { productId: id, quantity: 1 }, true);
        showToast('Added to cart');
        updateCartCount(true);
    } catch (err) {
        showToast(err.message, 'error');
    }
};

/* ---- Init ---- */
loadProductDetails();

