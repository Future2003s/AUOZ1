"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLocalizedError = getLocalizedError;
exports.getLocalizedSuccess = getLocalizedSuccess;
exports.getLocalizedValidation = getLocalizedValidation;
exports.formatMessage = formatMessage;
exports.getBrowserLanguage = getBrowserLanguage;
exports.isValidLanguage = isValidLanguage;
exports.getLanguageDisplayName = getLanguageDisplayName;
exports.getCurrencySymbol = getCurrencySymbol;
exports.formatNumber = formatNumber;
exports.formatCurrency = formatCurrency;
exports.formatDate = formatDate;
exports.isRTL = isRTL;
exports.getTextDirection = getTextDirection;
exports.pluralize = pluralize;
exports.getLocalizedProductStatus = getLocalizedProductStatus;
exports.getLocalizedOrderStatus = getLocalizedOrderStatus;
exports.createLocalizedResponse = createLocalizedResponse;
const Translation_1 = require("../models/Translation");
const translationService_1 = require("../services/translationService");
const logger_1 = require("./logger");
/**
 * Translation helper utilities
 */
/**
 * Get localized error message
 */
async function getLocalizedError(errorKey, language = Translation_1.SupportedLanguages.ENGLISH, fallback) {
    try {
        const translation = await translationService_1.translationService.getTranslation(`error.${errorKey}`, language);
        return translation || fallback || errorKey;
    }
    catch (error) {
        logger_1.logger.error('Error getting localized error:', error);
        return fallback || errorKey;
    }
}
/**
 * Get localized success message
 */
async function getLocalizedSuccess(successKey, language = Translation_1.SupportedLanguages.ENGLISH, fallback) {
    try {
        const translation = await translationService_1.translationService.getTranslation(`success.${successKey}`, language);
        return translation || fallback || successKey;
    }
    catch (error) {
        logger_1.logger.error('Error getting localized success:', error);
        return fallback || successKey;
    }
}
/**
 * Get localized validation message
 */
async function getLocalizedValidation(validationKey, language = Translation_1.SupportedLanguages.ENGLISH, fallback) {
    try {
        const translation = await translationService_1.translationService.getTranslation(`validation.${validationKey}`, language);
        return translation || fallback || validationKey;
    }
    catch (error) {
        logger_1.logger.error('Error getting localized validation:', error);
        return fallback || validationKey;
    }
}
/**
 * Format localized message with parameters
 */
function formatMessage(template, params) {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
        return params[key] !== undefined ? String(params[key]) : match;
    });
}
/**
 * Get browser language from Accept-Language header
 */
function getBrowserLanguage(acceptLanguageHeader) {
    if (!acceptLanguageHeader) {
        return Translation_1.SupportedLanguages.ENGLISH;
    }
    const languages = acceptLanguageHeader
        .split(',')
        .map(lang => {
        const [code, quality = '1'] = lang.trim().split(';q=');
        return { code: code.toLowerCase(), quality: parseFloat(quality) };
    })
        .sort((a, b) => b.quality - a.quality);
    for (const lang of languages) {
        const langCode = lang.code.split('-')[0];
        if (Object.values(Translation_1.SupportedLanguages).includes(langCode)) {
            return langCode;
        }
    }
    return Translation_1.SupportedLanguages.ENGLISH;
}
/**
 * Validate language code
 */
function isValidLanguage(language) {
    return Object.values(Translation_1.SupportedLanguages).includes(language);
}
/**
 * Get language display name
 */
function getLanguageDisplayName(language, displayLanguage = Translation_1.SupportedLanguages.ENGLISH) {
    const displayNames = {
        [Translation_1.SupportedLanguages.ENGLISH]: {
            [Translation_1.SupportedLanguages.ENGLISH]: 'English',
            [Translation_1.SupportedLanguages.VIETNAMESE]: 'Vietnamese',
            [Translation_1.SupportedLanguages.JAPANESE]: 'Japanese'
        },
        [Translation_1.SupportedLanguages.VIETNAMESE]: {
            [Translation_1.SupportedLanguages.ENGLISH]: 'Tiếng Anh',
            [Translation_1.SupportedLanguages.VIETNAMESE]: 'Tiếng Việt',
            [Translation_1.SupportedLanguages.JAPANESE]: 'Tiếng Nhật'
        },
        [Translation_1.SupportedLanguages.JAPANESE]: {
            [Translation_1.SupportedLanguages.ENGLISH]: '英語',
            [Translation_1.SupportedLanguages.VIETNAMESE]: 'ベトナム語',
            [Translation_1.SupportedLanguages.JAPANESE]: '日本語'
        }
    };
    return displayNames[displayLanguage][language] || language;
}
/**
 * Get currency symbol for language/region
 */
function getCurrencySymbol(language) {
    const currencyMap = {
        [Translation_1.SupportedLanguages.ENGLISH]: '$',
        [Translation_1.SupportedLanguages.VIETNAMESE]: '₫',
        [Translation_1.SupportedLanguages.JAPANESE]: '¥'
    };
    return currencyMap[language] || '$';
}
/**
 * Format number according to language locale
 */
function formatNumber(number, language) {
    const localeMap = {
        [Translation_1.SupportedLanguages.ENGLISH]: 'en-US',
        [Translation_1.SupportedLanguages.VIETNAMESE]: 'vi-VN',
        [Translation_1.SupportedLanguages.JAPANESE]: 'ja-JP'
    };
    return new Intl.NumberFormat(localeMap[language]).format(number);
}
/**
 * Format currency according to language locale
 */
function formatCurrency(amount, language) {
    const currencyMap = {
        [Translation_1.SupportedLanguages.ENGLISH]: { locale: 'en-US', currency: 'USD' },
        [Translation_1.SupportedLanguages.VIETNAMESE]: { locale: 'vi-VN', currency: 'VND' },
        [Translation_1.SupportedLanguages.JAPANESE]: { locale: 'ja-JP', currency: 'JPY' }
    };
    const { locale, currency } = currencyMap[language];
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency
    }).format(amount);
}
/**
 * Format date according to language locale
 */
function formatDate(date, language, options) {
    const localeMap = {
        [Translation_1.SupportedLanguages.ENGLISH]: 'en-US',
        [Translation_1.SupportedLanguages.VIETNAMESE]: 'vi-VN',
        [Translation_1.SupportedLanguages.JAPANESE]: 'ja-JP'
    };
    const defaultOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    return new Intl.DateTimeFormat(localeMap[language], options || defaultOptions).format(date);
}
/**
 * Get RTL (Right-to-Left) direction for language
 */
function isRTL(language) {
    // None of our supported languages are RTL, but this is useful for future expansion
    const rtlLanguages = [];
    return rtlLanguages.includes(language);
}
/**
 * Get text direction for language
 */
function getTextDirection(language) {
    return isRTL(language) ? 'rtl' : 'ltr';
}
/**
 * Pluralization helper
 */
function pluralize(count, language, singular, plural) {
    // Simple pluralization rules for supported languages
    switch (language) {
        case Translation_1.SupportedLanguages.ENGLISH:
            return count === 1 ? singular : (plural || `${singular}s`);
        case Translation_1.SupportedLanguages.VIETNAMESE:
            // Vietnamese doesn't have plural forms like English
            return singular;
        case Translation_1.SupportedLanguages.JAPANESE:
            // Japanese doesn't have plural forms like English
            return singular;
        default:
            return count === 1 ? singular : (plural || `${singular}s`);
    }
}
/**
 * Get localized product status
 */
async function getLocalizedProductStatus(status, language = Translation_1.SupportedLanguages.ENGLISH) {
    try {
        const translation = await translationService_1.translationService.getTranslation(`product.status.${status}`, language);
        return translation || status;
    }
    catch (error) {
        logger_1.logger.error('Error getting localized product status:', error);
        return status;
    }
}
/**
 * Get localized order status
 */
async function getLocalizedOrderStatus(status, language = Translation_1.SupportedLanguages.ENGLISH) {
    try {
        const translation = await translationService_1.translationService.getTranslation(`order.status.${status}`, language);
        return translation || status;
    }
    catch (error) {
        logger_1.logger.error('Error getting localized order status:', error);
        return status;
    }
}
/**
 * Create localized API response
 */
async function createLocalizedResponse(success, messageKey, data, language = Translation_1.SupportedLanguages.ENGLISH) {
    const message = await translationService_1.translationService.getTranslation(messageKey, language);
    return {
        success,
        message: message || messageKey,
        data,
        language
    };
}
