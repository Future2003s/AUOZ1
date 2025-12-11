"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiI18nMiddleware = exports.i18nMiddleware = exports.validateLanguage = exports.localizeResponse = exports.preloadTranslations = exports.addTranslationHelpers = exports.detectLanguage = void 0;
const Translation_1 = require("../models/Translation");
const translationService_1 = require("../services/translationService");
const logger_1 = require("../utils/logger");
/**
 * Language detection middleware
 */
const detectLanguage = (req, res, next) => {
    let language = Translation_1.SupportedLanguages.ENGLISH; // Default
    // 1. Check query parameter
    if (req.query.lang && Object.values(Translation_1.SupportedLanguages).includes(req.query.lang)) {
        language = req.query.lang;
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
            if (Object.values(Translation_1.SupportedLanguages).includes(langCode)) {
                language = langCode;
                break;
            }
        }
    }
    // 3. Check user preference (if authenticated)
    else if (req.user?.preferredLanguage) {
        const userLang = req.user.preferredLanguage;
        if (Object.values(Translation_1.SupportedLanguages).includes(userLang)) {
            language = userLang;
        }
    }
    req.language = language;
    next();
};
exports.detectLanguage = detectLanguage;
/**
 * Translation helper middleware
 */
const addTranslationHelpers = (req, res, next) => {
    // Async translation function
    req.t = async (key, fallback) => {
        try {
            const translation = await translationService_1.translationService.getTranslation(key, req.language);
            return translation || fallback || key;
        }
        catch (error) {
            logger_1.logger.error('Translation error:', error);
            return fallback || key;
        }
    };
    // Synchronous translation function (uses cached translations)
    req.tSync = (key, fallback) => {
        if (req.translations && req.translations[key]) {
            return req.translations[key];
        }
        return fallback || key;
    };
    next();
};
exports.addTranslationHelpers = addTranslationHelpers;
/**
 * Preload common translations middleware
 */
const preloadTranslations = (categories = ['ui', 'error', 'validation']) => {
    return async (req, res, next) => {
        try {
            req.translations = {};
            // Load translations for specified categories
            for (const category of categories) {
                if (Object.values(Translation_1.SupportedLanguages).includes(category)) {
                    const categoryTranslations = await translationService_1.translationService.getTranslationsByCategory(category, req.language);
                    Object.assign(req.translations, categoryTranslations);
                }
            }
        }
        catch (error) {
            logger_1.logger.error('Error preloading translations:', error);
            req.translations = {};
        }
        next();
    };
};
exports.preloadTranslations = preloadTranslations;
/**
 * Response localization middleware
 */
const localizeResponse = (req, res, next) => {
    // Override res.json to translate response messages
    const originalJson = res.json;
    res.json = function (body) {
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
exports.localizeResponse = localizeResponse;
/**
 * Language validation middleware
 */
const validateLanguage = (req, res, next) => {
    const { lang } = req.query;
    if (lang && !Object.values(Translation_1.SupportedLanguages).includes(lang)) {
        return res.status(400).json({
            success: false,
            message: 'Unsupported language',
            supportedLanguages: Object.values(Translation_1.SupportedLanguages)
        });
    }
    next();
};
exports.validateLanguage = validateLanguage;
/**
 * Complete i18n middleware stack
 */
exports.i18nMiddleware = [
    exports.validateLanguage,
    exports.detectLanguage,
    exports.addTranslationHelpers,
    (0, exports.preloadTranslations)(['ui', 'error', 'validation']),
    exports.localizeResponse
];
/**
 * Lightweight i18n middleware for API routes
 */
exports.apiI18nMiddleware = [
    exports.validateLanguage,
    exports.detectLanguage,
    exports.addTranslationHelpers
];
