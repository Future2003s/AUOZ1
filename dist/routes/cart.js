"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const rateLimiting_1 = require("../middleware/rateLimiting");
const unifiedValidation_1 = require("../middleware/unifiedValidation");
const cartController_1 = require("../controllers/cartController");
const router = (0, express_1.Router)();
// Public routes (work with session ID for guest users) with rate limiting
router.get("/count", rateLimiting_1.cartRateLimit, cartController_1.getCartItemCount);
router.get("/summary", rateLimiting_1.cartRateLimit, cartController_1.getCartSummary);
router.get("/validate", rateLimiting_1.cartRateLimit, cartController_1.validateCart);
router.get("/", rateLimiting_1.cartRateLimit, cartController_1.getCart);
router.post("/items", rateLimiting_1.cartRateLimit, unifiedValidation_1.validateAddToCart, cartController_1.addToCart);
router.put("/items/:productId", rateLimiting_1.cartRateLimit, unifiedValidation_1.validateCartProductId, unifiedValidation_1.validateUpdateCartItem, cartController_1.updateCartItem);
router.delete("/items/:productId", rateLimiting_1.cartRateLimit, unifiedValidation_1.validateCartProductId, cartController_1.removeFromCart);
router.delete("/clear", rateLimiting_1.cartRateLimit, cartController_1.clearCart);
// Protected routes (require authentication) with rate limiting
router.post("/merge", auth_1.protect, rateLimiting_1.cartRateLimit, cartController_1.mergeGuestCart);
exports.default = router;
