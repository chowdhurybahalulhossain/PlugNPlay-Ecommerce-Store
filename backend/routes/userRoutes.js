const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
    getProfile,
    updateProfile,
    changePassword,
    listAddresses,
    createAddress,
    updateAddressHandler,
    deleteAddressHandler,
    makeDefaultAddress
} = require('../controllers/userController');

// All user routes require authentication
router.use(verifyToken);

// Profile
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/password', changePassword);

// Address Book
router.get('/addresses', listAddresses);
router.post('/addresses', createAddress);
router.put('/addresses/:id', updateAddressHandler);
router.delete('/addresses/:id', deleteAddressHandler);
router.put('/addresses/:id/default', makeDefaultAddress);

module.exports = router;
