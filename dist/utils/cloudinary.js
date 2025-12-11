"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToCloudinary = uploadToCloudinary;
exports.deleteFromCloudinary = deleteFromCloudinary;
exports.extractPublicIdFromUrl = extractPublicIdFromUrl;
const cloudinary_1 = require("cloudinary");
const stream_1 = require("stream");
const AppError_1 = require("./AppError");
const logger_1 = require("./logger");
// Configure Cloudinary
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
    api_key: process.env.CLOUDINARY_API_KEY || "",
    api_secret: process.env.CLOUDINARY_API_SECRET || "",
});
/**
 * Upload file buffer to Cloudinary
 */
async function uploadToCloudinary(buffer, options = {}) {
    try {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary_1.v2.uploader.upload_stream({
                folder: options.folder || "avatars",
                public_id: options.public_id,
                transformation: options.transformation || [
                    { width: 500, height: 500, crop: "fill", gravity: "face" },
                    { quality: "auto", fetch_format: "auto" },
                ],
                resource_type: options.resource_type || "image",
            }, (error, result) => {
                if (error) {
                    logger_1.logger.error("Cloudinary upload error:", error);
                    reject(new AppError_1.AppError("Failed to upload image to Cloudinary", 500));
                    return;
                }
                if (!result) {
                    reject(new AppError_1.AppError("No result from Cloudinary upload", 500));
                    return;
                }
                resolve({
                    url: result.url,
                    public_id: result.public_id,
                    secure_url: result.secure_url,
                });
            });
            // Convert buffer to stream
            const readable = new stream_1.Readable();
            readable.push(buffer);
            readable.push(null);
            readable.pipe(uploadStream);
        });
    }
    catch (error) {
        logger_1.logger.error("Cloudinary upload exception:", error);
        throw new AppError_1.AppError("Failed to upload image to Cloudinary", 500);
    }
}
/**
 * Delete file from Cloudinary
 */
async function deleteFromCloudinary(publicId) {
    try {
        await cloudinary_1.v2.uploader.destroy(publicId);
        logger_1.logger.info(`Deleted Cloudinary asset: ${publicId}`);
    }
    catch (error) {
        logger_1.logger.error("Cloudinary delete error:", error);
        // Don't throw error, just log it
    }
}
/**
 * Extract public_id from Cloudinary URL
 */
function extractPublicIdFromUrl(url) {
    try {
        // Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{public_id}.{format}
        const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
        return match ? match[1] : null;
    }
    catch (error) {
        logger_1.logger.error("Error extracting public_id from URL:", error);
        return null;
    }
}
