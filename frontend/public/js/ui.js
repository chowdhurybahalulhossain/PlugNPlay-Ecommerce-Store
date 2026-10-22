// Shared UI helpers: theme, toast, nav state, cart badge, spotlight

const getTheme = () => document.documentElement.getAttribute('data-theme') || 'dark';

const setTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
};

const showToast = (message, type = 'info') => {
    let box = document.getElementById('toasts');
    if (!box) {
        box = document.createElement('div');
        box.id = 'toasts';
        box.className = 'toasts';
        box.setAttribute('aria-live', 'polite');
        document.body.appendChild(box);
    }
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    box.appendChild(el);
    setTimeout(() => el.remove(), 2600);
};

// Update the cart count badge in the navbar
const updateCartCount = async (animate = false) => {
    const badge = document.getElementById('cartCount');
    if (!badge || !getToken()) return;
    try {
        const items = await apiRequest('/cart', 'GET', null, true);
        const total = items.reduce((sum, item) => sum + item.quantity, 0);
        badge.textContent = total;
        badge.hidden = total === 0;
        if (animate) {
            badge.classList.remove('bump');
            void badge.offsetWidth; // restart the animation
            badge.classList.add('bump');
        }
    } catch (err) {
        // Ignore: an expired token should not break the page
    }
};

// Update the wishlist count badge in the navbar
const updateWishlistCount = async (animate = false) => {
    const badge = document.getElementById('wishlistCount');
    if (!badge || !getToken()) return;
    try {
        const ids = await apiRequest('/wishlist/ids', 'GET', null, true);
        const total = Array.isArray(ids) ? ids.length : 0;
        badge.textContent = total;
        badge.hidden = total === 0;
        if (animate) {
            badge.classList.remove('bump');
            void badge.offsetWidth;
            badge.classList.add('bump');
        }
    } catch (err) {
        // Ignore errors
    }
};

// Global toggle wishlist helper for product cards and details
window.toggleWishlist = async (productId, btnEl) => {
    if (!getToken()) {
        showToast('Please sign in to save items to your wishlist', 'info');
        setTimeout(() => { window.location.href = 'login.html'; }, 1000);
        return;
    }
    try {
        if (btnEl) btnEl.classList.add('pumping');
        const res = await apiRequest(`/wishlist/toggle/${productId}`, 'POST', null, true);
        if (btnEl) {
            btnEl.classList.toggle('active', res.inWishlist);
            btnEl.classList.remove('pumping');
        }
        updateWishlistCount(true);
        showToast(res.message, res.inWishlist ? 'info' : 'warning');
        return res.inWishlist;
    } catch (err) {
        if (btnEl) btnEl.classList.remove('pumping');
        showToast(err.message || 'Failed to update wishlist', 'error');
    }
};

// Turn "Sign in" into "Sign out" when logged in
const initAuthLink = () => {
    const link = document.getElementById('authLink');
    if (!link || !getToken()) return;
    link.textContent = 'Sign out';
    link.href = '#';
    link.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    });
};

// The "lamp": follows the cursor, drifts on its own when idle
const initSpotlight = (el) => {
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let targetX = 0.68, targetY = 0.62;
    let currentX = targetX, currentY = targetY;
    let lastMove = -9999;
    let visible = true;

    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(el);

    el.addEventListener('pointermove', (e) => {
        const rect = el.getBoundingClientRect();
        targetX = (e.clientX - rect.left) / rect.width;
        targetY = (e.clientY - rect.top) / rect.height;
        lastMove = performance.now();
    });

    const tick = (time) => {
        if (visible) {
            if (!reduceMotion && time - lastMove > 2500) {
                targetX = 0.5 + 0.32 * Math.sin(time / 2600);
                targetY = 0.6 + 0.16 * Math.cos(time / 1900);
            }
            currentX += (targetX - currentX) * 0.08;
            currentY += (targetY - currentY) * 0.08;
            el.style.setProperty('--mx', `${(currentX * 100).toFixed(2)}%`);
            el.style.setProperty('--my', `${(currentY * 100).toFixed(2)}%`);
        }
        requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
};

// Display Admin Portal link in navbar if user has admin role
const initAdminNav = () => {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.role === 'admin') {
            const nav = document.querySelector('.nav-links');
            if (nav && !document.getElementById('adminNavLink')) {
                const adminLink = document.createElement('a');
                adminLink.id = 'adminNavLink';
                adminLink.href = 'admin.html';
                adminLink.className = 'admin-link-badge';
                adminLink.innerHTML = '⚡ Admin';
                const authLink = document.getElementById('authLink');
                if (authLink) {
                    nav.insertBefore(adminLink, authLink);
                } else {
                    nav.appendChild(adminLink);
                }
            }
        }
    } catch (e) {}
};

// Display Profile link in navbar when logged in
const initProfileNav = () => {
    if (!getToken()) return;
    const nav = document.querySelector('.nav-links');
    if (nav && !document.getElementById('profileNavLink')) {
        // If current page already has static profile link, mark it or return
        const existing = nav.querySelector('a[href="profile.html"]');
        if (existing) {
            existing.id = 'profileNavLink';
            return;
        }
        const profileLink = document.createElement('a');
        profileLink.id = 'profileNavLink';
        profileLink.href = 'profile.html';
        profileLink.textContent = 'Profile';
        if (window.location.pathname.endsWith('profile.html')) {
            profileLink.classList.add('active');
        }
        const authLink = document.getElementById('authLink');
        if (authLink) {
            nav.insertBefore(profileLink, authLink);
        } else {
            nav.appendChild(profileLink);
        }
    }
};

// Wishlist navigation link in navbar
const initWishlistNav = () => {
    const nav = document.querySelector('.nav-links');
    if (!nav) return;
    let existing = nav.querySelector('a[href="wishlist.html"]');
    if (!existing) {
        const link = document.createElement('a');
        link.href = 'wishlist.html';
        link.className = 'wishlist-link';
        link.innerHTML = `Wishlist <span class="badge" id="wishlistCount" hidden>0</span>`;
        if (window.location.pathname.endsWith('wishlist.html')) {
            link.classList.add('active');
        }
        const cartLink = nav.querySelector('a[href="cart.html"]');
        if (cartLink) {
            nav.insertBefore(link, cartLink);
        } else {
            nav.appendChild(link);
        }
    }
};

// Footer Newsletter handler
const initFooterNewsletter = () => {
    const form = document.getElementById('footerNewsletterForm');
    if (!form) return;
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('footerEmailInput');
        const email = input?.value?.trim();
        if (!email || !email.includes('@')) {
            showToast('Please enter a valid email address', 'error');
            return;
        }
        showToast('🎉 Subscribed! Use code PLUG10 for 10% off', 'info');
        if (input) input.value = '';
    });
};

// Global Instant Search Autocomplete & Command Palette
const initGlobalSearch = () => {
    // 1. Insert Search button into navbar
    const nav = document.querySelector('.site-header .nav') || document.querySelector('.nav');
    if (nav && !document.getElementById('navGlobalSearchBtn')) {
        const searchBtn = document.createElement('button');
        searchBtn.type = 'button';
        searchBtn.className = 'nav-search-btn';
        searchBtn.id = 'navGlobalSearchBtn';
        searchBtn.title = 'Search peripherals & gear (Ctrl+K)';
        searchBtn.setAttribute('aria-label', 'Search gear');
        searchBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <span class="nav-search-label">Quick Search...</span>
            <kbd class="nav-search-kbd">Ctrl K</kbd>
        `;
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            nav.insertBefore(searchBtn, themeToggle);
        } else {
            nav.appendChild(searchBtn);
        }
    }

    // 2. Insert Search Modal Backdrop into document body
    let modalBackdrop = document.getElementById('searchModalBackdrop');
    if (!modalBackdrop) {
        modalBackdrop = document.createElement('div');
        modalBackdrop.className = 'search-modal-backdrop';
        modalBackdrop.id = 'searchModalBackdrop';
        modalBackdrop.hidden = true;
        modalBackdrop.innerHTML = `
            <div class="search-modal-card" role="dialog" aria-modal="true" aria-label="Search Catalog">
                <div class="search-modal-head">
                    <svg class="search-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input type="text" id="globalSearchInput" class="search-modal-input" placeholder="Search keyboards, audio, mice, desk accessories..." autocomplete="off" spellcheck="false">
                    <button type="button" class="btn-clear-search-modal" id="clearModalSearchBtn" hidden aria-label="Clear search input">&times;</button>
                    <button type="button" class="search-modal-esc" id="closeSearchModalBtn" aria-label="Close search">Esc</button>
                </div>
                <div class="search-quick-tags">
                    <span class="quick-tag-label">Trending:</span>
                    <button type="button" class="quick-tag" data-tag="Keyboard">⌨️ Keyboards</button>
                    <button type="button" class="quick-tag" data-tag="Mouse">🖱️ Mice</button>
                    <button type="button" class="quick-tag" data-tag="Audio">🎧 Audio</button>
                    <button type="button" class="quick-tag" data-tag="ScreenBar">💡 Lighting</button>
                    <button type="button" class="quick-tag" data-tag="Mat">⚡ Desk Mats</button>
                </div>
                <div class="search-modal-results" id="modalSearchResults">
                    <div class="search-empty-state">
                        <div class="search-empty-icon">⌨️</div>
                        <div class="search-empty-title">Search high-performance gear</div>
                        <div class="search-empty-sub">Type a brand, category, or model name to instantly find peripherals, live ratings, and stock.</div>
                    </div>
                </div>
                <div class="search-modal-foot">
                    <div class="foot-shortcuts">
                        <span><kbd>↑</kbd> <kbd>↓</kbd> navigate</span>
                        <span><kbd>↵</kbd> select</span>
                        <span><kbd>esc</kbd> dismiss</span>
                    </div>
                    <span class="foot-brand">⚡ PlugNPlay Instant Gear Finder</span>
                </div>
            </div>`;
        document.body.appendChild(modalBackdrop);
    }

    const searchInput = document.getElementById('globalSearchInput');
    const clearBtn = document.getElementById('clearModalSearchBtn');
    const closeBtn = document.getElementById('closeSearchModalBtn');
    const resultsContainer = document.getElementById('modalSearchResults');
    const triggerBtn = document.getElementById('navGlobalSearchBtn');

    let debounceTimer = null;
    let currentResults = [];
    let selectedIndex = -1;

    const highlightMatch = (text, term) => {
        if (!term) return text;
        const escaped = term.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>');
    };

    const formatMoney = (n) => '৳' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 });

    const openModal = () => {
        modalBackdrop.hidden = false;
        document.body.style.overflow = 'hidden';
        setTimeout(() => {
            searchInput?.focus();
            if (searchInput?.value) searchInput.select();
        }, 60);
    };

    const closeModal = () => {
        modalBackdrop.hidden = true;
        document.body.style.overflow = '';
        selectedIndex = -1;
    };

    triggerBtn?.addEventListener('click', openModal);
    closeBtn?.addEventListener('click', closeModal);

    modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) closeModal();
    });

    clearBtn?.addEventListener('click', () => {
        if (searchInput) {
            searchInput.value = '';
            clearBtn.hidden = true;
            renderInitialState();
            searchInput.focus();
        }
    });

    // Global keyboard shortcuts (Ctrl+K, Slash, Escape)
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            if (modalBackdrop.hidden) openModal();
            else closeModal();
            return;
        }

        if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
            e.preventDefault();
            openModal();
            return;
        }

        if (e.key === 'Escape' && !modalBackdrop.hidden) {
            e.preventDefault();
            closeModal();
        }
    });

    const renderInitialState = () => {
        resultsContainer.innerHTML = `
            <div class="search-empty-state">
                <div class="search-empty-icon">⌨️</div>
                <div class="search-empty-title">Search high-performance gear</div>
                <div class="search-empty-sub">Type a brand, category, or model name to instantly find peripherals, live ratings, and stock.</div>
            </div>`;
        currentResults = [];
        selectedIndex = -1;
    };

    const updateSelectionVisual = () => {
        const items = resultsContainer.querySelectorAll('.search-result-item');
        items.forEach((item, idx) => {
            if (idx === selectedIndex) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else {
                item.classList.remove('selected');
            }
        });
    };

    const renderResults = (products, query) => {
        currentResults = products || [];
        selectedIndex = -1;

        if (currentResults.length === 0) {
            resultsContainer.innerHTML = `
                <div class="search-empty-state">
                    <div class="search-empty-icon">🔍</div>
                    <div class="search-empty-title">No gear found matching "${highlightMatch(query, query)}"</div>
                    <div class="search-empty-sub">Try searching for "Keyboard", "Mouse", "ScreenBar", or click a trending tag above.</div>
                </div>`;
            return;
        }

        resultsContainer.innerHTML = currentResults.map((p, idx) => {
            const stockQty = Number(p.stock_quantity ?? 0);
            let stockClass = 'in-stock', stockLabel = 'In Stock';
            if (stockQty <= 0) {
                stockClass = 'sold-out'; stockLabel = 'Sold Out';
            } else if (stockQty <= 5) {
                stockClass = 'low-stock'; stockLabel = `Only ${stockQty} Left`;
            }

            const rating = Number(p.avg_rating || 5.0).toFixed(1);
            const reviewsCount = p.total_reviews || 0;

            const artHTML = p.image_url
                ? `<img src="${p.image_url}" alt="${p.name}" loading="lazy">`
                : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`;

            return `
                <a href="product.html?id=${p.id}" class="search-result-item" data-index="${idx}">
                    <div class="search-item-art">${artHTML}</div>
                    <div class="search-item-info">
                        <div class="search-item-meta">
                            <span class="search-item-cat">${p.category || 'Gear'}</span>
                            <span class="search-item-stars">★ ${rating} <span style="opacity:0.7">(${reviewsCount})</span></span>
                        </div>
                        <h4 class="search-item-title">${highlightMatch(p.name, query)}</h4>
                    </div>
                    <div class="search-item-right">
                        <span class="search-item-price">${formatMoney(p.price)}</span>
                        <span class="search-stock-pill ${stockClass}">${stockLabel}</span>
                    </div>
                </a>`;
        }).join('');
    };

    const executeSearch = async (term) => {
        const query = term.trim();
        if (!query) {
            renderInitialState();
            return;
        }

        resultsContainer.innerHTML = `
            <div class="search-empty-state">
                <div class="search-empty-icon" style="font-size:1.5rem">⚡</div>
                <div class="search-empty-title">Scanning catalog...</div>
            </div>`;

        try {
            const products = await apiRequest(`/products/search?q=${encodeURIComponent(query)}&limit=10`);
            renderResults(products, query);
        } catch (err) {
            console.error('Search error:', err);
            resultsContainer.innerHTML = `
                <div class="search-empty-state">
                    <div class="search-empty-title" style="color:var(--accent)">Unable to complete search</div>
                    <div class="search-empty-sub">Please verify your connection and try again.</div>
                </div>`;
        }
    };

    // Input typing & debounce
    searchInput?.addEventListener('input', (e) => {
        const val = e.target.value;
        if (clearBtn) clearBtn.hidden = !val;

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            executeSearch(val);
        }, 180);
    });

    // Arrow navigation inside Search Modal
    searchInput?.addEventListener('keydown', (e) => {
        if (!currentResults.length) {
            if (e.key === 'Enter' && searchInput.value.trim()) {
                window.location.href = `index.html?search=${encodeURIComponent(searchInput.value.trim())}`;
            }
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = (selectedIndex + 1) % currentResults.length;
            updateSelectionVisual();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = (selectedIndex - 1 + currentResults.length) % currentResults.length;
            updateSelectionVisual();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex >= 0 && currentResults[selectedIndex]) {
                window.location.href = `product.html?id=${currentResults[selectedIndex].id}`;
            } else if (searchInput.value.trim()) {
                window.location.href = `index.html?search=${encodeURIComponent(searchInput.value.trim())}`;
            }
        }
    });

    // Quick tag pills (e.g. ⌨️ Keyboards)
    modalBackdrop.querySelectorAll('.quick-tag').forEach((btn) => {
        btn.addEventListener('click', () => {
            const tag = btn.dataset.tag;
            if (searchInput && tag) {
                searchInput.value = tag;
                if (clearBtn) clearBtn.hidden = false;
                searchInput.focus();
                executeSearch(tag);
            }
        });
    });
};

document.getElementById('themeToggle')?.addEventListener('click', () => {
    setTheme(getTheme() === 'dark' ? 'light' : 'dark');
});
document.querySelectorAll('[data-spotlight]').forEach(initSpotlight);
initAuthLink();
initAdminNav();
initWishlistNav();
initProfileNav();
initFooterNewsletter();
initGlobalSearch();
updateCartCount();
updateWishlistCount();