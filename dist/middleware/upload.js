"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadProductImage = exports.uploadAvatar = void 0;
const multer_1 = __importDefault(require("multer"));
const config_1 = require("../config/config");
const AppError_1 = require("../utils/AppError");
// Use memory storage since we'll upload directly to Cloudinary
const storage = multer_1.default.memoryStorage();
// File filter
const fileFilter = (req, file, cb) => {
    const allowedTypes = config_1.config.upload.allowedTypes || ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new AppError_1.AppError(`Invalid file type. Allowed types: ${allowedTypes.join(", ")}`, 400));
    }
};
// Configure multer
exports.uploadAvatar = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: config_1.config.upload.maxSize || 5 * 1024 * 1024, // 5MB default
    },
    fileFilter,
}).single("avatar");
// Upload product images (larger size limit)
exports.uploadProductImage = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB for product images
    },
    fileFilter,
}).single("image");
