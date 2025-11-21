import { Request, Response, NextFunction } from 'express';
import { SupportedLanguages } from '../models/Translation';
import { translationService } from '../services/translationService';
import { logger } from '../utils/logger';

/**
 * Extended Request interface with i18n support
 */
declare global {
    namespace Express {
        interface Request {
            language: SupportedLanguages;
            t: (key: string, fallback?: string) => Promise<string>;
            tSync: (key: string, fallback?: string) => string;
            translations: Record<string, string>;
        }
    }
}

/**
 * Language detection middleware
 */
export const detectLanguage = (req: Request, res: Response, next: NextFunction) => {
    let language = SupportedLanguages.ENGLISH; // Default

    // 1. Check query parameter
    if (req.query.lang && Object.values(SupportedLanguages).includes(req.query.lang as SupportedLanguages)) {
        language = req.query.lang as SupportedLanguages;
    }
    // 2. Check header
    else if (req.headers['accept-language']) {
        const acceptLanguage = req.headers['accept-language'];
        
        // Parse Accept-Language header
        const languages = acceptLanguage
            .split(',')
            .map(lang => {
                const [code, quality = '1'] = lang.trim().split(';q=');
                return { code: code.toLowerCase(), quality: parseFloat(quality) };
            })
            .sort((a, b) => b.quality - a.quality);

        // Find first supported language
        for (const lang of languages) {
            const langCode = lang.code.split('-')[0]; // Get primary language code
            if (Object.values(SupportedLanguages).includes(langCode as SupportedLanguages)) {
                language = langCode as SupportedLanguages;
                break;
            }
        }
    }
    // 3. Check user preference (if authenticated)
    else if ((req as any).user?.preferredLanguage) {
        const userLang = (req as any).user.preferredLanguage;
        if (Object.values(SupportedLanguages).includes(userLang)) {
            language = userLang;
        }
    }

    req.language = language;
    next();
};

/**
 * Translation helper middleware
 */
export const addTranslationHelpers = (req: Request, res: Response, next: NextFunction) => {
    // Async translation function
    req.t = async (key: string, fallback?: string): Promise<string> => {
        try {
            const translation = await translationService.getTranslation(key, req.language);
            return translation || fallback || key;
        } catch (error) {
            logger.error('Translation error:', error);
            return fallback || key;
        }
    };

    // Synchronous translation function (uses cached translations)
    req.tSync = (key: string, fallback?: string): string => {
        if (req.translations && req.translations[key]) {
            return req.translations[key];
        }
        return fallback || key;
    };

    next();
};

/**
 * Preload common translations middleware
 */
export const preloadTranslations = (categories: string[] = ['ui', 'error', 'validation']) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            req.translations = {};

            // Load translations for specified categories
            for (const category of categories) {
                if (Object.values(SupportedLanguages).includes(category as any)) {
                    const categoryTranslations = await translationService.getTranslationsByCategory(
                        category as any,
                        req.language
                    );
                    Object.assign(req.translations, categoryTranslations);
                }
            }
        } catch (error) {
            logger.error('Error preloading translations:', error);
            req.translations = {};
        }
        
        next();
    };
};

/**
 * Response localization middleware
 */
export const localizeResponse = (req: Request, res: Response, next: NextFunction) => {
    // Override res.json to translate response messages
    const originalJson = res.json;
    
    res.json = function(body: any) {
        // Add language info to response
        if (body && typeof body === 'object') {
            body.language = req.language;
            
            // Translate common message fields
            if (body.message && typeof body.message === 'string') {
                // Check if message is a translation key
                if (req.translations && req.translations[body.message]) {
                    body.message = req.translations[body.message];
                }
            }
        }
        
        return originalJson.call(this, body);
    };

    next();
};

/**
 * Language validation middleware
 */
export const validateLanguage = (req: Request, res: Response, next: NextFunction) => {
    const { lang } = req.query;
    
    if (lang && !Object.values(SupportedLanguages).includes(lang as SupportedLanguages)) {
        return res.status(400).json({
            success: false,
            message: 'Unsupported language',
            supportedLanguages: Object.values(SupportedLanguages)
        });
    }
    
    next();
};

/**
 * Complete i18n middleware stack
 */
export const i18nMiddleware = [
    validateLanguage,
    detectLanguage,
    addTranslationHelpers,
    preloadTranslations(['ui', 'error', 'validation']),
    localizeResponse
];

/**
 * Lightweight i18n middleware for API routes
 */
export const apiI18nMiddleware = [
    validateLanguage,
    detectLanguage,
    addTranslationHelpers
];
