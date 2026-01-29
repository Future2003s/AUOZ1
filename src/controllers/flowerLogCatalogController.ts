import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ResponseHandler } from "../utils/response";
import { FlowerLogCatalog } from "../models/FlowerLogCatalog";

const DEFAULT_CATEGORIES: Record<string, string[]> = {
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

function isValidCategoriesShape(input: unknown): input is Record<string, string[]> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  const obj = input as Record<string, unknown>;
  const keys = Object.keys(obj);
  if (keys.length === 0) return false;

  for (const k of keys) {
    if (typeof k !== "string" || k.trim() === "") return false;
    const v = obj[k];
    if (!Array.isArray(v)) return false;
    // Require at least 1 type to avoid breaking dropdowns
    if (v.length === 0) return false;
    if (!v.every((t) => typeof t === "string" && t.trim() !== "")) return false;
  }
  return true;
}

// @desc    Get flower-log catalog (categories/types)
// @route   GET /api/v1/flower-logs/catalog
// @access  Public
export const getFlowerLogCatalog = asyncHandler(async (req: Request, res: Response) => {
  const doc = await FlowerLogCatalog.findOne({ key: "default" }).lean().exec();

  if (!doc) {
    return ResponseHandler.success(
      res,
      { key: "default", categories: DEFAULT_CATEGORIES },
      "Flower log catalog retrieved successfully"
    );
  }

  const categories = (doc as any).categories;
  const merged =
    categories && typeof categories === "object" && !Array.isArray(categories)
      ? { ...DEFAULT_CATEGORIES, ...(categories as Record<string, string[]>) }
      : DEFAULT_CATEGORIES;

  return ResponseHandler.success(
    res,
    { key: "default", categories: merged },
    "Flower log catalog retrieved successfully"
  );
});

// @desc    Upsert flower-log catalog (replace categories/types)
// @route   PUT /api/v1/flower-logs/catalog
// @access  Public
export const upsertFlowerLogCatalog = asyncHandler(async (req: Request, res: Response) => {
  const { categories } = req.body as { categories?: unknown };

  if (!isValidCategoriesShape(categories)) {
    return ResponseHandler.badRequest(
      res,
      "categories phải là object { [nhóm]: string[] } và mỗi nhóm phải có ít nhất 1 loại."
    );
  }

  const doc = await FlowerLogCatalog.findOneAndUpdate(
    { key: "default" },
    { $set: { categories } },
    { new: true, upsert: true }
  )
    .lean()
    .exec();

  return ResponseHandler.success(
    res,
    { key: (doc as any).key, categories: (doc as any).categories },
    "Flower log catalog updated successfully"
  );
});

