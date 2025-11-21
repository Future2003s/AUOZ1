import { Request, Response, NextFunction } from "express";
import { UserService } from "../services/userService";
import { asyncHandler } from "../utils/asyncHandler";
import { ResponseHandler } from "../utils/response";
import { AppError } from "../utils/AppError";
import { uploadToCloudinary, deleteFromCloudinary, extractPublicIdFromUrl } from "../utils/cloudinary";

// @desc    Get user profile
// @route   GET /api/v1/users/profile
// @access  Private
export const getProfile = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const user = await UserService.getUserProfile(req.user.id);

    ResponseHandler.success(res, user, "User profile retrieved successfully");
});

// @desc    Update user profile
// @route   PUT /api/v1/users/profile
// @access  Private
export const updateProfile = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { firstName, lastName, phone } = req.body;

    const user = await UserService.updateProfile(req.user.id, {
        firstName,
        lastName,
        phone
    });

    ResponseHandler.success(res, user, "Profile updated successfully");
});

// @desc    Get user addresses
// @route   GET /api/v1/users/addresses
// @access  Private
export const getAddresses = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const addresses = await UserService.getUserAddresses(req.user.id);

    ResponseHandler.success(res, addresses, "Addresses retrieved successfully");
});

// @desc    Add user address
// @route   POST /api/v1/users/addresses
// @access  Private
export const addAddress = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const addressData = req.body;

    const user = await UserService.addAddress(req.user.id, addressData);

    ResponseHandler.created(res, user.addresses, "Address added successfully");
});

// @desc    Update user address
// @route   PUT /api/v1/users/addresses/:addressId
// @access  Private
export const updateAddress = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { addressId } = req.params;
    const addressData = req.body;

    const user = await UserService.updateAddress(req.user.id, addressId, addressData);

    ResponseHandler.success(res, user.addresses, "Address updated successfully");
});

// @desc    Delete user address
// @route   DELETE /api/v1/users/addresses/:addressId
// @access  Private
export const deleteAddress = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { addressId } = req.params;

    await UserService.deleteAddress(req.user.id, addressId);

    ResponseHandler.success(res, null, "Address deleted successfully");
});

// @desc    Set default address
// @route   PUT /api/v1/users/addresses/:addressId/default
// @access  Private
export const setDefaultAddress = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { addressId } = req.params;

    const user = await UserService.setDefaultAddress(req.user.id, addressId);

    ResponseHandler.success(res, user.addresses, "Default address updated successfully");
});

// @desc    Update user preferences
// @route   PUT /api/v1/users/preferences
// @access  Private
export const updatePreferences = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const preferences = req.body;

    const user = await UserService.updatePreferences(req.user.id, preferences);

    ResponseHandler.success(res, user.preferences, "Preferences updated successfully");
});

// @desc    Upload user avatar
// @route   POST /api/v1/users/avatar
// @access  Private
export const uploadAvatar = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const file = req.file as Express.Multer.File;

    if (!file) {
        return next(new AppError("No file uploaded", 400));
    }

    // Get user to check for existing avatar
    const existingUser = await UserService.getUserProfile(req.user.id);
    
    // Generate unique public_id
    const userId = req.user.id;
    const timestamp = Date.now();
    const publicId = `avatars/${userId}-${timestamp}`;

    // Upload to Cloudinary
    const cloudinaryResult = await uploadToCloudinary(file.buffer, {
        folder: "avatars",
        public_id: publicId,
        transformation: [
            { width: 500, height: 500, crop: "fill", gravity: "face" },
            { quality: "auto", fetch_format: "auto" },
        ],
    });

    // Delete old avatar from Cloudinary if exists
    if (existingUser.avatar) {
        const oldPublicId = extractPublicIdFromUrl(existingUser.avatar);
        if (oldPublicId) {
            await deleteFromCloudinary(oldPublicId);
        }
    }

    // Save Cloudinary URL to database
    const user = await UserService.uploadAvatar(req.user.id, cloudinaryResult.secure_url);

    ResponseHandler.success(res, user, "Avatar uploaded successfully");
});

// @desc    Get all users (Admin only)
// @route   GET /api/v1/admin/users
// @access  Private (Admin)
export const getAllUsers = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await UserService.getAllUsers(page, limit);

    ResponseHandler.paginated(
        res,
        result.users,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total,
        "Users retrieved successfully"
    );
});

// @desc    Create user (Admin only)
// @route   POST /api/v1/admin/users
// @access  Private (Admin)
export const createUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { firstName, lastName, email, password, role, phone } = req.body;

    if (!firstName || !lastName || !email || !password) {
        return ResponseHandler.badRequest(res, "First name, last name, email, and password are required");
    }

    const user = await UserService.createUser({
        firstName,
        lastName,
        email,
        password,
        role,
        phone
    });

    ResponseHandler.created(res, user, "User created successfully");
});

// @desc    Update user (Admin only)
// @route   PUT /api/v1/admin/users/:id
// @access  Private (Admin)
export const updateUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { firstName, lastName, email, phone, role, isActive } = req.body;

    const user = await UserService.updateUser(id, {
        firstName,
        lastName,
        email,
        phone,
        role,
        isActive
    });

    ResponseHandler.success(res, user, "User updated successfully");
});

// @desc    Update user role (Admin only)
// @route   PUT /api/v1/admin/users/:id/role
// @access  Private (Admin)
export const updateUserRole = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !["customer", "admin", "seller"].includes(role)) {
        return ResponseHandler.badRequest(res, "Valid role is required (customer, admin, seller)");
    }

    const user = await UserService.updateUserRole(id, role);
    ResponseHandler.success(res, user, "User role updated successfully");
});

// @desc    Update user status (Admin only)
// @route   PUT /api/v1/admin/users/:id/status
// @access  Private (Admin)
export const updateUserStatus = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
        return ResponseHandler.badRequest(res, "isActive must be a boolean");
    }

    const user = await UserService.updateUserStatus(id, isActive);
    ResponseHandler.success(res, user, "User status updated successfully");
});

// @desc    Delete user (Admin only)
// @route   DELETE /api/v1/admin/users/:id
// @access  Private (Admin)
export const deleteUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    await UserService.deleteUser(id);
    ResponseHandler.success(res, null, "User deleted successfully");
});

// @desc    Reset login attempts for user (Admin only)
// @route   POST /api/v1/admin/users/:id/reset-login-attempts
// @access  Private (Admin)
export const resetLoginAttempts = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    await UserService.resetLoginAttempts(id);
    ResponseHandler.success(res, null, "Login attempts reset successfully");
});

// @desc    Get login attempts for user (Admin only)
// @route   GET /api/v1/admin/users/:id/login-attempts
// @access  Private (Admin)
export const getLoginAttempts = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const attempts = await UserService.getLoginAttempts(id);
    ResponseHandler.success(res, { attempts }, "Login attempts retrieved successfully");
});

// @desc    Delete user account
// @route   DELETE /api/v1/users/account
// @access  Private
export const deleteAccount = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    await UserService.deleteAccount(req.user.id);

    ResponseHandler.success(res, null, "Account deleted successfully");
});
