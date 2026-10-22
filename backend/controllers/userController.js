const bcrypt = require('bcrypt');
const {
    getUserProfile,
    updateUserProfile,
    updateUserPassword,
    findUserByIdWithPassword
} = require('../models/userModel');
const {
    getAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress
} = require('../models/addressModel');

/**
 * GET /api/user/profile
 */
const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const profile = await getUserProfile(userId);
        if (!profile) {
            return res.status(404).json({ error: 'User profile not found' });
        }

        const addresses = await getAddresses(userId);

        res.json({
            user: {
                id: profile.id,
                name: profile.name,
                email: profile.email,
                phone: profile.phone || '',
                role: profile.role,
                created_at: profile.created_at,
                total_orders: Number(profile.total_orders || 0),
                total_spent: Number(profile.total_spent || 0)
            },
            addresses
        });
    } catch (err) {
        console.error('getProfile error:', err);
        res.status(500).json({ error: 'Failed to load profile' });
    }
};

/**
 * PUT /api/user/profile
 */
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, phone } = req.body;

        if (!name || name.trim().length === 0) {
            return res.status(400).json({ error: 'Name cannot be empty' });
        }

        const updated = await updateUserProfile(userId, name.trim(), phone ? phone.trim() : null);

        res.json({
            message: 'Profile updated successfully',
            user: updated
        });
    } catch (err) {
        console.error('updateProfile error:', err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
};

/**
 * PUT /api/user/password
 */
const changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters long' });
        }

        const user = await findUserByIdWithPassword(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Incorrect current password' });
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        await updateUserPassword(userId, hashed);

        res.json({ message: 'Password changed successfully' });
    } catch (err) {
        console.error('changePassword error:', err);
        res.status(500).json({ error: 'Failed to change password' });
    }
};

/**
 * Address Book Handlers
 */
const listAddresses = async (req, res) => {
    try {
        const addresses = await getAddresses(req.user.id);
        res.json(addresses);
    } catch (err) {
        console.error('listAddresses error:', err);
        res.status(500).json({ error: 'Failed to load addresses' });
    }
};

const createAddress = async (req, res) => {
    try {
        const {
            label,
            recipient_name,
            phone,
            address_line,
            city,
            delivery_area,
            is_default
        } = req.body;

        if (!address_line || address_line.trim().length === 0) {
            return res.status(400).json({ error: 'Address line is required' });
        }

        const newAddress = await addAddress(req.user.id, {
            label: label ? label.trim() : 'Home',
            recipient_name: recipient_name ? recipient_name.trim() : '',
            phone: phone ? phone.trim() : '',
            address_line: address_line.trim(),
            city: city ? city.trim() : 'Dhaka',
            delivery_area: delivery_area === 'outside_dhaka' ? 'outside_dhaka' : 'inside_dhaka',
            is_default: Boolean(is_default)
        });

        res.status(201).json({
            message: 'Address saved successfully',
            address: newAddress
        });
    } catch (err) {
        console.error('createAddress error:', err);
        res.status(500).json({ error: 'Failed to create address' });
    }
};

const updateAddressHandler = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const {
            label,
            recipient_name,
            phone,
            address_line,
            city,
            delivery_area,
            is_default
        } = req.body;

        if (!address_line || address_line.trim().length === 0) {
            return res.status(400).json({ error: 'Address line is required' });
        }

        const updated = await updateAddress(id, req.user.id, {
            label: label ? label.trim() : 'Home',
            recipient_name: recipient_name ? recipient_name.trim() : '',
            phone: phone ? phone.trim() : '',
            address_line: address_line.trim(),
            city: city ? city.trim() : 'Dhaka',
            delivery_area: delivery_area === 'outside_dhaka' ? 'outside_dhaka' : 'inside_dhaka',
            is_default: is_default !== undefined ? Boolean(is_default) : undefined
        });

        if (!updated) {
            return res.status(404).json({ error: 'Address not found' });
        }

        res.json({
            message: 'Address updated successfully',
            address: updated
        });
    } catch (err) {
        console.error('updateAddressHandler error:', err);
        res.status(500).json({ error: 'Failed to update address' });
    }
};

const deleteAddressHandler = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const deleted = await deleteAddress(id, req.user.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Address not found' });
        }
        res.json({ message: 'Address removed successfully' });
    } catch (err) {
        console.error('deleteAddressHandler error:', err);
        res.status(500).json({ error: 'Failed to delete address' });
    }
};

const makeDefaultAddress = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const updated = await setDefaultAddress(id, req.user.id);
        if (!updated) {
            return res.status(404).json({ error: 'Address not found' });
        }
        res.json({ message: 'Default address updated', address: updated });
    } catch (err) {
        console.error('makeDefaultAddress error:', err);
        res.status(500).json({ error: 'Failed to set default address' });
    }
};

module.exports = {
    getProfile,
    updateProfile,
    changePassword,
    listAddresses,
    createAddress,
    updateAddressHandler,
    deleteAddressHandler,
    makeDefaultAddress
};
