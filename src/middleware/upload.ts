import multer from "multer";
import { config } from "../config/config";
import { AppError } from "../utils/AppError";

// Use memory storage since we'll upload directly to Cloudinary
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = config.upload.allowedTypes || ["image/jpeg", "image/png", "image/gif", "image/webp"];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new AppError(`Invalid file type. Allowed types: ${allowedTypes.join(", ")}`, 400));
    }
};

// Configure multer
export const uploadAvatar = multer({
    storage,
    limits: {
        fileSize: config.upload.maxSize || 5 * 1024 * 1024, // 5MB default
    },
    fileFilter,
}).single("avatar");

// Upload product images (larger size limit)
export const uploadProductImage = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB for product images
    },
    fileFilter,
}).single("image");

