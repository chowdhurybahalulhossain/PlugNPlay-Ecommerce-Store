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

/* ---- Saved Addresses Quick Selector ---- */
const savedAddressesSection = document.getElementById('savedAddressesSection');
const savedAddrChips = document.getElementById('savedAddrChips');

const getTagEmoji = (label) => {
    const l = (label || '').toLowerCase();
    if (l === 'home') return '🏠';
    if (l === 'office' || l === 'work') return '🏢';
    return '📍';
};

const selectAddress = (addr, chipEl) => {
    // 1. Update chip active state
    document.querySelectorAll('.saved-addr-chip').forEach(c => c.classList.remove('active'));
    if (chipEl) chipEl.classList.add('active');

    // 2. Populate shipping address textarea
    const addressInput = document.getElementById('shippingAddress');
    let text = addr.address_line;
    if (addr.city) text += `, ${addr.city}`;
    if (addr.recipient_name) text = `${addr.recipient_name} — ${text}`;
    if (addr.phone) text += ` (Phone: ${addr.phone})`;
    addressInput.value = text;

    // 3. Select matching delivery area
    const targetArea = addr.delivery_area === 'outside_dhaka' ? 'outside_dhaka' : 'inside_dhaka';
    const targetRadio = document.querySelector(`input[name="deliveryArea"][value="${targetArea}"]`);
    if (targetRadio) {
        targetRadio.checked = true;
        document.querySelectorAll('.area-card').forEach(c => c.classList.remove('active'));
        targetRadio.closest('.area-card')?.classList.add('active');
        localStorage.setItem('plugnplay_delivery_area', targetArea);
        updateSummaryTotals();
    }
};

const loadSavedAddresses = async () => {
    if (!getToken()) return;
    try {
        const addresses = await apiRequest('/user/addresses', 'GET', null, true);
        if (!Array.isArray(addresses) || addresses.length === 0) {
            if (savedAddressesSection) savedAddressesSection.hidden = true;
            return;
        }

        if (savedAddressesSection) savedAddressesSection.hidden = false;
        savedAddrChips.innerHTML = addresses.map((addr) => {
            const emoji = getTagEmoji(addr.label);
            return `
                <button type="button" class="saved-addr-chip" data-id="${addr.id}">
                    <div class="chip-top">
                        <span class="chip-tag">${emoji} ${esc(addr.label || 'Saved')}</span>
                        ${addr.is_default ? '<span class="chip-badge-default">Default</span>' : ''}
                    </div>
                    ${addr.recipient_name ? `<div class="chip-name">${esc(addr.recipient_name)}</div>` : ''}
                    <div class="chip-snippet">${esc(addr.address_line)}${addr.city ? ', ' + esc(addr.city) : ''}</div>
                </button>
            `;
        }).join('');

        // Attach click listeners to chips
        savedAddrChips.querySelectorAll('.saved-addr-chip').forEach((chip) => {
            chip.addEventListener('click', () => {
                const id = parseInt(chip.getAttribute('data-id'), 10);
                const found = addresses.find(a => a.id === id);
                if (found) {
                    selectAddress(found, chip);
                }
            });
        });

        // Pre-select default address if textarea is currently empty
        const currentVal = document.getElementById('shippingAddress').value.trim();
        if (!currentVal) {
            const defaultAddr = addresses.find(a => a.is_default) || addresses[0];
            const defaultChip = savedAddrChips.querySelector(`[data-id="${defaultAddr.id}"]`);
            if (defaultAddr) {
                selectAddress(defaultAddr, defaultChip);
            }
        }
    } catch (err) {
        console.warn('Failed to load saved addresses:', err);
    }
};

/* ---- Init ---- */
loadSummary();
loadSavedAddresses();