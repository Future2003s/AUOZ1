"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertFlowerLogCatalog = exports.getFlowerLogCatalog = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const FlowerLogCatalog_1 = require("../models/FlowerLogCatalog");
const DEFAULT_CATEGORIES = {
    "Nơ": [
        "Nơ Đại Đỏ",
        "Nơ Đại Đen",
        "Nơ Trung Đỏ",
        "Nơ Trung Đen",
        "Nơ Nhỏ Đỏ",
        "Nơ Nhỏ Đen",
    ],
    "Hoa": [
        "Hoa Đại Đỏ",
        "Hoa Đại Trắng",
        "Hoa Trung Đỏ",
        "Hoa Trung Trắng",
        "Hoa Nhỏ Đỏ",
        "Hoa Nhỏ Trắng",
        "Hoa Satin",
    ],
};
function isValidCategoriesShape(input) {
    if (!input || typeof input !== "object" || Array.isArray(input))
        return false;
    const obj = input;
    const keys = Object.keys(obj);
    if (keys.length === 0)
        return false;
    for (const k of keys) {
        if (typeof k !== "string" || k.trim() === "")
            return false;
        const v = obj[k];
        if (!Array.isArray(v))
            return false;
        // Require at least 1 type to avoid breaking dropdowns
        if (v.length === 0)
            return false;
        if (!v.every((t) => typeof t === "string" && t.trim() !== ""))
            return false;
    }
    return true;
}
// @desc    Get flower-log catalog (categories/types)
// @route   GET /api/v1/flower-logs/catalog
// @access  Public
exports.getFlowerLogCatalog = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const doc = await FlowerLogCatalog_1.FlowerLogCatalog.findOne({ key: "default" }).lean().exec();
    if (!doc) {
        return response_1.ResponseHandler.success(res, { key: "default", categories: DEFAULT_CATEGORIES }, "Flower log catalog retrieved successfully");
    }
    const categories = doc.categories;
    const merged = categories && typeof categories === "object" && !Array.isArray(categories)
        ? { ...DEFAULT_CATEGORIES, ...categories }
        : DEFAULT_CATEGORIES;
    return response_1.ResponseHandler.success(res, { key: "default", categories: merged }, "Flower log catalog retrieved successfully");
});
// @desc    Upsert flower-log catalog (replace categories/types)
// @route   PUT /api/v1/flower-logs/catalog
// @access  Public
exports.upsertFlowerLogCatalog = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { categories } = req.body;
    if (!isValidCategoriesShape(categories)) {
        return response_1.ResponseHandler.badRequest(res, "categories phải là object { [nhóm]: string[] } và mỗi nhóm phải có ít nhất 1 loại.");
    }
    const doc = await FlowerLogCatalog_1.FlowerLogCatalog.findOneAndUpdate({ key: "default" }, { $set: { categories } }, { new: true, upsert: true })
        .lean()
        .exec();
    return response_1.ResponseHandler.success(res, { key: doc.key, categories: doc.categories }, "Flower log catalog updated successfully");
});
