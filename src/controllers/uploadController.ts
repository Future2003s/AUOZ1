import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ResponseHandler } from "../utils/response";
import { AppError } from "../utils/AppError";
import { uploadToCloudinary } from "../utils/cloudinary";

// @desc    Upload file
// @route   POST /api/v1/uploads
// @access  Private (Employee/Admin)
export const uploadFile = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const file = req.file as Express.Multer.File;
    
    console.log("Upload file request - req.file:", file ? { name: file.originalname, size: file.size, mimetype: file.mimetype } : "null");
    console.log("Upload file request - req.files:", (req as any).files);
    
    if (!file) {
        console.error("No file in uploadFile controller");
        return next(new AppError("No file uploaded", 400));
    }

    // Validate file type
    if (!file.mimetype.startsWith('image/')) {
        return next(new AppError("Only image files are allowed", 400));
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        return next(new AppError("File size cannot exceed 10MB", 400));
    }

    // Upload to Cloudinary
    const timestamp = Date.now();
    const publicId = `uploads/${timestamp}-${Math.random().toString(36).substr(2, 9)}`;

    const cloudinaryResult = await uploadToCloudinary(file.buffer, {
        folder: "uploads",
        public_id: publicId,
        resource_type: "image"
    });
    const cloudRes = cloudinaryResult as any;

    ResponseHandler.success(res, {
        url: cloudRes.secure_url,
        publicId: cloudRes.public_id,
        width: cloudRes.width,
        height: cloudRes.height,
    }, "File uploaded successfully");
});

