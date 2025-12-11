"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTranslationKey = parseTranslationKey;
exports.buildTranslationKey = buildTranslationKey;
exports.resolveTranslationKey = resolveTranslationKey;
exports.extractLocaleFromKey = extractLocaleFromKey;
exports.hasLocaleSuffix = hasLocaleSuffix;
const TranslationV2_1 = require("../models/TranslationV2");
/**
 * Parse key to extract baseKey, locale, and variant
 */
function parseTranslationKey(key) {
    const locales = Object.values(TranslationV2_1.SupportedLocales);
    const variants = ["short", "long"];
    // Try to find locale at the end
    for (const locale of locales) {
        const localeSuffix = `_${locale}`;
        if (key.endsWith(localeSuffix)) {
            const withoutLocale = key.slice(0, -localeSuffix.length);
            return {
                baseKey: withoutLocale,
                locale: locale
            };
        }
        // Try with variant
        for (const variant of variants) {
            const variantSuffix = `_${variant}_${locale}`;
            if (key.endsWith(variantSuffix)) {
                const withoutVariant = key.slice(0, -variantSuffix.length);
                return {
                    baseKey: withoutVariant,
                    locale: locale,
                    variant
                };
            }
        }
    }
    // No locale found, return as-is
    return {
        baseKey: key,
        locale: null
    };
}
/**
 * Build key from baseKey, locale, and variant
 */
function buildTranslationKey(baseKey, locale, variant) {
    if (variant) {
        return `${baseKey}_${variant}_${locale}`;
    }
    return `${baseKey}_${locale}`;
}
/**
 * Resolve translation key with locale fallback
 * Tries: key_locale_variant -> key_locale -> key_defaultLocale -> key
 */
function resolveTranslationKey(baseKey, locale, variant, fallbackLocales = [TranslationV2_1.SupportedLocales.VIETNAMESE, TranslationV2_1.SupportedLocales.ENGLISH]) {
    const candidates = [];
    // Try exact match first
    if (variant) {
        candidates.push(buildTranslationKey(baseKey, locale, variant));
    }
    candidates.push(buildTranslationKey(baseKey, locale));
    // Try fallback locales
    for (const fallbackLocale of fallbackLocales) {
        if (fallbackLocale !== locale) {
            if (variant) {
                candidates.push(buildTranslationKey(baseKey, fallbackLocale, variant));
            }
            candidates.push(buildTranslationKey(baseKey, fallbackLocale));
        }
    }
    // Final fallback to base key
    candidates.push(baseKey);
    return candidates;
}
/**
 * Extract locale from key if present
 */
function extractLocaleFromKey(key) {
    const parsed = parseTranslationKey(key);
    return parsed.locale;
}
/**
 * Check if key has locale suffix
 */
function hasLocaleSuffix(key) {
    const parsed = parseTranslationKey(key);
    return parsed.locale !== null;
}
