import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";
import { AppError } from "./AppError";
import { logger } from "./logger";

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
    api_key: process.env.CLOUDINARY_API_KEY || "",
    api_secret: process.env.CLOUDINARY_API_SECRET || "",
});

interface UploadOptions {
    folder?: string;
    public_id?: string;
    transformation?: any[];
    resource_type?: "image" | "video" | "raw" | "auto";
}

/**
 * Upload file buffer to Cloudinary
 */
export async function uploadToCloudinary(
    buffer: Buffer,
    options: UploadOptions = {}
): Promise<{ url: string; public_id: string; secure_url: string }> {
    try {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: options.folder || "avatars",
                    public_id: options.public_id,
                    transformation: options.transformation || [
                        { width: 500, height: 500, crop: "fill", gravity: "face" },
                        { quality: "auto", fetch_format: "auto" },
                    ],
                    resource_type: options.resource_type || "image",
                },
                (error, result) => {
                    if (error) {
                        logger.error("Cloudinary upload error:", error);
                        reject(new AppError("Failed to upload image to Cloudinary", 500));
                        return;
                    }

                    if (!result) {
                        reject(new AppError("No result from Cloudinary upload", 500));
                        return;
                    }

                    resolve({
                        url: result.url,
                        public_id: result.public_id,
                        secure_url: result.secure_url,
                    });
                }
            );

            // Convert buffer to stream
            const readable = new Readable();
            readable.push(buffer);
            readable.push(null);
            readable.pipe(uploadStream);
        });
    } catch (error) {
        logger.error("Cloudinary upload exception:", error);
        throw new AppError("Failed to upload image to Cloudinary", 500);
    }
}

/**
 * Delete file from Cloudinary
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
    try {
        await cloudinary.uploader.destroy(publicId);
        logger.info(`Deleted Cloudinary asset: ${publicId}`);
    } catch (error) {
        logger.error("Cloudinary delete error:", error);
        // Don't throw error, just log it
    }
}

/**
 * Extract public_id from Cloudinary URL
 */
export function extractPublicIdFromUrl(url: string): string | null {
    try {
        // Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{public_id}.{format}
        const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
        return match ? match[1] : null;
    } catch (error) {
        logger.error("Error extracting public_id from URL:", error);
        return null;
    }
}

