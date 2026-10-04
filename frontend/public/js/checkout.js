const form = document.getElementById('checkoutForm');
const payBtn = document.getElementById('payBtn');
const messageBox = document.getElementById('checkoutMessage');
const summaryItems = document.getElementById('summaryItems');
const summaryTotal = document.getElementById('summaryTotal');

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));
const money = (n) => '৳' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

const showMessage = (text, type) => {
    messageBox.textContent = text;
    messageBox.className = `auth-message ${type}`;
};

const loadSummary = async () => {
    if (!getToken()) {
        summaryItems.innerHTML = '<p>Sign in to checkout.</p>';
        payBtn.disabled = true;
        return;
    }
    try {
        const items = await apiRequest('/cart', 'GET', null, true);
        if (!items.length) {
            summaryItems.innerHTML = '<p>Your cart is empty.</p>';
            payBtn.disabled = true;
            summaryTotal.textContent = money(0);
            return;
        }
        summaryItems.innerHTML = items.map((item) => `
            <div class="summary-line">
                <span>${esc(item.name)} × ${item.quantity}</span>
                <span>${money(item.price * item.quantity)}</span>
            </div>`).join('');
        const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        summaryTotal.textContent = money(total);
    } catch (err) {
        summaryItems.innerHTML = `<p>${esc(err.message)}</p>`;
    }
};

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    payBtn.disabled = true;
    payBtn.textContent = 'Placing order...';
    try {
        await apiRequest('/checkout', 'POST', {
            shippingAddress: document.getElementById('shippingAddress').value,
            paymentMethodId: 'pm_card_visa'
        }, true);
        showToast('Order placed');
        updateCartCount();
        setTimeout(() => { window.location.href = 'orders.html'; }, 900);
    } catch (err) {
        showMessage(err.message, 'error');
        payBtn.disabled = false;
        payBtn.textContent = 'Place order';
    }
});

loadSummary();