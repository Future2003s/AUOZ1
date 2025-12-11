"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCartItemCount = exports.mergeGuestCart = exports.validateCart = exports.getCartSummary = exports.clearCart = exports.removeFromCart = exports.updateCartItem = exports.addToCart = exports.getCart = void 0;
const cartService_1 = require("../services/cartService");
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const eventService_1 = require("../services/eventService");
// @desc    Get cart
// @route   GET /api/v1/cart
// @access  Public (with session) / Private
exports.getCart = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const userId = req.user?.id;
    const sessionId = req.sessionID || req.headers["x-session-id"];
    const cart = await cartService_1.CartService.getCart(userId, sessionId);
    response_1.ResponseHandler.success(res, cart, "Cart retrieved successfully");
});
// @desc    Add item to cart
// @route   POST /api/v1/cart/items
// @access  Public (with session) / Private
exports.addToCart = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const userId = req.user?.id;
    const sessionId = req.sessionID || req.headers["x-session-id"];
    const { productId, quantity, variant } = req.body;
    if (!productId || !quantity) {
        return response_1.ResponseHandler.badRequest(res, "Product ID and quantity are required");
    }
    if (quantity <= 0) {
        return response_1.ResponseHandler.badRequest(res, "Quantity must be greater than 0");
    }
    const cart = await cartService_1.CartService.addToCart({ productId, quantity, variant }, userId, sessionId);
    // Track add to cart event
    await eventService_1.eventService.emitProductEvent({
        productId,
        action: "add_to_cart",
        quantity,
        userId,
        sessionId,
        metadata: {
            variant,
            userAgent: req.get("User-Agent"),
            ip: req.ip
        }
    });
    response_1.ResponseHandler.success(res, cart, "Item added to cart successfully");
});
// @desc    Update cart item
// @route   PUT /api/v1/cart/items/:productId
// @access  Public (with session) / Private
exports.updateCartItem = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const userId = req.user?.id;
    const sessionId = req.sessionID || req.headers["x-session-id"];
    const { productId } = req.params;
    const { quantity } = req.body;
    if (quantity === undefined || quantity < 0) {
        return response_1.ResponseHandler.badRequest(res, "Valid quantity is required");
    }
    const cart = await cartService_1.CartService.updateCartItem({ productId, quantity }, userId, sessionId);
    response_1.ResponseHandler.success(res, cart, "Cart item updated successfully");
});
// @desc    Remove item from cart
// @route   DELETE /api/v1/cart/items/:productId
// @access  Public (with session) / Private
exports.removeFromCart = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const userId = req.user?.id;
    const sessionId = req.sessionID || req.headers["x-session-id"];
    const { productId } = req.params;
    const cart = await cartService_1.CartService.removeFromCart(productId, userId, sessionId);
    response_1.ResponseHandler.success(res, cart, "Item removed from cart successfully");
});
// @desc    Clear cart
// @route   DELETE /api/v1/cart
// @access  Public (with session) / Private
exports.clearCart = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const userId = req.user?.id;
    const sessionId = req.sessionID || req.headers["x-session-id"];
    const cart = await cartService_1.CartService.clearCart(userId, sessionId);
    response_1.ResponseHandler.success(res, cart, "Cart cleared successfully");
});
// @desc    Get cart summary
// @route   GET /api/v1/cart/summary
// @access  Public (with session) / Private
exports.getCartSummary = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const userId = req.user?.id;
    const sessionId = req.sessionID || req.headers["x-session-id"];
    const result = await cartService_1.CartService.getCartSummary(userId, sessionId);
    res.status(200).json({
        success: true,
        message: "Cart summary retrieved successfully",
        data: result.cart,
        summary: result.summary
    });
});
// @desc    Validate cart
// @route   GET /api/v1/cart/validate
// @access  Public (with session) / Private
exports.validateCart = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const userId = req.user?.id;
    const sessionId = req.sessionID || req.headers["x-session-id"];
    const result = await cartService_1.CartService.validateCart(userId, sessionId);
    res.status(200).json({
        success: true,
        message: "Cart validation completed",
        data: result.cart,
        issues: result.issues,
        isValid: result.issues.length === 0
    });
});
// @desc    Merge guest cart with user cart
// @route   POST /api/v1/cart/merge
// @access  Private
exports.mergeGuestCart = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const userId = req.user.id;
    const { sessionId } = req.body;
    if (!sessionId) {
        return response_1.ResponseHandler.badRequest(res, "Session ID is required");
    }
    const cart = await cartService_1.CartService.mergeGuestCart(userId, sessionId);
    response_1.ResponseHandler.success(res, cart, "Guest cart merged successfully");
});
// @desc    Get cart item count
// @route   GET /api/v1/cart/count
// @access  Public (with session) / Private
exports.getCartItemCount = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const userId = req.user?.id;
    const sessionId = req.sessionID || req.headers["x-session-id"];
    const cart = await cartService_1.CartService.getCart(userId, sessionId);
    response_1.ResponseHandler.success(res, {
        totalItems: cart.totalItems,
        uniqueItems: cart.items.length
    }, "Cart item count retrieved successfully");
});
