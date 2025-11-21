"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.voucherService = void 0;
const mongoose_1 = require("mongoose");
const Voucher_1 = require("../models/Voucher");
const AppError_1 = require("../utils/AppError");
const normalizeCode = (code) => code.trim().toUpperCase();
const normalizeId = (value) => {
    if (!value)
        return null;
    const trimmed = String(value).trim();
    if (!trimmed || trimmed === "undefined" || trimmed === "null") {
        return null;
    }
    return trimmed;
};
const calculateDiscountAmount = (voucher, subtotal) => {
    if (subtotal <= 0)
        return 0;
    let discount = voucher.discountType === "percentage" ? (subtotal * voucher.discountValue) / 100 : voucher.discountValue;
    if (voucher.maxDiscountValue) {
        discount = Math.min(discount, voucher.maxDiscountValue);
    }
    // Never exceed subtotal
    discount = Math.min(discount, subtotal);
    // Round to whole currency unit
    return Math.max(Math.round(discount), 0);
};
const getRuntimeStatus = (voucher, now = new Date()) => {
    if (!voucher.isActive || voucher.status === "disabled") {
        return "disabled";
    }
    if (voucher.status === "draft") {
        return "draft";
    }
    if (voucher.startDate && now < voucher.startDate) {
        return "scheduled";
    }
    if (voucher.endDate && now > voucher.endDate) {
        return "expired";
    }
    if (voucher.usageLimit && voucher.usageCount >= voucher.usageLimit) {
        return "expired";
    }
    return "active";
};
const ensureVoucherCanBeApplied = (voucher, subtotal, userId) => {
    const runtimeStatus = getRuntimeStatus(voucher);
    if (runtimeStatus === "disabled") {
        throw new AppError_1.AppError("Voucher đã bị vô hiệu hóa hoặc không khả dụng", 400);
    }
    if (runtimeStatus === "draft") {
        throw new AppError_1.AppError("Voucher chưa được kích hoạt", 400);
    }
    if (runtimeStatus === "scheduled") {
        throw new AppError_1.AppError("Voucher chỉ áp dụng sau thời gian bắt đầu", 400);
    }
    if (runtimeStatus === "expired") {
        throw new AppError_1.AppError("Voucher đã hết hạn sử dụng", 400);
    }
    if (voucher.minOrderValue && subtotal < voucher.minOrderValue) {
        throw new AppError_1.AppError(`Đơn hàng cần tối thiểu ${voucher.minOrderValue.toLocaleString("vi-VN")}đ để áp dụng voucher`, 400);
    }
    if (voucher.perUserLimit && userId) {
        const usage = voucher.userUsage?.find((u) => u.user.toString() === userId);
        if (usage && usage.count >= voucher.perUserLimit) {
            throw new AppError_1.AppError("Bạn đã sử dụng voucher này đạt giới hạn cho phép", 400);
        }
    }
    const discountAmount = calculateDiscountAmount(voucher, subtotal);
    if (discountAmount <= 0) {
        throw new AppError_1.AppError("Voucher không tạo ra ưu đãi cho giá trị đơn hàng hiện tại", 400);
    }
    return { discountAmount, runtimeStatus };
};
const mapVoucher = (voucher) => ({
    id: String(voucher._id),
    code: voucher.code,
    name: voucher.name,
    description: voucher.description,
    discountType: voucher.discountType,
    discountValue: voucher.discountValue,
    maxDiscountValue: voucher.maxDiscountValue,
    minOrderValue: voucher.minOrderValue,
    startDate: voucher.startDate,
    endDate: voucher.endDate,
    usageLimit: voucher.usageLimit,
    usageCount: voucher.usageCount,
    perUserLimit: voucher.perUserLimit,
    autoApply: voucher.autoApply,
    tags: voucher.tags,
    isActive: voucher.isActive,
    status: getRuntimeStatus(voucher),
    manualStatus: voucher.status,
    createdAt: voucher.createdAt,
    updatedAt: voucher.updatedAt,
    lastUsedAt: voucher.lastUsedAt
});
exports.voucherService = {
    normalizeCode,
    mapVoucher,
    getRuntimeStatus,
    async list(filters) {
        const { search, status, isActive, page = 1, limit = 20, sort = "latest" } = filters;
        const query = {};
        if (typeof isActive === "boolean") {
            query.isActive = isActive;
        }
        if (search) {
            query.$or = [
                { code: { $regex: search, $options: "i" } },
                { name: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } }
            ];
        }
        if (status && status !== "all") {
            // Stored status filter
            if (status === "disabled" || status === "draft") {
                query.status = status;
            }
            else if (status === "active") {
                query.status = { $in: ["active", "scheduled"] };
                query.isActive = true;
            }
            else if (status === "expired") {
                query.$or = [
                    { status: "expired" },
                    { endDate: { $lt: new Date() } },
                    {
                        $expr: {
                            $and: [
                                { $gt: ["$usageLimit", 0] },
                                { $gte: ["$usageCount", "$usageLimit"] }
                            ]
                        }
                    }
                ];
            }
        }
        const skip = Math.max(page - 1, 0) * limit;
        const sortOption = sort === "usage"
            ? { usageCount: -1, updatedAt: -1 }
            : { createdAt: -1 };
        const [items, total] = await Promise.all([Voucher_1.Voucher.find(query).sort(sortOption).skip(skip).limit(limit), Voucher_1.Voucher.countDocuments(query)]);
        return {
            data: items.map(mapVoucher),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit) || 1
            }
        };
    },
    async create(payload, userId) {
        const code = payload.code ? normalizeCode(payload.code) : undefined;
        if (!code) {
            throw new AppError_1.AppError("Mã voucher là bắt buộc", 400);
        }
        const exists = await Voucher_1.Voucher.findOne({ code });
        if (exists) {
            throw new AppError_1.AppError("Mã voucher đã tồn tại", 400);
        }
        const voucher = await Voucher_1.Voucher.create({
            ...payload,
            code,
            createdBy: userId ? new mongoose_1.Types.ObjectId(userId) : undefined,
            updatedBy: userId ? new mongoose_1.Types.ObjectId(userId) : undefined
        });
        return mapVoucher(voucher);
    },
    async update(id, payload, userId) {
        let targetId = normalizeId(id);
        if (!targetId) {
            const candidateCode = payload.code ? normalizeCode(payload.code) : null;
            if (!candidateCode) {
                throw new AppError_1.AppError("Voucher ID không hợp lệ", 400);
            }
            const fallback = await Voucher_1.Voucher.findOne({ code: candidateCode });
            if (!fallback) {
                throw new AppError_1.AppError("Không tìm thấy voucher để cập nhật", 404);
            }
            targetId = String(fallback._id);
        }
        const updateData = { ...payload };
        if (payload.code) {
            updateData.code = normalizeCode(payload.code);
        }
        if (userId) {
            updateData.updatedBy = new mongoose_1.Types.ObjectId(userId);
        }
        const voucher = await Voucher_1.Voucher.findByIdAndUpdate(targetId, updateData, {
            new: true,
            runValidators: true
        });
        if (!voucher) {
            throw new AppError_1.AppError("Không tìm thấy voucher", 404);
        }
        return mapVoucher(voucher);
    },
    async remove(id) {
        const voucher = await Voucher_1.Voucher.findByIdAndDelete(id);
        if (!voucher) {
            throw new AppError_1.AppError("Không tìm thấy voucher", 404);
        }
        return mapVoucher(voucher);
    },
    async findById(id) {
        const voucher = await Voucher_1.Voucher.findById(id);
        if (!voucher) {
            throw new AppError_1.AppError("Không tìm thấy voucher", 404);
        }
        return mapVoucher(voucher);
    },
    async preview(payload) {
        const { code, subtotal, userId } = payload;
        if (!code || !code.trim()) {
            throw new AppError_1.AppError("Vui lòng nhập mã voucher", 400);
        }
        if (subtotal <= 0) {
            throw new AppError_1.AppError("Giá trị đơn hàng không hợp lệ để áp dụng voucher", 400);
        }
        const normalizedCode = normalizeCode(code);
        const voucher = await Voucher_1.Voucher.findOne({ code: normalizedCode });
        if (!voucher) {
            throw new AppError_1.AppError("Voucher không tồn tại hoặc đã bị xóa", 404);
        }
        const { discountAmount, runtimeStatus } = ensureVoucherCanBeApplied(voucher, subtotal, userId);
        return {
            discountAmount,
            voucher: mapVoucher(voucher),
            runtimeStatus
        };
    },
    async incrementUsage(payload) {
        const { voucherId, userId } = payload;
        const voucher = await Voucher_1.Voucher.findById(voucherId);
        if (!voucher)
            return;
        voucher.usageCount += 1;
        voucher.lastUsedAt = new Date();
        if (userId && voucher.perUserLimit) {
            const existing = voucher.userUsage.find((usage) => usage.user.toString() === userId);
            if (existing) {
                existing.count += 1;
                existing.lastUsedAt = new Date();
            }
            else {
                voucher.userUsage.push({
                    user: new mongoose_1.Types.ObjectId(userId),
                    count: 1,
                    lastUsedAt: new Date()
                });
            }
        }
        // Update status if usage limit reached
        if (voucher.usageLimit && voucher.usageCount >= voucher.usageLimit) {
            voucher.status = "expired";
            voucher.isActive = false;
        }
        await voucher.save();
    }
};
