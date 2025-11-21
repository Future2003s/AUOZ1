import { SupportedLanguages, TranslationCategories } from '../models/Translation';
import { translationService } from '../services/translationService';
import { logger } from './logger';

/**
 * Translation helper utilities
 */

/**
 * Get localized error message
 */
export async function getLocalizedError(
    errorKey: string, 
    language: SupportedLanguages = SupportedLanguages.ENGLISH,
    fallback?: string
): Promise<string> {
    try {
        const translation = await translationService.getTranslation(
            `error.${errorKey}`, 
            language
        );
        return translation || fallback || errorKey;
    } catch (error) {
        logger.error('Error getting localized error:', error);
        return fallback || errorKey;
    }
}

/**
 * Get localized success message
 */
export async function getLocalizedSuccess(
    successKey: string, 
    language: SupportedLanguages = SupportedLanguages.ENGLISH,
    fallback?: string
): Promise<string> {
    try {
        const translation = await translationService.getTranslation(
            `success.${successKey}`, 
            language
        );
        return translation || fallback || successKey;
    } catch (error) {
        logger.error('Error getting localized success:', error);
        return fallback || successKey;
    }
}

/**
 * Get localized validation message
 */
export async function getLocalizedValidation(
    validationKey: string, 
    language: SupportedLanguages = SupportedLanguages.ENGLISH,
    fallback?: string
): Promise<string> {
    try {
        const translation = await translationService.getTranslation(
            `validation.${validationKey}`, 
            language
        );
        return translation || fallback || validationKey;
    } catch (error) {
        logger.error('Error getting localized validation:', error);
        return fallback || validationKey;
    }
}

/**
 * Format localized message with parameters
 */
export function formatMessage(template: string, params: Record<string, any>): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
        return params[key] !== undefined ? String(params[key]) : match;
    });
}

/**
 * Get browser language from Accept-Language header
 */
export function getBrowserLanguage(acceptLanguageHeader?: string): SupportedLanguages {
    if (!acceptLanguageHeader) {
        return SupportedLanguages.ENGLISH;
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
        if (Object.values(SupportedLanguages).includes(langCode as SupportedLanguages)) {
            return langCode as SupportedLanguages;
        }
    }

    return SupportedLanguages.ENGLISH;
}

/**
 * Validate language code
 */
export function isValidLanguage(language: string): language is SupportedLanguages {
    return Object.values(SupportedLanguages).includes(language as SupportedLanguages);
}

/**
 * Get language display name
 */
export function getLanguageDisplayName(language: SupportedLanguages, displayLanguage: SupportedLanguages = SupportedLanguages.ENGLISH): string {
    const displayNames: Record<SupportedLanguages, Record<SupportedLanguages, string>> = {
        [SupportedLanguages.ENGLISH]: {
            [SupportedLanguages.ENGLISH]: 'English',
            [SupportedLanguages.VIETNAMESE]: 'Vietnamese',
            [SupportedLanguages.JAPANESE]: 'Japanese'
        },
        [SupportedLanguages.VIETNAMESE]: {
            [SupportedLanguages.ENGLISH]: 'Tiếng Anh',
            [SupportedLanguages.VIETNAMESE]: 'Tiếng Việt',
            [SupportedLanguages.JAPANESE]: 'Tiếng Nhật'
        },
        [SupportedLanguages.JAPANESE]: {
            [SupportedLanguages.ENGLISH]: '英語',
            [SupportedLanguages.VIETNAMESE]: 'ベトナム語',
            [SupportedLanguages.JAPANESE]: '日本語'
        }
    };

    return displayNames[displayLanguage][language] || language;
}

/**
 * Get currency symbol for language/region
 */
export function getCurrencySymbol(language: SupportedLanguages): string {
    const currencyMap: Record<SupportedLanguages, string> = {
        [SupportedLanguages.ENGLISH]: '$',
        [SupportedLanguages.VIETNAMESE]: '₫',
        [SupportedLanguages.JAPANESE]: '¥'
    };

    return currencyMap[language] || '$';
}

/**
 * Format number according to language locale
 */
export function formatNumber(number: number, language: SupportedLanguages): string {
    const localeMap: Record<SupportedLanguages, string> = {
        [SupportedLanguages.ENGLISH]: 'en-US',
        [SupportedLanguages.VIETNAMESE]: 'vi-VN',
        [SupportedLanguages.JAPANESE]: 'ja-JP'
    };

    return new Intl.NumberFormat(localeMap[language]).format(number);
}

/**
 * Format currency according to language locale
 */
export function formatCurrency(amount: number, language: SupportedLanguages): string {
    const currencyMap: Record<SupportedLanguages, { locale: string; currency: string }> = {
        [SupportedLanguages.ENGLISH]: { locale: 'en-US', currency: 'USD' },
        [SupportedLanguages.VIETNAMESE]: { locale: 'vi-VN', currency: 'VND' },
        [SupportedLanguages.JAPANESE]: { locale: 'ja-JP', currency: 'JPY' }
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
export function formatDate(date: Date, language: SupportedLanguages, options?: Intl.DateTimeFormatOptions): string {
    const localeMap: Record<SupportedLanguages, string> = {
        [SupportedLanguages.ENGLISH]: 'en-US',
        [SupportedLanguages.VIETNAMESE]: 'vi-VN',
        [SupportedLanguages.JAPANESE]: 'ja-JP'
    };

    const defaultOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };

    return new Intl.DateTimeFormat(localeMap[language], options || defaultOptions).format(date);
}

/**
 * Get RTL (Right-to-Left) direction for language
 */
export function isRTL(language: SupportedLanguages): boolean {
    // None of our supported languages are RTL, but this is useful for future expansion
    const rtlLanguages: SupportedLanguages[] = [];
    return rtlLanguages.includes(language);
}

/**
 * Get text direction for language
 */
export function getTextDirection(language: SupportedLanguages): 'ltr' | 'rtl' {
    return isRTL(language) ? 'rtl' : 'ltr';
}

/**
 * Pluralization helper
 */
export function pluralize(count: number, language: SupportedLanguages, singular: string, plural?: string): string {
    // Simple pluralization rules for supported languages
    switch (language) {
        case SupportedLanguages.ENGLISH:
            return count === 1 ? singular : (plural || `${singular}s`);
        case SupportedLanguages.VIETNAMESE:
            // Vietnamese doesn't have plural forms like English
            return singular;
        case SupportedLanguages.JAPANESE:
            // Japanese doesn't have plural forms like English
            return singular;
        default:
            return count === 1 ? singular : (plural || `${singular}s`);
    }
}

/**
 * Get localized product status
 */
export async function getLocalizedProductStatus(
    status: string,
    language: SupportedLanguages = SupportedLanguages.ENGLISH
): Promise<string> {
    try {
        const translation = await translationService.getTranslation(
            `product.status.${status}`,
            language
        );
        return translation || status;
    } catch (error) {
        logger.error('Error getting localized product status:', error);
        return status;
    }
}

/**
 * Get localized order status
 */
export async function getLocalizedOrderStatus(
    status: string,
    language: SupportedLanguages = SupportedLanguages.ENGLISH
): Promise<string> {
    try {
        const translation = await translationService.getTranslation(
            `order.status.${status}`,
            language
        );
        return translation || status;
    } catch (error) {
        logger.error('Error getting localized order status:', error);
        return status;
    }
}

/**
 * Create localized API response
 */
export async function createLocalizedResponse(
    success: boolean,
    messageKey: string,
    data?: any,
    language: SupportedLanguages = SupportedLanguages.ENGLISH
): Promise<{ success: boolean; message: string; data?: any; language: SupportedLanguages }> {
    const message = await translationService.getTranslation(messageKey, language);
    
    return {
        success,
        message: message || messageKey,
        data,
        language
    };
}
