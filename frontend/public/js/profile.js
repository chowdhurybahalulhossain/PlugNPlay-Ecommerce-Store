/* =====================================================
   profile.js — User Profile, Security & Address Book UX
   ===================================================== */

// State
let profileData = null;
let addresses = [];

// DOM Elements
const userAvatar        = document.getElementById('userAvatar');
const heroName          = document.getElementById('heroName');
const heroRole          = document.getElementById('heroRole');
const heroEmail         = document.getElementById('heroEmail');
const heroMeta          = document.getElementById('heroMeta');
const statOrders        = document.getElementById('statOrders');
const statSpent         = document.getElementById('statSpent');
const addressCountBadge = document.getElementById('addressCountBadge');

// Forms
const profileForm       = document.getElementById('profileForm');
const profileName       = document.getElementById('profileName');
const profileEmail      = document.getElementById('profileEmail');
const profilePhone      = document.getElementById('profilePhone');
const profileMsg        = document.getElementById('profileMsg');

const passwordForm      = document.getElementById('passwordForm');
const currentPassword   = document.getElementById('currentPassword');
const newPassword       = document.getElementById('newPassword');
const confirmPassword   = document.getElementById('confirmPassword');
const passwordMsg       = document.getElementById('passwordMsg');

// Address List & Modal
const addressesGrid     = document.getElementById('addressesGrid');
const addressModal      = document.getElementById('addressModal');
const addressForm       = document.getElementById('addressForm');
const modalTitle        = document.getElementById('modalTitle');
const editAddressId     = document.getElementById('editAddressId');
const addrLabel         = document.getElementById('addrLabel');
const addrRecipient     = document.getElementById('addrRecipient');
const addrPhone         = document.getElementById('addrPhone');
const addrLine          = document.getElementById('addrLine');
const addrCity          = document.getElementById('addrCity');
const addrIsDefault     = document.getElementById('addrIsDefault');
const labelPresets      = document.getElementById('labelPresets');

// Helpers
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));
const money = (n) => '৳' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
};

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short', year: 'numeric'
    });
};

const getLabelIcon = (label = '') => {
    const l = label.toLowerCase();
    if (l.includes('home')) return '🏠';
    if (l.includes('office') || l.includes('work')) return '🏢';
    if (l.includes('studio') || l.includes('gaming')) return '⚡';
    return '📍';
};

/* ---- Auth Check ---- */
if (!getToken()) {
    window.location.href = 'login.html';
}

/* ---- Tab Switching ---- */
document.querySelectorAll('.profile-tab[data-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.profile-tab').forEach(t => {
            t.classList.remove('active');
            t.setAttribute('aria-selected', 'false');
        });
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        const targetPane = document.getElementById(tab.dataset.tab);
        if (targetPane) targetPane.classList.add('active');
    });
});

/* ---- Load Profile from API ---- */
const loadProfile = async () => {
    try {
        const data = await apiRequest('/user/profile', 'GET', null, true);
        profileData = data.user;
        addresses   = data.addresses || [];

        // Render Hero
        userAvatar.textContent = getInitials(profileData.name);
        heroName.textContent   = profileData.name;
        heroEmail.textContent  = profileData.email;
        heroRole.textContent   = profileData.role === 'admin' ? '⚡ Administrator' : 'Customer';
        heroRole.className     = `role-pill ${profileData.role === 'admin' ? 'admin' : ''}`;
        heroMeta.textContent   = `Member since ${formatDate(profileData.created_at)}`;

        statOrders.textContent = profileData.total_orders;
        statSpent.textContent  = money(profileData.total_spent);

        // Pre-fill Personal Info Form
        profileName.value  = profileData.name || '';
        profileEmail.value = profileData.email || '';
        profilePhone.value = profileData.phone || '';

        // Render Addresses
        renderAddresses(addresses);

    } catch (err) {
        showToast('Failed to load profile details: ' + err.message, 'error');
        if (err.message.includes('token') || err.message.includes('auth')) {
            window.location.href = 'login.html';
        }
    }
};

/* ---- Personal Info Submit ---- */
profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameVal  = profileName.value.trim();
    const phoneVal = profilePhone.value.trim();

    if (!nameVal) {
        profileMsg.textContent = 'Please enter your name.';
        profileMsg.className = 'form-message error';
        return;
    }

    const btn = document.getElementById('btnSaveProfile');
    btn.disabled = true;
    btn.querySelector('span').textContent = 'Saving…';
    profileMsg.textContent = '';

    try {
        const res = await apiRequest('/user/profile', 'PUT', { name: nameVal, phone: phoneVal }, true);
        profileData.name  = res.user.name;
        profileData.phone = res.user.phone;

        // Update hero and localStorage
        heroName.textContent = res.user.name;
        userAvatar.textContent = getInitials(res.user.name);

        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        storedUser.name = res.user.name;
        localStorage.setItem('user', JSON.stringify(storedUser));

        showToast('Profile updated successfully');
        profileMsg.textContent = '✓ Changes saved!';
        profileMsg.className = 'form-message success';
        setTimeout(() => { profileMsg.textContent = ''; }, 3000);

    } catch (err) {
        profileMsg.textContent = err.message || 'Update failed.';
        profileMsg.className = 'form-message error';
    } finally {
        btn.disabled = false;
        btn.querySelector('span').textContent = 'Save Changes';
    }
});

/* ---- Security & Password Submit ---- */
passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const curVal  = currentPassword.value;
    const newVal  = newPassword.value;
    const confVal = confirmPassword.value;

    if (!curVal || !newVal || !confVal) {
        passwordMsg.textContent = 'All fields are required.';
        passwordMsg.className = 'form-message error';
        return;
    }

    if (newVal.length < 6) {
        passwordMsg.textContent = 'New password must be at least 6 characters.';
        passwordMsg.className = 'form-message error';
        return;
    }

    if (newVal !== confVal) {
        passwordMsg.textContent = 'Passwords do not match.';
        passwordMsg.className = 'form-message error';
        return;
    }

    const btn = document.getElementById('btnSavePassword');
    btn.disabled = true;
    btn.querySelector('span').textContent = 'Updating…';
    passwordMsg.textContent = '';

    try {
        await apiRequest('/user/password', 'PUT', { currentPassword: curVal, newPassword: newVal }, true);
        showToast('Password changed successfully');
        passwordMsg.textContent = '✓ Password updated successfully!';
        passwordMsg.className = 'form-message success';
        passwordForm.reset();
        setTimeout(() => { passwordMsg.textContent = ''; }, 3500);
    } catch (err) {
        passwordMsg.textContent = err.message || 'Failed to change password.';
        passwordMsg.className = 'form-message error';
    } finally {
        btn.disabled = false;
        btn.querySelector('span').textContent = 'Update Password';
    }
});

/* ---- Address Card HTML ---- */
const addressCardHTML = (addr) => {
    const isOut = addr.delivery_area === 'outside_dhaka';
    const zoneBadge = isOut ? 'Outside Dhaka (৳120)' : 'Inside Dhaka (৳60)';

    return `
    <article class="address-card ${addr.is_default ? 'is-default' : ''}" data-id="${addr.id}">
        <div class="addr-header">
            <span class="addr-tag">${getLabelIcon(addr.label)} ${esc(addr.label || 'Home')}</span>
            ${addr.is_default ? '<span class="default-badge">⭐ Default</span>' : ''}
        </div>
        <div class="addr-body">
            <div class="addr-recipient">${esc(addr.recipient_name || profileData?.name || 'Recipient')}</div>
            ${addr.phone ? `<div class="addr-phone">📞 ${esc(addr.phone)}</div>` : ''}
            <div class="addr-line">${esc(addr.address_line)}, ${esc(addr.city || 'Dhaka')}</div>
            <div class="addr-zone-pill">🚚 ${zoneBadge}</div>
        </div>
        <div class="addr-actions">
            <button type="button" class="btn-addr-action" data-action="edit" data-id="${addr.id}">Edit</button>
            <button type="button" class="btn-addr-action delete" data-action="delete" data-id="${addr.id}">Delete</button>
            ${!addr.is_default ? `<button type="button" class="btn-addr-action set-default" data-action="set-default" data-id="${addr.id}">Set Default</button>` : ''}
        </div>
    </article>`;
};

/* ---- Render Addresses Grid ---- */
const renderAddresses = (list) => {
    addressCountBadge.textContent = list.length;

    if (!list.length) {
        addressesGrid.innerHTML = `
            <div class="empty-addresses">
                <div class="empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                </div>
                <h3>No saved addresses yet</h3>
                <p>Save your home, office, or gaming studio address once and enjoy instant 1-click checkout whenever you order new gear.</p>
                <button type="button" class="btn btn-add-addr" onclick="openAddModal()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    <span>Add Your First Address</span>
                </button>
            </div>`;
        return;
    }

    addressesGrid.innerHTML = list.map(addressCardHTML).join('');
};

/* ---- Address Modal Open/Close ---- */
const openAddModal = () => {
    editAddressId.value = '';
    modalTitle.textContent = 'Add New Address';
    addressForm.reset();
    addrLabel.value = 'Home';
    addrCity.value  = 'Dhaka';
    addrRecipient.value = profileData?.name || '';
    addrPhone.value = profileData?.phone || '';
    addrIsDefault.checked = addresses.length === 0;

    // Reset presets
    labelPresets.querySelectorAll('.preset-chip').forEach(c => {
        c.classList.toggle('active', c.dataset.label === 'Home');
    });

    addressModal.hidden = false;
    addrRecipient.focus();
};

const openEditModal = (id) => {
    const addr = addresses.find(a => a.id === id);
    if (!addr) return;

    editAddressId.value = addr.id;
    modalTitle.textContent = 'Edit Delivery Address';
    addrLabel.value        = addr.label || 'Home';
    addrRecipient.value    = addr.recipient_name || '';
    addrPhone.value        = addr.phone || '';
    addrLine.value         = addr.address_line || '';
    addrCity.value         = addr.city || 'Dhaka';
    addrIsDefault.checked  = Boolean(addr.is_default);

    // Set delivery zone radio
    const zoneVal = addr.delivery_area || 'inside_dhaka';
    const targetRadio = document.querySelector(`input[name="modalDeliveryArea"][value="${zoneVal}"]`);
    if (targetRadio) targetRadio.checked = true;

    // Set preset chip state
    labelPresets.querySelectorAll('.preset-chip').forEach(c => {
        c.classList.toggle('active', c.dataset.label.toLowerCase() === (addr.label || '').toLowerCase());
    });

    addressModal.hidden = false;
};

const closeModal = () => {
    addressModal.hidden = true;
};

document.getElementById('btnOpenAddModal')?.addEventListener('click', openAddModal);
document.getElementById('btnCloseModal')?.addEventListener('click', closeModal);
document.getElementById('btnCancelAddr')?.addEventListener('click', closeModal);

// Close modal when clicking outside
addressModal?.addEventListener('click', (e) => {
    if (e.target === addressModal) closeModal();
});

// Preset Chips Click
labelPresets?.addEventListener('click', (e) => {
    const chip = e.target.closest('.preset-chip');
    if (!chip) return;
    labelPresets.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    addrLabel.value = chip.dataset.label;
});

/* ---- Address Form Submit (Create or Update) ---- */
addressForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = editAddressId.value ? Number(editAddressId.value) : null;
    const recipient = addrRecipient.value.trim();
    const phone     = addrPhone.value.trim();
    const line      = addrLine.value.trim();
    const city      = addrCity.value.trim() || 'Dhaka';
    const label     = addrLabel.value.trim() || 'Home';
    const isDefault = addrIsDefault.checked;
    const zone      = document.querySelector('input[name="modalDeliveryArea"]:checked')?.value || 'inside_dhaka';

    if (!line) {
        showToast('Please enter full address line', 'error');
        return;
    }

    const payload = {
        label,
        recipient_name: recipient,
        phone,
        address_line: line,
        city,
        delivery_area: zone,
        is_default: isDefault
    };

    const submitBtn = document.getElementById('btnSubmitAddr');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';

    try {
        if (id) {
            await apiRequest(`/user/addresses/${id}`, 'PUT', payload, true);
            showToast('Address updated');
        } else {
            await apiRequest('/user/addresses', 'POST', payload, true);
            showToast('New address saved');
        }

        // Re-fetch all addresses
        addresses = await apiRequest('/user/addresses', 'GET', null, true);
        renderAddresses(addresses);
        closeModal();

    } catch (err) {
        showToast(err.message || 'Failed to save address', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Address';
    }
});

/* ---- Address Actions (Edit, Delete, Set Default) ---- */
addressesGrid.addEventListener('click', async (e) => {
    const actionBtn = e.target.closest('[data-action]');
    if (!actionBtn) return;

    const action = actionBtn.dataset.action;
    const id     = Number(actionBtn.dataset.id);

    if (action === 'edit') {
        openEditModal(id);
    } else if (action === 'delete') {
        if (!confirm('Are you sure you want to remove this address?')) return;
        try {
            await apiRequest(`/user/addresses/${id}`, 'DELETE', null, true);
            showToast('Address removed');
            addresses = addresses.filter(a => a.id !== id);
            renderAddresses(addresses);
        } catch (err) {
            showToast(err.message || 'Failed to delete address', 'error');
        }
    } else if (action === 'set-default') {
        try {
            await apiRequest(`/user/addresses/${id}/default`, 'PUT', null, true);
            showToast('Default address updated');
            addresses = await apiRequest('/user/addresses', 'GET', null, true);
            renderAddresses(addresses);
        } catch (err) {
            showToast(err.message || 'Failed to set default', 'error');
        }
    }
});

/* ---- Global function for empty state button ---- */
window.openAddModal = openAddModal;

/* ---- Init ---- */
loadProfile();
