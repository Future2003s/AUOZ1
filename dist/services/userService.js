"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const User_1 = require("../models/User");
const AppError_1 = require("../utils/AppError");
const logger_1 = require("../utils/logger");
const normalizeEmail = (email) => email.trim().toLowerCase();
class UserService {
    /**
     * Get user profile by ID
     */
    static async getUserProfile(userId) {
        try {
            const user = await User_1.User.findById(userId);
            if (!user) {
                throw new AppError_1.AppError("User not found", 404);
            }
            return user;
        }
        catch (error) {
            logger_1.logger.error("Get user profile error:", error);
            throw error;
        }
    }
    /**
     * Update user profile
     */
    static async updateProfile(userId, updateData) {
        try {
            const user = await User_1.User.findById(userId);
            if (!user) {
                throw new AppError_1.AppError("User not found", 404);
            }
            // Update fields
            if (updateData.firstName)
                user.firstName = updateData.firstName;
            if (updateData.lastName)
                user.lastName = updateData.lastName;
            if (updateData.phone)
                user.phone = updateData.phone;
            await user.save();
            logger_1.logger.info(`Profile updated for user: ${user.email}`);
            return user;
        }
        catch (error) {
            logger_1.logger.error("Update profile error:", error);
            throw error;
        }
    }
    /**
     * Upload user avatar
     * @param userId - User ID
     * @param avatarUrl - Cloudinary URL or file path
     */
    static async uploadAvatar(userId, avatarUrl) {
        try {
            const user = await User_1.User.findById(userId);
            if (!user) {
                throw new AppError_1.AppError("User not found", 404);
            }
            // Update avatar URL (Cloudinary URL)
            user.avatar = avatarUrl;
            await user.save();
            logger_1.logger.info(`Avatar uploaded for user: ${user.email}`);
            return user;
        }
        catch (error) {
            logger_1.logger.error("Upload avatar error:", error);
            throw error;
        }
    }
    /**
     * Get user addresses
     */
    static async getUserAddresses(userId) {
        try {
            const user = await User_1.User.findById(userId);
            if (!user) {
                throw new AppError_1.AppError("User not found", 404);
            }
            return user.addresses;
        }
        catch (error) {
            logger_1.logger.error("Get user addresses error:", error);
            throw error;
        }
    }
    /**
     * Add new address
     */
    static async addAddress(userId, addressData) {
        try {
            const user = await User_1.User.findById(userId);
            if (!user) {
                throw new AppError_1.AppError("User not found", 404);
            }
            // If this is set as default, unset other defaults
            if (addressData.isDefault) {
                user.addresses.forEach((addr) => {
                    addr.isDefault = false;
                });
            }
            // Add new address
            user.addresses.push(addressData);
            await user.save();
            logger_1.logger.info(`Address added for user: ${user.email}`);
            return user;
        }
        catch (error) {
            logger_1.logger.error("Add address error:", error);
            throw error;
        }
    }
    /**
     * Update address
     */
    static async updateAddress(userId, addressId, addressData) {
        try {
            const user = await User_1.User.findById(userId);
            if (!user) {
                throw new AppError_1.AppError("User not found", 404);
            }
            const addressIndex = user.addresses.findIndex((addr) => addr._id?.toString() === addressId);
            if (addressIndex === -1) {
                throw new AppError_1.AppError("Address not found", 404);
            }
            // If setting as default, unset other defaults
            if (addressData.isDefault) {
                user.addresses.forEach((addr) => {
                    addr.isDefault = false;
                });
            }
            // Update address fields
            Object.assign(user.addresses[addressIndex], addressData);
            await user.save();
            logger_1.logger.info(`Address updated for user: ${user.email}`);
            return user;
        }
        catch (error) {
            logger_1.logger.error("Update address error:", error);
            throw error;
        }
    }
    /**
     * Delete address
     */
    static async deleteAddress(userId, addressId) {
        try {
            const user = await User_1.User.findById(userId);
            if (!user) {
                throw new AppError_1.AppError("User not found", 404);
            }
            const addressIndex = user.addresses.findIndex((addr) => addr._id?.toString() === addressId);
            if (addressIndex === -1) {
                throw new AppError_1.AppError("Address not found", 404);
            }
            user.addresses.splice(addressIndex, 1);
            await user.save();
            logger_1.logger.info(`Address deleted for user: ${user.email}`);
        }
        catch (error) {
            logger_1.logger.error("Delete address error:", error);
            throw error;
        }
    }
    /**
     * Set default address
     */
    static async setDefaultAddress(userId, addressId) {
        try {
            const user = await User_1.User.findById(userId);
            if (!user) {
                throw new AppError_1.AppError("User not found", 404);
            }
            const addressIndex = user.addresses.findIndex((addr) => addr._id?.toString() === addressId);
            if (addressIndex === -1) {
                throw new AppError_1.AppError("Address not found", 404);
            }
            // Unset all defaults
            user.addresses.forEach((addr) => {
                addr.isDefault = false;
            });
            // Set new default
            user.addresses[addressIndex].isDefault = true;
            await user.save();
            logger_1.logger.info(`Default address set for user: ${user.email}`);
            return user;
        }
        catch (error) {
            logger_1.logger.error("Set default address error:", error);
            throw error;
        }
    }
    /**
     * Update user preferences
     */
    static async updatePreferences(userId, preferencesData) {
        try {
            const user = await User_1.User.findById(userId);
            if (!user) {
                throw new AppError_1.AppError("User not found", 404);
            }
            // Update preferences
            if (preferencesData.language) {
                user.preferences.language = preferencesData.language;
            }
            if (preferencesData.currency) {
                user.preferences.currency = preferencesData.currency;
            }
            if (preferencesData.notifications) {
                Object.assign(user.preferences.notifications, preferencesData.notifications);
            }
            await user.save();
            logger_1.logger.info(`Preferences updated for user: ${user.email}`);
            return user;
        }
        catch (error) {
            logger_1.logger.error("Update preferences error:", error);
            throw error;
        }
    }
    /**
     * Delete user account (soft delete)
     */
    static async deleteAccount(userId) {
        try {
            const user = await User_1.User.findById(userId);
            if (!user) {
                throw new AppError_1.AppError("User not found", 404);
            }
            // Soft delete - deactivate account
            user.isActive = false;
            await user.save();
            logger_1.logger.info(`Account deleted for user: ${user.email}`);
        }
        catch (error) {
            logger_1.logger.error("Delete account error:", error);
            throw error;
        }
    }
    /**
     * Get user statistics (for admin)
     */
    /**
     * Get all users (Admin only)
     */
    static async getAllUsers(page = 1, limit = 20) {
        try {
            const skip = (page - 1) * limit;
            const users = await User_1.User.find()
                .select("-password -emailVerificationToken -passwordResetToken -passwordResetExpires")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean();
            const total = await User_1.User.countDocuments();
            return {
                users: users,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        }
        catch (error) {
            logger_1.logger.error("Get all users error:", error);
            throw error;
        }
    }
    /**
     * Update user role (Admin only)
     */
    static async updateUserRole(userId, role) {
        try {
            const user = await User_1.User.findById(userId);
            if (!user) {
                throw new AppError_1.AppError("User not found", 404);
            }
            user.role = role;
            await user.save();
            logger_1.logger.info(`User role updated: ${user.email} -> ${role}`);
            return user;
        }
        catch (error) {
            logger_1.logger.error("Update user role error:", error);
            throw error;
        }
    }
    /**
     * Update user status (Admin only)
     */
    static async updateUserStatus(userId, isActive) {
        try {
            const user = await User_1.User.findById(userId);
            if (!user) {
                throw new AppError_1.AppError("User not found", 404);
            }
            user.isActive = isActive;
            await user.save();
            logger_1.logger.info(`User status updated: ${user.email} -> ${isActive ? "active" : "inactive"}`);
            return user;
        }
        catch (error) {
            logger_1.logger.error("Update user status error:", error);
            throw error;
        }
    }
    /**
     * Reset login attempts for a user (Admin only)
     */
    static async resetLoginAttempts(userId) {
        try {
            const user = await User_1.User.findById(userId);
            if (!user) {
                throw new AppError_1.AppError("User not found", 404);
            }
            // Import rate limit cache
            const { CacheWrapper } = await import("../utils/performance.js");
            const rateLimitCache = new CacheWrapper("rate_limit", 900);
            // Clear login attempts for this user's email
            const rateLimitKey = `login_attempts:${normalizeEmail(user.email)}`;
            await rateLimitCache.del(rateLimitKey);
            logger_1.logger.info(`Login attempts reset for user: ${user.email}`);
        }
        catch (error) {
            logger_1.logger.error("Reset login attempts error:", error);
            throw error;
        }
    }
    /**
     * Get login attempts count for a user (Admin only)
     */
    static async getLoginAttempts(userId) {
        try {
            const user = await User_1.User.findById(userId);
            if (!user) {
                throw new AppError_1.AppError("User not found", 404);
            }
            // Import rate limit cache
            const { CacheWrapper } = await import("../utils/performance.js");
            const rateLimitCache = new CacheWrapper("rate_limit", 900);
            // Get login attempts for this user's email
            const rateLimitKey = `login_attempts:${normalizeEmail(user.email)}`;
            const attempts = Number((await rateLimitCache.get(rateLimitKey)) || 0);
            return attempts;
        }
        catch (error) {
            logger_1.logger.error("Get login attempts error:", error);
            throw error;
        }
    }
    /**
     * Delete user (Admin only)
     */
    static async deleteUser(userId) {
        try {
            const user = await User_1.User.findById(userId);
            if (!user) {
                throw new AppError_1.AppError("User not found", 404);
            }
            await User_1.User.findByIdAndDelete(userId);
            logger_1.logger.info(`User deleted: ${user.email}`);
        }
        catch (error) {
            logger_1.logger.error("Delete user error:", error);
            throw error;
        }
    }
    /**
     * Create user (Admin only)
     */
    static async createUser(userData) {
        try {
            // Check if user already exists
            const existingUser = await User_1.User.findOne({ email: userData.email });
            if (existingUser) {
                throw new AppError_1.AppError("User with this email already exists", 400);
            }
            // Create user
            const user = await User_1.User.create({
                firstName: userData.firstName,
                lastName: userData.lastName,
                email: userData.email,
                password: userData.password,
                role: userData.role || "customer",
                phone: userData.phone,
                isActive: true,
                isEmailVerified: false
            });
            logger_1.logger.info(`User created by admin: ${user.email}`);
            return user;
        }
        catch (error) {
            logger_1.logger.error("Create user error:", error);
            throw error;
        }
    }
    /**
     * Update user (Admin only)
     */
    static async updateUser(userId, updateData) {
        try {
            const user = await User_1.User.findById(userId);
            if (!user) {
                throw new AppError_1.AppError("User not found", 404);
            }
            // Check email uniqueness if email is being updated
            if (updateData.email && updateData.email !== user.email) {
                const existingUser = await User_1.User.findOne({ email: updateData.email });
                if (existingUser) {
                    throw new AppError_1.AppError("User with this email already exists", 400);
                }
                user.email = updateData.email;
            }
            if (updateData.firstName)
                user.firstName = updateData.firstName;
            if (updateData.lastName)
                user.lastName = updateData.lastName;
            if (updateData.phone !== undefined)
                user.phone = updateData.phone;
            if (updateData.role)
                user.role = updateData.role;
            if (updateData.isActive !== undefined)
                user.isActive = updateData.isActive;
            await user.save();
            logger_1.logger.info(`User updated by admin: ${user.email}`);
            return user;
        }
        catch (error) {
            logger_1.logger.error("Update user error:", error);
            throw error;
        }
    }
    static async getUserStats() {
        try {
            const totalUsers = await User_1.User.countDocuments();
            const activeUsers = await User_1.User.countDocuments({ isActive: true });
            const verifiedUsers = await User_1.User.countDocuments({ isEmailVerified: true });
            const recentUsers = await User_1.User.countDocuments({
                createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
            });
            return {
                totalUsers,
                activeUsers,
                verifiedUsers,
                recentUsers,
                inactiveUsers: totalUsers - activeUsers,
                unverifiedUsers: totalUsers - verifiedUsers
            };
        }
        catch (error) {
            logger_1.logger.error("Get user stats error:", error);
            throw error;
        }
    }
}
exports.UserService = UserService;
