"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadDeliveryProof = exports.uploadShippingProof = exports.uploadProductImage = exports.uploadAvatar = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
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
// Accepts any field name for maximum flexibility
const uploadProductImage = (req, res, next) => {
    const multerMiddleware = (0, multer_1.default)({
        storage,
        limits: {
            fileSize: 10 * 1024 * 1024, // 10MB for product images
        },
        fileFilter,
    }).any(); // Accept any field name
    multerMiddleware(req, res, (err) => {
        if (err) {
            console.error("Multer error in uploadProductImage:", err);
            return next(err);
        }
        // Normalize: get the first file from the array and put it in req.file
        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
            req.file = req.files[0];
        }
        // Debug logging
        if (!req.file) {
            console.warn("No file found in uploadProductImage. req.files:", req.files);
        }
        else {
            console.log("File found in uploadProductImage:", {
                fieldname: req.file.fieldname,
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size
            });
        }
        next();
    });
};
exports.uploadProductImage = uploadProductImage;
// Upload shipping proof (accepts any field name)
// This middleware accepts any field name and normalizes it to req.file
const uploadShippingProof = (req, res, next) => {
    const multerMiddleware = (0, multer_1.default)({
        storage,
        limits: {
            fileSize: 10 * 1024 * 1024, // 10MB for shipping proofs
        },
        fileFilter,
    }).any(); // Accept any field name
    multerMiddleware(req, res, (err) => {
        if (err) {
            console.error("Multer error in uploadShippingProof:", err);
            return next(err);
        }
        // Normalize: get the first file from the array and put it in req.file
        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
            req.file = req.files[0];
        }
        // Debug logging
        if (!req.file) {
            console.warn("No file found in uploadShippingProof. req.files:", req.files);
        }
        else {
            console.log("File found in uploadShippingProof:", {
                fieldname: req.file.fieldname,
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size
            });
        }
        next();
    });
};
exports.uploadShippingProof = uploadShippingProof;
// Local disk storage for delivery proof images (served via /uploads)
const proofUploadDir = path_1.default.join(process.cwd(), "uploads", "proofs");
const ensureProofDirExists = () => {
    if (!fs_1.default.existsSync(proofUploadDir)) {
        fs_1.default.mkdirSync(proofUploadDir, { recursive: true });
    }
};
const proofStorage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        ensureProofDirExists();
        cb(null, proofUploadDir);
    },
    filename: (_req, file, cb) => {
        const timestamp = Date.now();
        const safeName = file.originalname.replace(/\s+/g, "-");
        cb(null, `${timestamp}-${safeName}`);
    },
});
const uploadDeliveryProof = (req, res, next) => {
    const multerMiddleware = (0, multer_1.default)({
        storage: proofStorage,
        limits: {
            fileSize: 10 * 1024 * 1024, // 10MB max
        },
        fileFilter,
    }).single("file"); // expect field name "file"
    multerMiddleware(req, res, (err) => {
        if (err) {
            console.error("Multer error in uploadDeliveryProof:", err);
            return next(err);
        }
        if (!req.file) {
            console.warn("No file found in uploadDeliveryProof. req.files:", req.files);
        }
        else {
            console.log("File stored for delivery proof:", {
                filename: req.file.filename,
                path: req.file.path,
                size: req.file.size,
            });
        }
        next();
    });
};
exports.uploadDeliveryProof = uploadDeliveryProof;
