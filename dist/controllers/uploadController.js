"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFile = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const AppError_1 = require("../utils/AppError");
const cloudinary_1 = require("../utils/cloudinary");
// @desc    Upload file
// @route   POST /api/v1/uploads
// @access  Private (Employee/Admin)
exports.uploadFile = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const file = req.file;
    console.log("Upload file request - req.file:", file ? { name: file.originalname, size: file.size, mimetype: file.mimetype } : "null");
    console.log("Upload file request - req.files:", req.files);
    if (!file) {
        console.error("No file in uploadFile controller");
        return next(new AppError_1.AppError("No file uploaded", 400));
    }
    // Validate file type
    if (!file.mimetype.startsWith('image/')) {
        return next(new AppError_1.AppError("Only image files are allowed", 400));
    }
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        return next(new AppError_1.AppError("File size cannot exceed 10MB", 400));
    }
    // Upload to Cloudinary
    const timestamp = Date.now();
    const publicId = `uploads/${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
    const cloudinaryResult = await (0, cloudinary_1.uploadToCloudinary)(file.buffer, {
        folder: "uploads",
        public_id: publicId,
        resource_type: "image"
    });
    const cloudRes = cloudinaryResult;
    response_1.ResponseHandler.success(res, {
        url: cloudRes.secure_url,
        publicId: cloudRes.public_id,
        width: cloudRes.width,
        height: cloudRes.height,
    }, "File uploaded successfully");
});
