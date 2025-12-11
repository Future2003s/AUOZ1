import fs from "fs";
import path from "path";
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
// Accepts any field name for maximum flexibility
export const uploadProductImage = (req: any, res: any, next: any) => {
    const multerMiddleware = multer({
        storage,
        limits: {
            fileSize: 10 * 1024 * 1024, // 10MB for product images
        },
        fileFilter,
    }).any(); // Accept any field name
    
    multerMiddleware(req, res, (err: any) => {
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
        } else {
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

// Upload shipping proof (accepts any field name)
// This middleware accepts any field name and normalizes it to req.file
export const uploadShippingProof = (req: any, res: any, next: any) => {
    const multerMiddleware = multer({
        storage,
        limits: {
            fileSize: 10 * 1024 * 1024, // 10MB for shipping proofs
        },
        fileFilter,
    }).any(); // Accept any field name
    
    multerMiddleware(req, res, (err: any) => {
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
        } else {
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

// Local disk storage for delivery proof images (served via /uploads)
const proofUploadDir = path.join(process.cwd(), "uploads", "proofs");

const ensureProofDirExists = () => {
    if (!fs.existsSync(proofUploadDir)) {
        fs.mkdirSync(proofUploadDir, { recursive: true });
    }
};

const proofStorage = multer.diskStorage({
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

export const uploadDeliveryProof = (req: any, res: any, next: any) => {
    const multerMiddleware = multer({
        storage: proofStorage,
        limits: {
            fileSize: 10 * 1024 * 1024, // 10MB max
        },
        fileFilter,
    }).single("file"); // expect field name "file"

    multerMiddleware(req, res, (err: any) => {
        if (err) {
            console.error("Multer error in uploadDeliveryProof:", err);
            return next(err);
        }

        if (!req.file) {
            console.warn("No file found in uploadDeliveryProof. req.files:", req.files);
        } else {
            console.log("File stored for delivery proof:", {
                filename: req.file.filename,
                path: req.file.path,
                size: req.file.size,
            });
        }

        next();
    });
};

