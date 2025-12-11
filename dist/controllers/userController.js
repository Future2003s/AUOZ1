"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAccount = exports.getLoginAttempts = exports.resetLoginAttempts = exports.deleteUser = exports.updateUserStatus = exports.updateUserRole = exports.updateUser = exports.createUser = exports.getAllUsers = exports.uploadAvatar = exports.updatePreferences = exports.setDefaultAddress = exports.deleteAddress = exports.updateAddress = exports.addAddress = exports.getAddresses = exports.updateProfile = exports.getProfile = void 0;
const userService_1 = require("../services/userService");
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const AppError_1 = require("../utils/AppError");
const cloudinary_1 = require("../utils/cloudinary");
// @desc    Get user profile
// @route   GET /api/v1/users/profile
// @access  Private
exports.getProfile = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const user = await userService_1.UserService.getUserProfile(req.user.id);
    response_1.ResponseHandler.success(res, user, "User profile retrieved successfully");
});
// @desc    Update user profile
// @route   PUT /api/v1/users/profile
// @access  Private
exports.updateProfile = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { firstName, lastName, phone } = req.body;
    const user = await userService_1.UserService.updateProfile(req.user.id, {
        firstName,
        lastName,
        phone
    });
    response_1.ResponseHandler.success(res, user, "Profile updated successfully");
});
// @desc    Get user addresses
// @route   GET /api/v1/users/addresses
// @access  Private
exports.getAddresses = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const addresses = await userService_1.UserService.getUserAddresses(req.user.id);
    response_1.ResponseHandler.success(res, addresses, "Addresses retrieved successfully");
});
// @desc    Add user address
// @route   POST /api/v1/users/addresses
// @access  Private
exports.addAddress = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const addressData = req.body;
    const user = await userService_1.UserService.addAddress(req.user.id, addressData);
    response_1.ResponseHandler.created(res, user.addresses, "Address added successfully");
});
// @desc    Update user address
// @route   PUT /api/v1/users/addresses/:addressId
// @access  Private
exports.updateAddress = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { addressId } = req.params;
    const addressData = req.body;
    const user = await userService_1.UserService.updateAddress(req.user.id, addressId, addressData);
    response_1.ResponseHandler.success(res, user.addresses, "Address updated successfully");
});
// @desc    Delete user address
// @route   DELETE /api/v1/users/addresses/:addressId
// @access  Private
exports.deleteAddress = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { addressId } = req.params;
    await userService_1.UserService.deleteAddress(req.user.id, addressId);
    response_1.ResponseHandler.success(res, null, "Address deleted successfully");
});
// @desc    Set default address
// @route   PUT /api/v1/users/addresses/:addressId/default
// @access  Private
exports.setDefaultAddress = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { addressId } = req.params;
    const user = await userService_1.UserService.setDefaultAddress(req.user.id, addressId);
    response_1.ResponseHandler.success(res, user.addresses, "Default address updated successfully");
});
// @desc    Update user preferences
// @route   PUT /api/v1/users/preferences
// @access  Private
exports.updatePreferences = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const preferences = req.body;
    const user = await userService_1.UserService.updatePreferences(req.user.id, preferences);
    response_1.ResponseHandler.success(res, user.preferences, "Preferences updated successfully");
});
// @desc    Upload user avatar
// @route   POST /api/v1/users/avatar
// @access  Private
exports.uploadAvatar = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const file = req.file;
    if (!file) {
        return next(new AppError_1.AppError("No file uploaded", 400));
    }
    // Get user to check for existing avatar
    const existingUser = await userService_1.UserService.getUserProfile(req.user.id);
    // Generate unique public_id
    const userId = req.user.id;
    const timestamp = Date.now();
    const publicId = `avatars/${userId}-${timestamp}`;
    // Upload to Cloudinary
    const cloudinaryResult = await (0, cloudinary_1.uploadToCloudinary)(file.buffer, {
        folder: "avatars",
        public_id: publicId,
        transformation: [
            { width: 500, height: 500, crop: "fill", gravity: "face" },
            { quality: "auto", fetch_format: "auto" },
        ],
    });
    // Delete old avatar from Cloudinary if exists
    if (existingUser.avatar) {
        const oldPublicId = (0, cloudinary_1.extractPublicIdFromUrl)(existingUser.avatar);
        if (oldPublicId) {
            await (0, cloudinary_1.deleteFromCloudinary)(oldPublicId);
        }
    }
    // Save Cloudinary URL to database
    const user = await userService_1.UserService.uploadAvatar(req.user.id, cloudinaryResult.secure_url);
    response_1.ResponseHandler.success(res, user, "Avatar uploaded successfully");
});
// @desc    Get all users (Admin only)
// @route   GET /api/v1/admin/users
// @access  Private (Admin)
exports.getAllUsers = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await userService_1.UserService.getAllUsers(page, limit);
    response_1.ResponseHandler.paginated(res, result.users, result.pagination.page, result.pagination.limit, result.pagination.total, "Users retrieved successfully");
});
// @desc    Create user (Admin only)
// @route   POST /api/v1/admin/users
// @access  Private (Admin)
exports.createUser = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { firstName, lastName, email, password, role, phone } = req.body;
    if (!firstName || !lastName || !email || !password) {
        return response_1.ResponseHandler.badRequest(res, "First name, last name, email, and password are required");
    }
    const user = await userService_1.UserService.createUser({
        firstName,
        lastName,
        email,
        password,
        role,
        phone
    });
    response_1.ResponseHandler.created(res, user, "User created successfully");
});
// @desc    Update user (Admin only)
// @route   PUT /api/v1/admin/users/:id
// @access  Private (Admin)
exports.updateUser = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { id } = req.params;
    const { firstName, lastName, email, phone, role, isActive } = req.body;
    const user = await userService_1.UserService.updateUser(id, {
        firstName,
        lastName,
        email,
        phone,
        role,
        isActive
    });
    response_1.ResponseHandler.success(res, user, "User updated successfully");
});
// @desc    Update user role (Admin only)
// @route   PUT /api/v1/admin/users/:id/role
// @access  Private (Admin)
exports.updateUserRole = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { id } = req.params;
    const { role } = req.body;
    if (!role || !["customer", "admin", "seller", "employee"].includes(role)) {
        return response_1.ResponseHandler.badRequest(res, "Valid role is required (customer, admin, seller, employee)");
    }
    const user = await userService_1.UserService.updateUserRole(id, role);
    response_1.ResponseHandler.success(res, user, "User role updated successfully");
});
// @desc    Update user status (Admin only)
// @route   PUT /api/v1/admin/users/:id/status
// @access  Private (Admin)
exports.updateUserStatus = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { id } = req.params;
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") {
        return response_1.ResponseHandler.badRequest(res, "isActive must be a boolean");
    }
    const user = await userService_1.UserService.updateUserStatus(id, isActive);
    response_1.ResponseHandler.success(res, user, "User status updated successfully");
});
// @desc    Delete user (Admin only)
// @route   DELETE /api/v1/admin/users/:id
// @access  Private (Admin)
exports.deleteUser = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { id } = req.params;
    await userService_1.UserService.deleteUser(id);
    response_1.ResponseHandler.success(res, null, "User deleted successfully");
});
// @desc    Reset login attempts for user (Admin only)
// @route   POST /api/v1/admin/users/:id/reset-login-attempts
// @access  Private (Admin)
exports.resetLoginAttempts = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { id } = req.params;
    await userService_1.UserService.resetLoginAttempts(id);
    response_1.ResponseHandler.success(res, null, "Login attempts reset successfully");
});
// @desc    Get login attempts for user (Admin only)
// @route   GET /api/v1/admin/users/:id/login-attempts
// @access  Private (Admin)
exports.getLoginAttempts = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { id } = req.params;
    const attempts = await userService_1.UserService.getLoginAttempts(id);
    response_1.ResponseHandler.success(res, { attempts }, "Login attempts retrieved successfully");
});
// @desc    Delete user account
// @route   DELETE /api/v1/users/account
// @access  Private
exports.deleteAccount = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    await userService_1.UserService.deleteAccount(req.user.id);
    response_1.ResponseHandler.success(res, null, "Account deleted successfully");
});
