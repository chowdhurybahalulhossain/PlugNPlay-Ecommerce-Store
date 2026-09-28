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

document.getElementById('themeToggle')?.addEventListener('click', () => {
    setTheme(getTheme() === 'dark' ? 'light' : 'dark');
});
document.querySelectorAll('[data-spotlight]').forEach(initSpotlight);
initAuthLink();
updateCartCount();