/* ================================================================
   checkout.js — Handles payment method selection, order summary,
   and form submission for COD and Card payments.
   ================================================================ */

const form            = document.getElementById('checkoutForm');
const payBtn          = document.getElementById('payBtn');
const payBtnText      = document.getElementById('payBtnText');
const messageBox      = document.getElementById('checkoutMessage');
const summaryItems    = document.getElementById('summaryItems');
const summarySubtotal = document.getElementById('summarySubtotal');
const summaryDelivery = document.getElementById('summaryDelivery');
const summaryTotal    = document.getElementById('summaryTotal');
const cardPanel       = document.getElementById('cardDetailsPanel');
const paymentRadios   = document.querySelectorAll('input[name="paymentMethod"]');
const areaRadios      = document.querySelectorAll('input[name="deliveryArea"]');

let cachedCartSubtotal = 0;

/* ---- Helpers ---- */
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));
const money = (n) => '৳' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

const showMessage = (text, type) => {
    messageBox.textContent = text;
    messageBox.className = `auth-message ${type}`;
};

const getSelectedPayment = () => {
    const selected = document.querySelector('input[name="paymentMethod"]:checked');
    return selected ? selected.value : 'cod';
};

const getSelectedArea = () => {
    const selected = document.querySelector('input[name="deliveryArea"]:checked');
    return selected ? selected.value : 'inside_dhaka';
};

const getDeliveryFee = () => {
    return getSelectedArea() === 'outside_dhaka' ? 120 : 60;
};

const updateSummaryTotals = () => {
    const fee = getDeliveryFee();
    if (summarySubtotal) summarySubtotal.textContent = money(cachedCartSubtotal);
    if (summaryDelivery) summaryDelivery.textContent = money(fee);
    if (summaryTotal) summaryTotal.textContent = money(cachedCartSubtotal + fee);
};

/* ---- Dynamic UI based on selected payment method ---- */
const updatePaymentUI = () => {
    const method = getSelectedPayment();

    if (method === 'card') {
        payBtnText.textContent = 'Pay with Card';
        cardPanel.classList.add('visible');
    } else {
        payBtnText.textContent = 'Place Order — Cash on Delivery';
        cardPanel.classList.remove('visible');
    }
};

// Listen for payment method changes
paymentRadios.forEach(radio => {
    radio.addEventListener('change', updatePaymentUI);
});

// Restore saved delivery area from localStorage if exists
const savedArea = localStorage.getItem('plugnplay_delivery_area');
if (savedArea) {
    const targetRadio = document.querySelector(`input[name="deliveryArea"][value="${savedArea}"]`);
    if (targetRadio) {
        targetRadio.checked = true;
        document.querySelectorAll('.area-card').forEach(c => c.classList.remove('active'));
        targetRadio.closest('.area-card')?.classList.add('active');
    }
}

// Listen for delivery zone changes
areaRadios.forEach(radio => {
    radio.addEventListener('change', () => {
        document.querySelectorAll('.area-card').forEach(c => c.classList.remove('active'));
        radio.closest('.area-card')?.classList.add('active');
        localStorage.setItem('plugnplay_delivery_area', radio.value);
        updateSummaryTotals();
    });
});

// Set initial UI state
updatePaymentUI();

/* ---- Load Order Summary from cart ---- */
const loadSummary = async () => {
    if (!getToken()) {
        summaryItems.innerHTML = '<p class="muted-text">Sign in to checkout.</p>';
        payBtn.disabled = true;
        return;
    }
    try {
        const items = await apiRequest('/cart', 'GET', null, true);
        if (!items.length) {
            summaryItems.innerHTML = '<p class="muted-text">Your cart is empty.</p>';
            payBtn.disabled = true;
            cachedCartSubtotal = 0;
            updateSummaryTotals();
            return;
        }
        summaryItems.innerHTML = items.map((item) => `
            <div class="summary-line">
                <span>${esc(item.name)} × ${item.quantity}</span>
                <span>${money(item.price * item.quantity)}</span>
            </div>`).join('');
        cachedCartSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        updateSummaryTotals();
    } catch (err) {
        summaryItems.innerHTML = `<p class="muted-text">${esc(err.message)}</p>`;
    }
};

/* ---- Form Submission ---- */
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const address = document.getElementById('shippingAddress').value.trim();
    if (!address) {
        showMessage('Please enter a shipping address.', 'error');
        document.getElementById('shippingAddress').focus();
        return;
    }

    const method = getSelectedPayment();
    const area = getSelectedArea();
    payBtn.disabled = true;

    if (method === 'cod') {
        payBtnText.textContent = 'Placing order…';
    } else {
        payBtnText.textContent = 'Processing payment…';
    }

    try {
        const payload = {
            shippingAddress: address,
            paymentType: method,
            deliveryArea: area
        };

        if (method === 'card') {
            payload.paymentMethodId = 'pm_card_visa'; // Stripe test token
        }

        const data = await apiRequest('/checkout', 'POST', payload, true);

        showToast(data.message || 'Order placed!');
        updateCartCount();

        // Brief delay so user sees the toast before redirect
        setTimeout(() => { window.location.href = 'orders.html'; }, 1200);

    } catch (err) {
        showMessage(err.message || 'Something went wrong. Please try again.', 'error');
        payBtn.disabled = false;
        updatePaymentUI(); // restore button text
    }
});

/* ---- Init ---- */
loadSummary();