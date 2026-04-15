/**
 * i18nController.ts
 * Controllers xử lý các endpoint quản lý translation theo locale (vi/en/ja)
 * Dùng cho hệ thống next-intl — route /api/v1/i18n/:locale
 */
import { Request, Response, NextFunction } from "express";
import { I18nTranslation } from "../models/I18nTranslation";
import { flattenObject, buildNestedObject } from "../utils/translationUtils";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";

/**
 * GET /i18n/:locale
 * Trả về tất cả bản dịch của một locale dưới dạng nested JSON
 * Query: ?flat=true → trả về dạng phẳng {key: value}
 */
export const getLocaleTranslations = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const { locale } = req.params;
        const flat = req.query.flat === "true";

        const items = await I18nTranslation.find({ locale })
            .select("key value -_id")
            .lean();

        if (flat) {
            // Trả về object phẳng: { "home.title": "..." }
            const flatObj: Record<string, string> = {};
            for (const item of items) {
                flatObj[item.key] = item.value;
            }
            res.json({
                success: true,
                locale,
                count: items.length,
                data: flatObj
            });
            return;
        }

        // Trả về nested object: { home: { title: "..." } }
        const nested = buildNestedObject(
            items.map(({ key, value }) => ({ key, value }))
        );

        res.json({
            success: true,
            locale,
            count: items.length,
            data: nested
        });
    }
);

/**
 * PATCH /i18n/:locale
 * Upsert một key-value: tạo mới nếu chưa có, cập nhật nếu đã có
 * Body: { key: string, value: string, namespace?: string }
 */
export const upsertTranslationKey = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const { locale } = req.params;
        const { key, value, namespace } = req.body as {
            key: string;
            value: string;
            namespace?: string;
        };

        if (!key || typeof key !== "string") {
            return next(new AppError("key là bắt buộc và phải là string", 400));
        }

        if (value === undefined || value === null) {
            return next(new AppError("value là bắt buộc", 400));
        }

        const doc = await I18nTranslation.findOneAndUpdate(
            { locale, key },
            {
                $set: {
                    value: String(value),
                    namespace: namespace ?? "common"
                }
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }
        ).lean();

        res.json({
            success: true,
            message: "Đã cập nhật translation",
            data: doc
        });
    }
);

/**
 * DELETE /i18n/:locale/:key
 * Xóa một key cụ thể
 * :key là dot-notation, đã được encode URI (e.g. home.title → home%2Etitle hoặc truyền raw)
 */
export const deleteTranslationKey = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const { locale } = req.params;
        // Decode URI để xử lý key có dấu chấm được encode
        const key = decodeURIComponent(req.params.key);

        const deleted = await I18nTranslation.findOneAndDelete({ locale, key });

        if (!deleted) {
            return next(new AppError(`Không tìm thấy key "${key}" cho locale "${locale}"`, 404));
        }

        res.json({
            success: true,
            message: `Đã xóa key "${key}"`,
            data: { locale, key }
        });
    }
);

/**
 * POST /i18n/:locale/bulk
 * Bulk import từ nested JSON object
 * Body: nested JSON (e.g. { home: { title: "Hello" }, nav: { login: "Login" } })
 * Flatten rồi bulkWrite upsert vào MongoDB
 */
export const bulkImportTranslations = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const { locale } = req.params;
        const body = req.body as Record<string, unknown>;

        if (!body || typeof body !== "object" || Array.isArray(body)) {
            return next(new AppError("Body phải là một JSON object", 400));
        }

        // Flatten nested JSON thành dot-notation
        const flatData = flattenObject(body);
        const entries = Object.entries(flatData);

        if (entries.length === 0) {
            return next(new AppError("JSON rỗng, không có gì để import", 400));
        }

        // Xây dựng bulk operations
        const operations = entries.map(([key, value]) => ({
            updateOne: {
                filter: { locale, key },
                update: {
                    $set: { value, namespace: "common" }
                },
                upsert: true
            }
        }));

        const result = await I18nTranslation.bulkWrite(operations, { ordered: false });

        res.json({
            success: true,
            message: "Bulk import hoàn tất",
            data: {
                total: entries.length,
                inserted: result.upsertedCount,
                modified: result.modifiedCount,
                matched: result.matchedCount
            }
        });
    }
);

/**
 * GET /i18n/:locale/export
 * Trả về file .json để download (Content-Disposition: attachment)
 * Trả về nested JSON giống cấu trúc file en.json, vi.json, ja.json
 */
export const exportTranslations = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const { locale } = req.params;

        const items = await I18nTranslation.find({ locale })
            .select("key value -_id")
            .lean();

        const nested = buildNestedObject(
            items.map(({ key, value }) => ({ key, value }))
        );

        const filename = `${locale}.json`;
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Type", "application/json; charset=utf-8");

        res.json(nested);
    }
);

/**
 * GET /i18n/:locale/list
 * Trả về danh sách phân trang để hiển thị trong Admin UI
 * Query: ?page=1&limit=50&search=home
 */
export const listTranslationKeys = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const { locale } = req.params;
        const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
        const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit ?? "50"), 10)));
        const search = String(req.query.search ?? "").trim();

        const filter: Record<string, unknown> = { locale };

        if (search) {
            filter.$or = [
                { key: { $regex: search, $options: "i" } },
                { value: { $regex: search, $options: "i" } }
            ];
        }

        const [items, total] = await Promise.all([
            I18nTranslation.find(filter)
                .select("key value namespace updatedAt -_id")
                .sort({ key: 1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            I18nTranslation.countDocuments(filter)
        ]);

        res.json({
            success: true,
            locale,
            data: items,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    }
);
