const {
    getWishlist,
    getWishlistProductIds,
    addToWishlist,
    removeFromWishlist,
    isProductInWishlist
} = require('../models/wishlistModel');

/**
 * GET /api/wishlist
 * Protected: Returns user's wishlist products
 */
const getWishlistHandler = async (req, res) => {
    try {
        const items = await getWishlist(req.user.id);
        res.json(items);
    } catch (err) {
        console.error('getWishlistHandler error:', err);
        res.status(500).json({ error: 'Failed to fetch wishlist' });
    }
};

/**
 * GET /api/wishlist/ids
 * Protected: Returns array of product IDs in wishlist
 */
const getWishlistIdsHandler = async (req, res) => {
    try {
        const ids = await getWishlistProductIds(req.user.id);
        res.json(ids);
    } catch (err) {
        console.error('getWishlistIdsHandler error:', err);
        res.status(500).json({ error: 'Failed to fetch wishlist IDs' });
    }
};

/**
 * POST /api/wishlist/toggle/:productId
 * Protected: Adds if absent, removes if present
 */
const toggleWishlistHandler = async (req, res) => {
    try {
        const rawId = req.params.productId || req.body.productId;
        const productId = parseInt(rawId, 10);
        if (isNaN(productId)) {
            return res.status(400).json({ error: 'Invalid product ID' });
        }

        const exists = await isProductInWishlist(req.user.id, productId);
        if (exists) {
            await removeFromWishlist(req.user.id, productId);
            return res.json({
                action: 'removed',
                inWishlist: false,
                message: 'Removed from your wishlist'
            });
        } else {
            await addToWishlist(req.user.id, productId);
            return res.json({
                action: 'added',
                inWishlist: true,
                message: 'Saved to your wishlist!'
            });
        }
    } catch (err) {
        console.error('toggleWishlistHandler error:', err);
        res.status(500).json({ error: 'Failed to update wishlist' });
    }
};

/**
 * DELETE /api/wishlist/:productId
 * Protected: Explicit removal
 */
const removeFromWishlistHandler = async (req, res) => {
    try {
        const productId = parseInt(req.params.productId, 10);
        await removeFromWishlist(req.user.id, productId);
        res.json({ message: 'Item removed from wishlist' });
    } catch (err) {
        console.error('removeFromWishlistHandler error:', err);
        res.status(500).json({ error: 'Failed to remove from wishlist' });
    }
};

module.exports = {
    getWishlistHandler,
    getWishlistIdsHandler,
    toggleWishlistHandler,
    removeFromWishlistHandler
};
