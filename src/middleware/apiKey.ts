/**
 * apiKey.ts — Middleware
 * Xác thực API Key cho các route quản lý translation (POST/PATCH/DELETE)
 * Key được đọc từ header x-api-key và so sánh với process.env.TRANSLATION_API_KEY
 */
import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";

/**
 * Middleware kiểm tra x-api-key header
 * Chỉ nên áp dụng cho các route write (POST/PATCH/DELETE)
 */
export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
    const expectedKey = process.env.TRANSLATION_API_KEY;

    if (!expectedKey) {
        // Nếu server chưa cấu hình TRANSLATION_API_KEY, chặn mọi request
        next(new AppError("Server chưa cấu hình TRANSLATION_API_KEY", 500));
        return;
    }

    const providedKey = req.headers["x-api-key"];

    if (!providedKey) {
        next(new AppError("Thiếu header x-api-key", 401));
        return;
    }

    if (providedKey !== expectedKey) {
        next(new AppError("API key không hợp lệ", 403));
        return;
    }

    next();
}
