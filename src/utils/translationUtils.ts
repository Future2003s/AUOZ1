/**
 * translationUtils.ts
 * Các hàm tiện ích dùng cho hệ thống i18n:
 * - flattenObject: chuyển nested JSON → dot-notation flat
 * - buildNestedObject: chuyển mảng {key, value} → nested JSON
 */

/**
 * Flatten một object lồng nhau thành object phẳng với dot-notation keys
 *
 * @example
 * flattenObject({ home: { title: "Hello" } })
 * // => { "home.title": "Hello" }
 *
 * @param obj - Object cần flatten
 * @param prefix - Prefix cho key (dùng khi đệ quy)
 * @returns Record<string, string> dạng phẳng
 */
export function flattenObject(
    obj: Record<string, unknown>,
    prefix = ""
): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;

        if (
            value !== null &&
            typeof value === "object" &&
            !Array.isArray(value)
        ) {
            // Đệ quy vào object lồng nhau
            const nested = flattenObject(value as Record<string, unknown>, fullKey);
            Object.assign(result, nested);
        } else {
            // Chuyển mọi primitive thành string
            result[fullKey] = String(value ?? "");
        }
    }

    return result;
}

/**
 * Xây dựng nested object từ mảng các cặp {key (dot-notation), value}
 *
 * @example
 * buildNestedObject([{ key: "home.title", value: "Hello" }])
 * // => { home: { title: "Hello" } }
 *
 * @param items - Mảng các cặp key-value
 * @returns Nested object
 */
export function buildNestedObject(
    items: Array<{ key: string; value: string }>
): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const { key, value } of items) {
        const parts = key.split(".");
        let current: Record<string, unknown> = result;

        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!current[part] || typeof current[part] !== "object") {
                current[part] = {};
            }
            current = current[part] as Record<string, unknown>;
        }

        current[parts[parts.length - 1]] = value;
    }

    return result;
}

/**
 * Kiểm tra một string có phải dạng dot-notation hợp lệ hay không
 * Cho phép: chữ cái, số, dấu gạch dưới, dấu chấm
 *
 * @param key - Key cần kiểm tra
 * @returns true nếu hợp lệ
 */
export function isValidDotNotationKey(key: string): boolean {
    return /^[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)*$/.test(key);
}
