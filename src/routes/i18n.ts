/**
 * i18n.ts — Router
 * Định nghĩa các route quản lý translation theo locale (vi/en/ja)
 * Dành cho hệ thống next-intl
 *
 * Base path: /api/v1/i18n
 *
 * Public (GET):
 *   GET /i18n/:locale              → Trả nested JSON (hoặc flat với ?flat=true)
 *   GET /i18n/:locale/export       → Download file .json (có API key)
 *   GET /i18n/:locale/list         → Danh sách phân trang cho Admin UI (có API key)
 *
 * Protected bởi x-api-key (POST/PATCH/DELETE):
 *   PATCH  /i18n/:locale           → Upsert một key
 *   DELETE /i18n/:locale/:key      → Xóa một key
 *   POST   /i18n/:locale/bulk      → Bulk import từ nested JSON
 */
import { Router } from "express";
import { requireApiKey } from "../middleware/apiKey";
import {
    getLocaleTranslations,
    upsertTranslationKey,
    deleteTranslationKey,
    bulkImportTranslations,
    exportTranslations,
    listTranslationKeys
} from "../controllers/i18nController";

const router = Router();

// ──────────────────────────────────────────────────────────────────────────────
// PUBLIC — Lấy translations (dùng cho next-intl getRequestConfig)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * GET /i18n/:locale
 * Trả nested JSON hoặc flat (query ?flat=true)
 * Không cần auth vì next-intl server-side cần đọc
 */
router.get("/:locale", getLocaleTranslations);

// ──────────────────────────────────────────────────────────────────────────────
// PROTECTED bởi API Key
// ──────────────────────────────────────────────────────────────────────────────

/**
 * GET /i18n/:locale/list
 * Danh sách phân trang cho Admin UI
 */
router.get("/:locale/list", requireApiKey, listTranslationKeys);

/**
 * GET /i18n/:locale/export
 * Download file .json
 */
router.get("/:locale/export", requireApiKey, exportTranslations);

/**
 * PATCH /i18n/:locale
 * Upsert một key-value
 * Body: { key: string, value: string, namespace?: string }
 */
router.patch("/:locale", requireApiKey, upsertTranslationKey);

/**
 * POST /i18n/:locale/bulk
 * Bulk import từ nested JSON
 * Body: nested JSON object
 */
router.post("/:locale/bulk", requireApiKey, bulkImportTranslations);

/**
 * DELETE /i18n/:locale/:key
 * Xóa một key (key cần encode URI nếu chứa dấu chấm)
 */
router.delete("/:locale/:key", requireApiKey, deleteTranslationKey);

export default router;
