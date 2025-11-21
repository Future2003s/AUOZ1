import { User, IUser } from "../models/User";
import { AppError } from "../utils/AppError";
import { logger } from "../utils/logger";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

interface UpdateProfileData {
    firstName?: string;
    lastName?: string;
    phone?: string;
}

interface AddressData {
    type: "home" | "work" | "other";
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    isDefault?: boolean;
}

interface PreferencesData {
    language?: string;
    currency?: string;
    notifications?: {
        email?: boolean;
        sms?: boolean;
        push?: boolean;
    };
}

export class UserService {
    /**
     * Get user profile by ID
     */
    static async getUserProfile(userId: string): Promise<IUser> {
        try {
            const user = await User.findById(userId);

            if (!user) {
                throw new AppError("User not found", 404);
            }

            return user;
        } catch (error) {
            logger.error("Get user profile error:", error);
            throw error;
        }
    }

    /**
     * Update user profile
     */
    static async updateProfile(userId: string, updateData: UpdateProfileData): Promise<IUser> {
        try {
            const user = await User.findById(userId);

            if (!user) {
                throw new AppError("User not found", 404);
            }

            // Update fields
            if (updateData.firstName) user.firstName = updateData.firstName;
            if (updateData.lastName) user.lastName = updateData.lastName;
            if (updateData.phone) user.phone = updateData.phone;

            await user.save();

            logger.info(`Profile updated for user: ${user.email}`);
            return user;
        } catch (error) {
            logger.error("Update profile error:", error);
            throw error;
        }
    }

    /**
     * Upload user avatar
     * @param userId - User ID
     * @param avatarUrl - Cloudinary URL or file path
     */
    static async uploadAvatar(userId: string, avatarUrl: string): Promise<IUser> {
        try {
            const user = await User.findById(userId);

            if (!user) {
                throw new AppError("User not found", 404);
            }

            // Update avatar URL (Cloudinary URL)
            user.avatar = avatarUrl;
            await user.save();

            logger.info(`Avatar uploaded for user: ${user.email}`);
            return user;
        } catch (error) {
            logger.error("Upload avatar error:", error);
            throw error;
        }
    }

    /**
     * Get user addresses
     */
    static async getUserAddresses(userId: string): Promise<any[]> {
        try {
            const user = await User.findById(userId);

            if (!user) {
                throw new AppError("User not found", 404);
            }

            return user.addresses;
        } catch (error) {
            logger.error("Get user addresses error:", error);
            throw error;
        }
    }

    /**
     * Add new address
     */
    static async addAddress(userId: string, addressData: AddressData): Promise<IUser> {
        try {
            const user = await User.findById(userId);

            if (!user) {
                throw new AppError("User not found", 404);
            }

            // If this is set as default, unset other defaults
            if (addressData.isDefault) {
                user.addresses.forEach((addr) => {
                    addr.isDefault = false;
                });
            }

            // Add new address
            user.addresses.push(addressData as any);
            await user.save();

            logger.info(`Address added for user: ${user.email}`);
            return user;
        } catch (error) {
            logger.error("Add address error:", error);
            throw error;
        }
    }

    /**
     * Update address
     */
    static async updateAddress(userId: string, addressId: string, addressData: Partial<AddressData>): Promise<IUser> {
        try {
            const user = await User.findById(userId);

            if (!user) {
                throw new AppError("User not found", 404);
            }

            const addressIndex = user.addresses.findIndex((addr) => addr._id?.toString() === addressId);
            if (addressIndex === -1) {
                throw new AppError("Address not found", 404);
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

            logger.info(`Address updated for user: ${user.email}`);
            return user;
        } catch (error) {
            logger.error("Update address error:", error);
            throw error;
        }
    }

    /**
     * Delete address
     */
    static async deleteAddress(userId: string, addressId: string): Promise<void> {
        try {
            const user = await User.findById(userId);

            if (!user) {
                throw new AppError("User not found", 404);
            }

            const addressIndex = user.addresses.findIndex((addr) => addr._id?.toString() === addressId);
            if (addressIndex === -1) {
                throw new AppError("Address not found", 404);
            }

            user.addresses.splice(addressIndex, 1);
            await user.save();

            logger.info(`Address deleted for user: ${user.email}`);
        } catch (error) {
            logger.error("Delete address error:", error);
            throw error;
        }
    }

    /**
     * Set default address
     */
    static async setDefaultAddress(userId: string, addressId: string): Promise<IUser> {
        try {
            const user = await User.findById(userId);

            if (!user) {
                throw new AppError("User not found", 404);
            }

            const addressIndex = user.addresses.findIndex((addr) => addr._id?.toString() === addressId);
            if (addressIndex === -1) {
                throw new AppError("Address not found", 404);
            }

            // Unset all defaults
            user.addresses.forEach((addr) => {
                addr.isDefault = false;
            });

            // Set new default
            user.addresses[addressIndex].isDefault = true;
            await user.save();

            logger.info(`Default address set for user: ${user.email}`);
            return user;
        } catch (error) {
            logger.error("Set default address error:", error);
            throw error;
        }
    }

    /**
     * Update user preferences
     */
    static async updatePreferences(userId: string, preferencesData: PreferencesData): Promise<IUser> {
        try {
            const user = await User.findById(userId);

            if (!user) {
                throw new AppError("User not found", 404);
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

            logger.info(`Preferences updated for user: ${user.email}`);
            return user;
        } catch (error) {
            logger.error("Update preferences error:", error);
            throw error;
        }
    }

    /**
     * Delete user account (soft delete)
     */
    static async deleteAccount(userId: string): Promise<void> {
        try {
            const user = await User.findById(userId);

            if (!user) {
                throw new AppError("User not found", 404);
            }

            // Soft delete - deactivate account
            user.isActive = false;
            await user.save();

            logger.info(`Account deleted for user: ${user.email}`);
        } catch (error) {
            logger.error("Delete account error:", error);
            throw error;
        }
    }

    /**
     * Get user statistics (for admin)
     */
    /**
     * Get all users (Admin only)
     */
    static async getAllUsers(page: number = 1, limit: number = 20): Promise<{
        users: IUser[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }> {
        try {
            const skip = (page - 1) * limit;
            const users = await User.find()
                .select("-password -emailVerificationToken -passwordResetToken -passwordResetExpires")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean();

            const total = await User.countDocuments();

            return {
                users: users as IUser[],
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error("Get all users error:", error);
            throw error;
        }
    }

    /**
     * Update user role (Admin only)
     */
    static async updateUserRole(userId: string, role: "customer" | "admin" | "seller"): Promise<IUser> {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new AppError("User not found", 404);
            }

            user.role = role;
            await user.save();

            logger.info(`User role updated: ${user.email} -> ${role}`);
            return user;
        } catch (error) {
            logger.error("Update user role error:", error);
            throw error;
        }
    }

    /**
     * Update user status (Admin only)
     */
    static async updateUserStatus(userId: string, isActive: boolean): Promise<IUser> {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new AppError("User not found", 404);
            }

            user.isActive = isActive;
            await user.save();

            logger.info(`User status updated: ${user.email} -> ${isActive ? "active" : "inactive"}`);
            return user;
        } catch (error) {
            logger.error("Update user status error:", error);
            throw error;
        }
    }

    /**
     * Reset login attempts for a user (Admin only)
     */
    static async resetLoginAttempts(userId: string): Promise<void> {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new AppError("User not found", 404);
            }

            // Import rate limit cache
            const { CacheWrapper } = await import("../utils/performance");
            const rateLimitCache = new CacheWrapper("rate_limit", 900);
            
            // Clear login attempts for this user's email
            const rateLimitKey = `login_attempts:${normalizeEmail(user.email)}`;
            await rateLimitCache.del(rateLimitKey);

            logger.info(`Login attempts reset for user: ${user.email}`);
        } catch (error) {
            logger.error("Reset login attempts error:", error);
            throw error;
        }
    }

    /**
     * Get login attempts count for a user (Admin only)
     */
    static async getLoginAttempts(userId: string): Promise<number> {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new AppError("User not found", 404);
            }

            // Import rate limit cache
            const { CacheWrapper } = await import("../utils/performance");
            const rateLimitCache = new CacheWrapper("rate_limit", 900);
            
            // Get login attempts for this user's email
            const rateLimitKey = `login_attempts:${normalizeEmail(user.email)}`;
            const attempts = Number((await rateLimitCache.get(rateLimitKey)) || 0);

            return attempts;
        } catch (error) {
            logger.error("Get login attempts error:", error);
            throw error;
        }
    }

    /**
     * Delete user (Admin only)
     */
    static async deleteUser(userId: string): Promise<void> {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new AppError("User not found", 404);
            }

            await User.findByIdAndDelete(userId);
            logger.info(`User deleted: ${user.email}`);
        } catch (error) {
            logger.error("Delete user error:", error);
            throw error;
        }
    }

    /**
     * Create user (Admin only)
     */
    static async createUser(userData: {
        firstName: string;
        lastName: string;
        email: string;
        password: string;
        role?: "customer" | "admin" | "seller";
        phone?: string;
    }): Promise<IUser> {
        try {
            // Check if user already exists
            const existingUser = await User.findOne({ email: userData.email });
            if (existingUser) {
                throw new AppError("User with this email already exists", 400);
            }

            // Create user
            const user = await User.create({
                firstName: userData.firstName,
                lastName: userData.lastName,
                email: userData.email,
                password: userData.password,
                role: userData.role || "customer",
                phone: userData.phone,
                isActive: true,
                isEmailVerified: false
            });

            logger.info(`User created by admin: ${user.email}`);
            return user;
        } catch (error) {
            logger.error("Create user error:", error);
            throw error;
        }
    }

    /**
     * Update user (Admin only)
     */
    static async updateUser(userId: string, updateData: {
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
        role?: "customer" | "admin" | "seller";
        isActive?: boolean;
    }): Promise<IUser> {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new AppError("User not found", 404);
            }

            // Check email uniqueness if email is being updated
            if (updateData.email && updateData.email !== user.email) {
                const existingUser = await User.findOne({ email: updateData.email });
                if (existingUser) {
                    throw new AppError("User with this email already exists", 400);
                }
                user.email = updateData.email;
            }

            if (updateData.firstName) user.firstName = updateData.firstName;
            if (updateData.lastName) user.lastName = updateData.lastName;
            if (updateData.phone !== undefined) user.phone = updateData.phone;
            if (updateData.role) user.role = updateData.role;
            if (updateData.isActive !== undefined) user.isActive = updateData.isActive;

            await user.save();

            logger.info(`User updated by admin: ${user.email}`);
            return user;
        } catch (error) {
            logger.error("Update user error:", error);
            throw error;
        }
    }

    static async getUserStats(): Promise<any> {
        try {
            const totalUsers = await User.countDocuments();
            const activeUsers = await User.countDocuments({ isActive: true });
            const verifiedUsers = await User.countDocuments({ isEmailVerified: true });
            const recentUsers = await User.countDocuments({
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
        } catch (error) {
            logger.error("Get user stats error:", error);
            throw error;
        }
    }
}
