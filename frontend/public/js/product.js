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

    try {
        currentProduct = await apiRequest(`/products/${productId}`);
        document.title = `${currentProduct.name} — PlugNPlay`;

        bcCategory.textContent = currentProduct.category || 'Gear';
        bcName.textContent = currentProduct.name;
        productCategory.textContent = currentProduct.category || 'Gear';
        productTitle.textContent = currentProduct.name;
        productPrice.textContent = money(currentProduct.price);
        originalPrice.textContent = money(Math.round(currentProduct.price * 1.15));
        productDescription.textContent = currentProduct.description || 'Premium gear built for high performance and daily reliability.';

        // Stock badge
        if (currentProduct.stock_quantity <= 0) {
            stockBadge.textContent = 'Sold out';
            stockBadge.className = 'stock-pill sold-out';
            addToCartBtn.disabled = true;
            buyNowBtn.disabled = true;
        } else if (currentProduct.stock_quantity <= 5) {
            stockBadge.textContent = `Only ${currentProduct.stock_quantity} left in stock`;
            stockBadge.className = 'stock-pill low-stock';
        } else {
            stockBadge.textContent = 'In stock & ready to ship';
            stockBadge.className = 'stock-pill in-stock';
        }

        // Image
        if (currentProduct.image_url) {
            productImage.src = currentProduct.image_url;
            productImage.alt = currentProduct.name;
        } else {
            mainImageWrap.innerHTML = iconFor(currentProduct);
        }

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
            <div class="orders-empty" style="margin: 80px auto; max-width: 500px;">
                <h2>Product Not Found</h2>
                <p>The product you are looking for may have been removed or is temporarily unavailable.</p>
                <a href="index.html" class="btn">Return to Shop</a>
            </div>`;
    }
};

const loadRelated = async () => {
    try {
        const all = await apiRequest('/products');
        const related = all.filter((p) => p.id !== Number(productId)).slice(0, 3);
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

qtyMinus.addEventListener('click', () => {
    currentQty = Math.max(1, currentQty - 1);
    qtyDisplay.textContent = currentQty;
});

qtyPlus.addEventListener('click', () => {
    if (currentProduct && currentQty < currentProduct.stock_quantity) {
        currentQty++;
        qtyDisplay.textContent = currentQty;
    }
});

addToCartBtn.addEventListener('click', async () => {
    if (!getToken()) {
        showToast('Sign in to add items to your cart', 'error');
        setTimeout(() => { window.location.href = 'login.html'; }, 1000);
        return;
    }
    try {
        await apiRequest('/cart', 'POST', { productId: currentProduct.id, quantity: currentQty }, true);
        showToast(`Added ${currentQty} item${currentQty > 1 ? 's' : ''} to cart`);
        updateCartCount(true);
    } catch (err) {
        showToast(err.message, 'error');
    }
});

buyNowBtn.addEventListener('click', async () => {
    if (!getToken()) {
        showToast('Sign in to proceed to checkout', 'error');
        setTimeout(() => { window.location.href = 'login.html'; }, 1000);
        return;
    }
    try {
        await apiRequest('/cart', 'POST', { productId: currentProduct.id, quantity: currentQty }, true);
        window.location.href = 'checkout.html';
    } catch (err) {
        showToast(err.message, 'error');
    }
});

loadProductDetails();
