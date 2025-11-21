import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

/**
 * Middleware to ensure proper UTF-8 encoding for Vietnamese characters
 */
export const ensureVietnameseEncoding = (req: Request, res: Response, next: NextFunction) => {
    // Set proper headers for Vietnamese characters
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Accept-Charset", "utf-8");
    
    // Log if Vietnamese characters are detected in request
    if (req.body) {
        const bodyStr = JSON.stringify(req.body);
        if (bodyStr.includes('ạ') || bodyStr.includes('á') || bodyStr.includes('ả') || 
            bodyStr.includes('ã') || bodyStr.includes('ă') || bodyStr.includes('â') ||
            bodyStr.includes('ế') || bodyStr.includes('ề') || bodyStr.includes('ể') ||
            bodyStr.includes('ễ') || bodyStr.includes('ệ') || bodyStr.includes('í') ||
            bodyStr.includes('ì') || bodyStr.includes('ỉ') || bodyStr.includes('ĩ') ||
            bodyStr.includes('ị') || bodyStr.includes('ó') || bodyStr.includes('ò') ||
            bodyStr.includes('ỏ') || bodyStr.includes('õ') || bodyStr.includes('ọ') ||
            bodyStr.includes('ố') || bodyStr.includes('ồ') || bodyStr.includes('ổ') ||
            bodyStr.includes('ỗ') || bodyStr.includes('ộ') || bodyStr.includes('ớ') ||
            bodyStr.includes('ờ') || bodyStr.includes('ở') || bodyStr.includes('ỡ') ||
            bodyStr.includes('ợ') || bodyStr.includes('ú') || bodyStr.includes('ù') ||
            bodyStr.includes('ủ') || bodyStr.includes('ũ') || bodyStr.includes('ụ') ||
            bodyStr.includes('ứ') || bodyStr.includes('ừ') || bodyStr.includes('ử') ||
            bodyStr.includes('ữ') || bodyStr.includes('ự') || bodyStr.includes('ý') ||
            bodyStr.includes('ỳ') || bodyStr.includes('ỷ') || bodyStr.includes('ỹ') ||
            bodyStr.includes('ỵ')) {
            logger.debug('Vietnamese characters detected in request body');
        }
    }
    
    next();
};

/**
 * Middleware to sanitize and normalize Vietnamese text input
 */
export const sanitizeVietnameseText = (req: Request, res: Response, next: NextFunction) => {
    if (req.body) {
        // Normalize Vietnamese characters in firstName and lastName
        if (req.body.firstName && typeof req.body.firstName === 'string') {
            req.body.firstName = req.body.firstName.trim();
            // Ensure proper encoding
            try {
                const normalized = req.body.firstName.normalize('NFC');
                if (normalized !== req.body.firstName) {
                    logger.debug(`Normalized firstName: "${req.body.firstName}" -> "${normalized}"`);
                    req.body.firstName = normalized;
                }
            } catch (error) {
                logger.warn('Error normalizing firstName:', error);
            }
        }
        
        if (req.body.lastName && typeof req.body.lastName === 'string') {
            req.body.lastName = req.body.lastName.trim();
            // Ensure proper encoding
            try {
                const normalized = req.body.lastName.normalize('NFC');
                if (normalized !== req.body.lastName) {
                    logger.debug(`Normalized lastName: "${req.body.lastName}" -> "${normalized}"`);
                    req.body.lastName = normalized;
                }
            } catch (error) {
                logger.warn('Error normalizing lastName:', error);
            }
        }
    }
    
    next();
};
