/**
 * migrateI18nFromJSON.ts — Script
 * Đọc file en.json, ja.json, vi.json từ thư mục /messages (hoặc path custom)
 * rồi gọi bulk import API để đẩy tất cả lên MongoDB qua route /api/v1/i18n/:locale/bulk
 *
 * Cách dùng:
 *   npx ts-node src/scripts/migrateI18nFromJSON.ts
 *   npx ts-node src/scripts/migrateI18nFromJSON.ts --dir ./src/messages
 *   npx ts-node src/scripts/migrateI18nFromJSON.ts --api-url http://localhost:8081/api/v1
 */
import fs from "fs";
import path from "path";

// ─── Config ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function getArg(flag: string, defaultValue: string): string {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultValue;
}

const LOCALES_DIR = getArg("--dir", path.join(process.cwd(), "src", "i18n", "locales"));
const API_BASE = getArg("--api-url", process.env.NEXT_PUBLIC_API_END_POINT ?? "http://localhost:8081/api/v1");
const API_KEY = getArg("--api-key", process.env.TRANSLATION_API_KEY ?? "");
const LOCALES = ["vi", "en", "ja"] as const;

// ─── Main ─────────────────────────────────────────────────────────────────────

async function migrateLocale(locale: string, jsonData: Record<string, unknown>): Promise<void> {
    const url = `${API_BASE}/i18n/${locale}/bulk`;

    console.log(`\n📤 Đang import locale "${locale}" vào ${url} ...`);

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": API_KEY
        },
        body: JSON.stringify(jsonData)
    });

    const text = await response.text();

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${text}`);
    }

    let result: Record<string, unknown>;
    try {
        result = JSON.parse(text) as Record<string, unknown>;
    } catch {
        console.error(`❌ [${locale}] Response không phải JSON: ${text}`);
        return;
    }

    const data = result.data as Record<string, number> | undefined;
    console.log(`✅ [${locale}] Hoàn tất:`);
    console.log(`   • Tổng keys    : ${data?.total ?? "?"}`);
    console.log(`   • Inserted mới : ${data?.inserted ?? "?"}`);
    console.log(`   • Modified cũ  : ${data?.modified ?? "?"}`);
}

async function main(): Promise<void> {
    console.log("═══════════════════════════════════════════════");
    console.log("  Migration: JSON files → MongoDB (i18n)");
    console.log("═══════════════════════════════════════════════");
    console.log(`📁 Đọc từ thư mục : ${LOCALES_DIR}`);
    console.log(`🌐 API Base URL   : ${API_BASE}`);

    if (!API_KEY) {
        console.warn("⚠️  TRANSLATION_API_KEY chưa được đặt! Server sẽ từ chối request.\n");
    }

    let successCount = 0;
    let errorCount = 0;

    for (const locale of LOCALES) {
        const filePath = path.join(LOCALES_DIR, `${locale}.json`);

        if (!fs.existsSync(filePath)) {
            console.warn(`⚠️  Không tìm thấy file: ${filePath} — bỏ qua`);
            errorCount++;
            continue;
        }

        let jsonData: Record<string, unknown>;
        try {
            const content = fs.readFileSync(filePath, "utf-8");
            jsonData = JSON.parse(content) as Record<string, unknown>;
        } catch (err) {
            console.error(`❌ Lỗi parse JSON ${filePath}:`, err);
            errorCount++;
            continue;
        }

        try {
            await migrateLocale(locale, jsonData);
            successCount++;
        } catch (err) {
            console.error(`❌ Lỗi khi import locale "${locale}":`, err);
            errorCount++;
        }
    }

    console.log("\n═══════════════════════════════════════════════");
    console.log(`  Kết quả: ${successCount} thành công, ${errorCount} lỗi`);
    console.log("═══════════════════════════════════════════════\n");

    process.exit(errorCount > 0 ? 1 : 0);
}

main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
