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

const renderStarString = (rating) => {
    const full = Math.round(Number(rating) || 0);
    return '★'.repeat(Math.max(0, Math.min(5, full))) + '☆'.repeat(Math.max(0, 5 - full));
};

let currentRatingValue = 5;

const updateStarPickerVisual = (val) => {
    currentRatingValue = val;
    const input = document.getElementById('reviewRatingInput');
    if (input) input.value = val;
    const btns = document.querySelectorAll('#starPicker .star-btn');
    btns.forEach((btn) => {
        const btnVal = Number(btn.dataset.val || 1);
        if (btnVal <= val) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
};

let reviewFormInitialized = false;
const setupReviewForm = () => {
    if (reviewFormInitialized) return;
    reviewFormInitialized = true;

    const openBtn = document.getElementById('openReviewModalBtn');
    const writeCard = document.getElementById('writeReviewCard');
    const closeBtn = document.getElementById('closeWriteRevBtn');
    const cancelBtn = document.getElementById('cancelReviewBtn');
    const form = document.getElementById('reviewForm');
    const starPicker = document.getElementById('starPicker');

    if (starPicker) {
        starPicker.querySelectorAll('.star-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const val = Number(btn.dataset.val || 5);
                updateStarPickerVisual(val);
            });
        });
    }

    if (openBtn && writeCard) {
        openBtn.addEventListener('click', () => {
            if (!getToken()) {
                showToast('Please sign in to write a review', 'error');
                setTimeout(() => {
                    window.location.href = `login.html?redirect=product.html?id=${productId}`;
                }, 1200);
                return;
            }
            writeCard.hidden = false;
            writeCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }

    const hideForm = () => {
        if (writeCard) writeCard.hidden = true;
    };

    if (closeBtn) closeBtn.addEventListener('click', hideForm);
    if (cancelBtn) cancelBtn.addEventListener('click', hideForm);

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!getToken()) {
                showToast('Please sign in to submit a review', 'error');
                return;
            }
            const rating = Number(document.getElementById('reviewRatingInput')?.value || 5);
            const title = document.getElementById('reviewTitleInput')?.value?.trim() || '';
            const comment = document.getElementById('reviewCommentInput')?.value?.trim() || '';

            if (!comment) {
                showToast('Please write your review feedback', 'error');
                return;
            }

            const submitBtn = document.getElementById('submitReviewBtn');
            try {
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Submitting…';
                }
                await apiRequest(`/reviews/product/${productId}`, 'POST', { rating, title, comment }, true);
                showToast('Your review has been published!');
                hideForm();
                await loadReviews();
            } catch (err) {
                showToast(err.message || 'Failed to submit review', 'error');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Submit Review';
                }
            }
        });
    }
};

const loadReviews = async () => {
    const reviewsFeed = document.getElementById('reviewsFeed');
    try {
        const data = await apiRequest(`/reviews/product/${productId}`, 'GET', null, Boolean(getToken()));
        const { summary, reviews = [], userReview = null } = data || {};

        const avg = summary?.averageRating ? Number(summary.averageRating) : 5.0;
        const total = summary?.totalReviews ? Number(summary.totalReviews) : 0;
        const breakdown = summary?.ratingBreakdown || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

        // Update Top Product Details Rating Link
        const productStars = document.getElementById('productStars');
        const productScore = document.getElementById('productScore');
        const productReviewsCount = document.getElementById('productReviewsCount');
        if (productStars) productStars.textContent = renderStarString(avg);
        if (productScore) productScore.textContent = avg.toFixed(1);
        if (productReviewsCount) productReviewsCount.textContent = `(${total} review${total === 1 ? '' : 's'})`;

        // Update Reviews Section Overview Card
        const revBigScore = document.getElementById('revBigScore');
        const revBigStars = document.getElementById('revBigStars');
        const revTotalLabel = document.getElementById('revTotalLabel');
        if (revBigScore) revBigScore.textContent = avg.toFixed(1);
        if (revBigStars) revBigStars.textContent = renderStarString(avg);
        if (revTotalLabel) revTotalLabel.textContent = `Based on ${total} verified review${total === 1 ? '' : 's'}`;

        // Breakdown bars
        for (let star = 1; star <= 5; star++) {
            const count = Number(breakdown[star] || 0);
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const barFill = document.getElementById(`barStar${star}`);
            const countSpan = document.getElementById(`countStar${star}`);
            if (barFill) barFill.style.width = `${pct}%`;
            if (countSpan) countSpan.textContent = count;
        }

        // If user already reviewed, pre-fill form
        if (userReview) {
            const titleInput = document.getElementById('reviewTitleInput');
            const commentInput = document.getElementById('reviewCommentInput');
            const writeRevTitle = document.getElementById('writeRevTitle');
            const submitBtn = document.getElementById('submitReviewBtn');
            const openReviewModalBtn = document.getElementById('openReviewModalBtn');

            if (titleInput && !titleInput.value) titleInput.value = userReview.title || '';
            if (commentInput && !commentInput.value) commentInput.value = userReview.comment || '';
            if (userReview.rating) updateStarPickerVisual(Number(userReview.rating));
            if (writeRevTitle) writeRevTitle.textContent = 'Edit Your Review';
            if (submitBtn) submitBtn.textContent = 'Update Review';
            if (openReviewModalBtn) {
                openReviewModalBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1rem;height:1rem;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Edit Your Review`;
            }
        }

        // Render reviews feed
        if (!reviewsFeed) return;

        if (reviews.length === 0) {
            reviewsFeed.innerHTML = `
                <div class="rev-empty-state">
                    <div class="rev-empty-icon">★</div>
                    <h3>No reviews yet for this gear</h3>
                    <p>Be the first enthusiast to share hands-on feedback and get a verified buyer badge!</p>
                </div>`;
            return;
        }

        reviewsFeed.innerHTML = reviews.map((r) => {
            const initial = (r.user_name || 'U').charAt(0).toUpperCase();
            const dateStr = r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }) : 'Recent';

            return `
                <article class="review-card" data-review-id="${r.id}">
                    <div class="rev-card-header">
                        <div class="rev-author-meta">
                            <div class="rev-avatar">${esc(initial)}</div>
                            <div>
                                <div class="rev-author-name">
                                    ${esc(r.user_name || 'Verified Explorer')}
                                    ${r.is_verified_buyer ? `
                                        <span class="badge-verified-buyer" title="Verified purchaser of this product">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                            Verified Buyer
                                        </span>` : ''}
                                </div>
                                <div class="rev-date">${esc(dateStr)}</div>
                            </div>
                        </div>
                        <div class="rev-card-stars" aria-label="${r.rating} out of 5 stars">${renderStarString(r.rating)}</div>
                    </div>
                    ${r.title ? `<h4 class="rev-title">${esc(r.title)}</h4>` : ''}
                    <p class="rev-text">${esc(r.comment)}</p>
                </article>`;
        }).join('');

    } catch (err) {
        console.error('Failed to load reviews:', err);
        if (reviewsFeed) {
            reviewsFeed.innerHTML = `<div class="rev-empty-state"><p style="color:var(--muted)">Unable to load customer reviews at this time.</p></div>`;
        }
    }
};

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
        // ✅ Fetch product data and best sellers in parallel
        const [prodData, bestSellers = []] = await Promise.all([
            apiRequest(`/products/${productId}`),
            apiRequest('/products/best-sellers?limit=6').catch(() => [])
        ]);
        currentProduct = prodData;
        const isBestSeller = bestSellers.some(b => Number(b.id) === Number(currentProduct.id));

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
        const bestSellerPill = isBestSeller 
            ? `<span class="cat-pill" style="background: linear-gradient(135deg, #f59e0b, #ea580c); color: #fff; border:none; font-weight:800; box-shadow: 0 4px 12px rgba(245,158,11,0.35);">🔥 Best Seller</span>` 
            : '';

        // Build details panel
        productDetails.innerHTML = `
            <div class="product-badge-row">
                ${bestSellerPill}
                <span class="cat-pill">${esc(currentProduct.category || 'Gear')}</span>
                <span class="stock-pill ${stockClass}">${stockText}</span>
            </div>
            <h1 class="product-title">${esc(currentProduct.name)}</h1>
            <a href="#reviewsSection" class="rating-row" id="productRatingRow" style="text-decoration:none; cursor:pointer;" title="Jump to customer reviews">
                <div class="stars" id="productStars">★★★★★</div>
                <span class="rating-score" id="productScore">5.0</span>
                <span class="rating-count" id="productReviewsCount">(0 reviews)</span>
            </a>
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
                <button type="button" class="btn btn-wishlist-toggle" id="productWishlistBtn" title="Save to wishlist" aria-label="Save to wishlist">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                </button>
            </div>`;

        // Re-bind controls
        const qMinus = document.getElementById('qtyMinus');
        const qPlus  = document.getElementById('qtyPlus');
        const qDisp  = document.getElementById('qtyDisplay');
        const addBtn = document.getElementById('addToCartBtn');
        const buyBtn = document.getElementById('buyNowBtn');
        const wishBtn= document.getElementById('productWishlistBtn');

        // Wishlist button state & click handler
        if (wishBtn && getToken()) {
            apiRequest('/wishlist/ids', 'GET', null, true).then(ids => {
                if (Array.isArray(ids) && ids.includes(currentProduct.id)) {
                    wishBtn.classList.add('active');
                    const svg = wishBtn.querySelector('svg');
                    if (svg) svg.setAttribute('fill', '#f43f5e');
                }
            }).catch(() => {});
        }

        wishBtn?.addEventListener('click', () => {
            window.toggleWishlist(currentProduct.id, wishBtn).then(inW => {
                if (typeof inW === 'boolean') {
                    const svg = wishBtn.querySelector('svg');
                    if (svg) svg.setAttribute('fill', inW ? '#f43f5e' : 'none');
                }
            });
        });

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

        // Load customer reviews and setup review form
        loadReviews();
        setupReviewForm();

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

