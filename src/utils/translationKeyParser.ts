import { SupportedLocales } from "../models/TranslationV2";

/**
 * Parse translation key to extract components
 * Examples:
 * - "Label_selling_point_1_vn" -> { baseKey: "Label_selling_point_1", locale: "vn", variant: undefined }
 * - "Msg_selling_point_1_vn_short" -> { baseKey: "Msg_selling_point_1", locale: "vn", variant: "short" }
 */
export interface ParsedTranslationKey {
    baseKey: string;
    locale: SupportedLocales | null;
    variant?: string;
}

/**
 * Parse key to extract baseKey, locale, and variant
 */
export function parseTranslationKey(key: string): ParsedTranslationKey {
    const locales = Object.values(SupportedLocales);
    const variants = ["short", "long"];
    
    // Try to find locale at the end
    for (const locale of locales) {
        const localeSuffix = `_${locale}`;
        if (key.endsWith(localeSuffix)) {
            const withoutLocale = key.slice(0, -localeSuffix.length);
            return {
                baseKey: withoutLocale,
                locale: locale as SupportedLocales
            };
        }
        
        // Try with variant
        for (const variant of variants) {
            const variantSuffix = `_${variant}_${locale}`;
            if (key.endsWith(variantSuffix)) {
                const withoutVariant = key.slice(0, -variantSuffix.length);
                return {
                    baseKey: withoutVariant,
                    locale: locale as SupportedLocales,
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
export function buildTranslationKey(
    baseKey: string,
    locale: SupportedLocales,
    variant?: string
): string {
    if (variant) {
        return `${baseKey}_${variant}_${locale}`;
    }
    return `${baseKey}_${locale}`;
}

/**
 * Resolve translation key with locale fallback
 * Tries: key_locale_variant -> key_locale -> key_defaultLocale -> key
 */
export function resolveTranslationKey(
    baseKey: string,
    locale: SupportedLocales,
    variant?: string,
    fallbackLocales: SupportedLocales[] = [SupportedLocales.VIETNAMESE, SupportedLocales.ENGLISH]
): string[] {
    const candidates: string[] = [];
    
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
export function extractLocaleFromKey(key: string): SupportedLocales | null {
    const parsed = parseTranslationKey(key);
    return parsed.locale;
}

/**
 * Check if key has locale suffix
 */
export function hasLocaleSuffix(key: string): boolean {
    const parsed = parseTranslationKey(key);
    return parsed.locale !== null;
}

