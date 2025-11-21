import { Request, Response, NextFunction } from "express";
import { CartService } from "../services/cartService";
import { asyncHandler } from "../utils/asyncHandler";
import { ResponseHandler } from "../utils/response";
import { eventService } from "../services/eventService";
import { performanceMonitor } from "../utils/performance";

// @desc    Get cart
// @route   GET /api/v1/cart
// @access  Public (with session) / Private
export const getCart = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const sessionId = (req as any).sessionID || (req.headers["x-session-id"] as string);

    const cart = await CartService.getCart(userId, sessionId);
    ResponseHandler.success(res, cart, "Cart retrieved successfully");
});

// @desc    Add item to cart
// @route   POST /api/v1/cart/items
// @access  Public (with session) / Private
export const addToCart = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const sessionId = (req as any).sessionID || (req.headers["x-session-id"] as string);
    const { productId, quantity, variant } = req.body;

    if (!productId || !quantity) {
        return ResponseHandler.badRequest(res, "Product ID and quantity are required");
    }

    if (quantity <= 0) {
        return ResponseHandler.badRequest(res, "Quantity must be greater than 0");
    }

    const cart = await CartService.addToCart({ productId, quantity, variant }, userId, sessionId);

    // Track add to cart event
    await eventService.emitProductEvent({
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

    ResponseHandler.success(res, cart, "Item added to cart successfully");
});

// @desc    Update cart item
// @route   PUT /api/v1/cart/items/:productId
// @access  Public (with session) / Private
export const updateCartItem = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const sessionId = (req as any).sessionID || (req.headers["x-session-id"] as string);
    const { productId } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined || quantity < 0) {
        return ResponseHandler.badRequest(res, "Valid quantity is required");
    }

    const cart = await CartService.updateCartItem({ productId, quantity }, userId, sessionId);

    ResponseHandler.success(res, cart, "Cart item updated successfully");
});

// @desc    Remove item from cart
// @route   DELETE /api/v1/cart/items/:productId
// @access  Public (with session) / Private
export const removeFromCart = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const sessionId = (req as any).sessionID || (req.headers["x-session-id"] as string);
    const { productId } = req.params;

    const cart = await CartService.removeFromCart(productId, userId, sessionId);
    ResponseHandler.success(res, cart, "Item removed from cart successfully");
});

// @desc    Clear cart
// @route   DELETE /api/v1/cart
// @access  Public (with session) / Private
export const clearCart = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const sessionId = (req as any).sessionID || (req.headers["x-session-id"] as string);

    const cart = await CartService.clearCart(userId, sessionId);
    ResponseHandler.success(res, cart, "Cart cleared successfully");
});

// @desc    Get cart summary
// @route   GET /api/v1/cart/summary
// @access  Public (with session) / Private
export const getCartSummary = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const sessionId = (req as any).sessionID || (req.headers["x-session-id"] as string);

    const result = await CartService.getCartSummary(userId, sessionId);

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
export const validateCart = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const sessionId = (req as any).sessionID || (req.headers["x-session-id"] as string);

    const result = await CartService.validateCart(userId, sessionId);

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
export const mergeGuestCart = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.id;
    const { sessionId } = req.body;

    if (!sessionId) {
        return ResponseHandler.badRequest(res, "Session ID is required");
    }

    const cart = await CartService.mergeGuestCart(userId, sessionId);
    ResponseHandler.success(res, cart, "Guest cart merged successfully");
});

// @desc    Get cart item count
// @route   GET /api/v1/cart/count
// @access  Public (with session) / Private
export const getCartItemCount = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const sessionId = (req as any).sessionID || (req.headers["x-session-id"] as string);

    const cart = await CartService.getCart(userId, sessionId);

    ResponseHandler.success(
        res,
        {
            totalItems: cart.totalItems,
            uniqueItems: cart.items.length
        },
        "Cart item count retrieved successfully"
    );
});
