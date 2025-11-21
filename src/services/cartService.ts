import { Cart, ICart } from '../models/Cart';
import { Product } from '../models/Product';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

interface AddToCartData {
    productId: string;
    quantity: number;
    variant?: Array<{
        name: string;
        value: string;
    }>;
}

interface UpdateCartItemData {
    productId: string;
    quantity: number;
}

export class CartService {
    /**
     * Get or create cart for user
     */
    static async getOrCreateCart(userId?: string, sessionId?: string): Promise<ICart> {
        try {
            let cart: ICart | null = null;

            if (userId) {
                cart = await Cart.findOne({ user: userId, isActive: true })
                    .populate('items.product', 'name price images sku isInStock finalPrice');
            } else if (sessionId) {
                cart = await Cart.findOne({ sessionId, isActive: true })
                    .populate('items.product', 'name price images sku isInStock finalPrice');
            }

            if (!cart) {
                cart = await Cart.create({
                    user: userId || undefined,
                    sessionId: sessionId || undefined,
                    items: [],
                    totalItems: 0,
                    totalPrice: 0
                });
            }

            return cart;
        } catch (error) {
            logger.error('Get or create cart error:', error);
            throw error;
        }
    }

    /**
     * Add item to cart
     */
    static async addToCart(
        cartData: AddToCartData,
        userId?: string,
        sessionId?: string
    ): Promise<ICart> {
        try {
            const { productId, quantity, variant } = cartData;

            // Validate product exists and is available
            const product = await Product.findById(productId);
            if (!product) {
                throw new AppError('Product not found', 404);
            }

            if (product.status !== 'active' || !product.isVisible) {
                throw new AppError('Product is not available', 400);
            }

            // Check stock availability
            if (product.trackQuantity && product.quantity < quantity) {
                throw new AppError(`Only ${product.quantity} items available in stock`, 400);
            }

            // Get or create cart
            const cart = await this.getOrCreateCart(userId, sessionId);

            // Add item to cart with current product price
            await cart.addItem(productId, quantity, product.finalPrice, variant);

            // Populate and return updated cart
            await cart.populate('items.product', 'name price images sku isInStock finalPrice');

            logger.info(`Item added to cart: ${productId} x${quantity} for ${userId ? 'user:' + userId : 'session:' + sessionId}`);
            return cart;
        } catch (error) {
            logger.error('Add to cart error:', error);
            throw error;
        }
    }

    /**
     * Update cart item quantity
     */
    static async updateCartItem(
        updateData: UpdateCartItemData,
        userId?: string,
        sessionId?: string
    ): Promise<ICart> {
        try {
            const { productId, quantity } = updateData;

            // Get cart
            const cart = await this.getOrCreateCart(userId, sessionId);

            if (cart.isEmpty) {
                throw new AppError('Cart is empty', 400);
            }

            // Validate product exists if quantity > 0
            if (quantity > 0) {
                const product = await Product.findById(productId);
                if (!product) {
                    throw new AppError('Product not found', 404);
                }

                // Check stock availability
                if (product.trackQuantity && product.quantity < quantity) {
                    throw new AppError(`Only ${product.quantity} items available in stock`, 400);
                }
            }

            // Update item
            await cart.updateItem(productId, quantity);

            // Populate and return updated cart
            await cart.populate('items.product', 'name price images sku isInStock finalPrice');

            logger.info(`Cart item updated: ${productId} quantity: ${quantity} for ${userId ? 'user:' + userId : 'session:' + sessionId}`);
            return cart;
        } catch (error) {
            logger.error('Update cart item error:', error);
            throw error;
        }
    }

    /**
     * Remove item from cart
     */
    static async removeFromCart(
        productId: string,
        userId?: string,
        sessionId?: string
    ): Promise<ICart> {
        try {
            // Get cart
            const cart = await this.getOrCreateCart(userId, sessionId);

            if (cart.isEmpty) {
                throw new AppError('Cart is empty', 400);
            }

            // Remove item
            await cart.removeItem(productId);

            // Populate and return updated cart
            await cart.populate('items.product', 'name price images sku isInStock finalPrice');

            logger.info(`Item removed from cart: ${productId} for ${userId ? 'user:' + userId : 'session:' + sessionId}`);
            return cart;
        } catch (error) {
            logger.error('Remove from cart error:', error);
            throw error;
        }
    }

    /**
     * Clear entire cart
     */
    static async clearCart(userId?: string, sessionId?: string): Promise<ICart> {
        try {
            // Get cart
            const cart = await this.getOrCreateCart(userId, sessionId);

            // Clear cart
            await cart.clearCart();

            logger.info(`Cart cleared for ${userId ? 'user:' + userId : 'session:' + sessionId}`);
            return cart;
        } catch (error) {
            logger.error('Clear cart error:', error);
            throw error;
        }
    }

    /**
     * Get cart contents
     */
    static async getCart(userId?: string, sessionId?: string): Promise<ICart> {
        try {
            const cart = await this.getOrCreateCart(userId, sessionId);
            return cart;
        } catch (error) {
            logger.error('Get cart error:', error);
            throw error;
        }
    }

    /**
     * Merge guest cart with user cart (when user logs in)
     */
    static async mergeGuestCart(userId: string, sessionId: string): Promise<ICart> {
        try {
            // Get guest cart
            const guestCart = await Cart.findOne({ sessionId, isActive: true });
            if (!guestCart || guestCart.isEmpty) {
                // No guest cart or empty, just return user cart
                return this.getOrCreateCart(userId);
            }

            // Get or create user cart
            const userCart = await this.getOrCreateCart(userId);

            // Merge items from guest cart to user cart
            for (const guestItem of guestCart.items) {
                await userCart.addItem(
                    guestItem.product.toString(),
                    guestItem.quantity,
                    guestItem.price,
                    guestItem.variant
                );
            }

            // Deactivate guest cart
            guestCart.isActive = false;
            await guestCart.save();

            // Populate and return merged cart
            await userCart.populate('items.product', 'name price images sku isInStock finalPrice');

            logger.info(`Guest cart merged with user cart: ${userId}`);
            return userCart;
        } catch (error) {
            logger.error('Merge guest cart error:', error);
            throw error;
        }
    }

    /**
     * Validate cart items (check availability, prices, stock)
     */
    static async validateCart(userId?: string, sessionId?: string): Promise<{
        cart: ICart;
        issues: Array<{
            productId: string;
            issue: string;
            currentPrice?: number;
            availableStock?: number;
        }>;
    }> {
        try {
            const cart = await this.getOrCreateCart(userId, sessionId);
            const issues: Array<{
                productId: string;
                issue: string;
                currentPrice?: number;
                availableStock?: number;
            }> = [];

            // Check each item
            for (const item of cart.items) {
                const product = await Product.findById(item.product);
                
                if (!product) {
                    issues.push({
                        productId: item.product.toString(),
                        issue: 'Product no longer exists'
                    });
                    continue;
                }

                if (product.status !== 'active' || !product.isVisible) {
                    issues.push({
                        productId: item.product.toString(),
                        issue: 'Product is no longer available'
                    });
                    continue;
                }

                // Check stock
                if (product.trackQuantity && product.quantity < item.quantity) {
                    issues.push({
                        productId: item.product.toString(),
                        issue: 'Insufficient stock',
                        availableStock: product.quantity
                    });
                }

                // Check price changes
                if (Math.abs(product.finalPrice - item.price) > 0.01) {
                    issues.push({
                        productId: item.product.toString(),
                        issue: 'Price has changed',
                        currentPrice: product.finalPrice
                    });
                }
            }

            return { cart, issues };
        } catch (error) {
            logger.error('Validate cart error:', error);
            throw error;
        }
    }

    /**
     * Get cart summary for checkout
     */
    static async getCartSummary(userId?: string, sessionId?: string): Promise<{
        cart: ICart;
        summary: {
            subtotal: number;
            totalItems: number;
            currency: string;
            isValid: boolean;
            issues: any[];
        };
    }> {
        try {
            const { cart, issues } = await this.validateCart(userId, sessionId);

            const summary = {
                subtotal: cart.totalPrice,
                totalItems: cart.totalItems,
                currency: cart.currency,
                isValid: issues.length === 0,
                issues
            };

            return { cart, summary };
        } catch (error) {
            logger.error('Get cart summary error:', error);
            throw error;
        }
    }
}
