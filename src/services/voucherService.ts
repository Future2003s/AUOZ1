import { FilterQuery, Types } from "mongoose";
import { Voucher, IVoucher, VoucherStatus } from "../models/Voucher";
import { AppError } from "../utils/AppError";

export interface VoucherFilters {
    search?: string;
    status?: VoucherStatus | "all";
    isActive?: boolean;
    page?: number;
    limit?: number;
    sort?: "latest" | "usage";
}

export interface VoucherValidationPayload {
    code: string;
    subtotal: number;
    userId?: string;
}

export interface VoucherUsagePayload {
    voucherId: string;
    userId?: string;
}

const normalizeCode = (code: string) => code.trim().toUpperCase();

const calculateDiscountAmount = (voucher: IVoucher, subtotal: number): number => {
    if (subtotal <= 0) return 0;

    let discount = voucher.discountType === "percentage" ? (subtotal * voucher.discountValue) / 100 : voucher.discountValue;

    if (voucher.maxDiscountValue) {
        discount = Math.min(discount, voucher.maxDiscountValue);
    }

    // Never exceed subtotal
    discount = Math.min(discount, subtotal);

    // Round to whole currency unit
    return Math.max(Math.round(discount), 0);
};

const getRuntimeStatus = (voucher: IVoucher, now = new Date()): VoucherStatus => {
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

const ensureVoucherCanBeApplied = (voucher: IVoucher, subtotal: number, userId?: string) => {
    const runtimeStatus = getRuntimeStatus(voucher);

    if (runtimeStatus === "disabled") {
        throw new AppError("Voucher đã bị vô hiệu hóa hoặc không khả dụng", 400);
    }

    if (runtimeStatus === "draft") {
        throw new AppError("Voucher chưa được kích hoạt", 400);
    }

    if (runtimeStatus === "scheduled") {
        throw new AppError("Voucher chỉ áp dụng sau thời gian bắt đầu", 400);
    }

    if (runtimeStatus === "expired") {
        throw new AppError("Voucher đã hết hạn sử dụng", 400);
    }

    if (voucher.minOrderValue && subtotal < voucher.minOrderValue) {
        throw new AppError(`Đơn hàng cần tối thiểu ${voucher.minOrderValue.toLocaleString("vi-VN")}đ để áp dụng voucher`, 400);
    }

    if (voucher.perUserLimit && userId) {
        const usage = voucher.userUsage?.find((u) => u.user.toString() === userId);
        if (usage && usage.count >= voucher.perUserLimit) {
            throw new AppError("Bạn đã sử dụng voucher này đạt giới hạn cho phép", 400);
        }
    }

    const discountAmount = calculateDiscountAmount(voucher, subtotal);
    if (discountAmount <= 0) {
        throw new AppError("Voucher không tạo ra ưu đãi cho giá trị đơn hàng hiện tại", 400);
    }

    return { discountAmount, runtimeStatus };
};

const mapVoucher = (voucher: IVoucher) => ({
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

export const voucherService = {
    normalizeCode,
    mapVoucher,
    getRuntimeStatus,

    async list(filters: VoucherFilters) {
        const { search, status, isActive, page = 1, limit = 20, sort = "latest" } = filters;

        const query: FilterQuery<IVoucher> = {};

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
            } else if (status === "active") {
                query.status = { $in: ["active", "scheduled"] };
                query.isActive = true;
            } else if (status === "expired") {
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
        const sortOption = sort === "usage" ? { usageCount: -1, updatedAt: -1 } : { createdAt: -1 };

        const [items, total] = await Promise.all([Voucher.find(query).sort(sortOption).skip(skip).limit(limit), Voucher.countDocuments(query)]);

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

    async create(payload: Partial<IVoucher>, userId?: string) {
        const code = payload.code ? normalizeCode(payload.code) : undefined;
        if (!code) {
            throw new AppError("Mã voucher là bắt buộc", 400);
        }

        const exists = await Voucher.findOne({ code });
        if (exists) {
            throw new AppError("Mã voucher đã tồn tại", 400);
        }

        const voucher = await Voucher.create({
            ...payload,
            code,
            createdBy: userId ? new Types.ObjectId(userId) : undefined,
            updatedBy: userId ? new Types.ObjectId(userId) : undefined
        });

        return mapVoucher(voucher);
    },

    async update(id: string, payload: Partial<IVoucher>, userId?: string) {
        const updateData: any = { ...payload };

        if (payload.code) {
            updateData.code = normalizeCode(payload.code);
        }

        if (userId) {
            updateData.updatedBy = new Types.ObjectId(userId);
        }

        const voucher = await Voucher.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true
        });

        if (!voucher) {
            throw new AppError("Không tìm thấy voucher", 404);
        }

        return mapVoucher(voucher);
    },

    async remove(id: string) {
        const voucher = await Voucher.findByIdAndDelete(id);
        if (!voucher) {
            throw new AppError("Không tìm thấy voucher", 404);
        }
        return mapVoucher(voucher);
    },

    async findById(id: string) {
        const voucher = await Voucher.findById(id);
        if (!voucher) {
            throw new AppError("Không tìm thấy voucher", 404);
        }
        return mapVoucher(voucher);
    },

    async preview(payload: VoucherValidationPayload) {
        const { code, subtotal, userId } = payload;
        if (!code || !code.trim()) {
            throw new AppError("Vui lòng nhập mã voucher", 400);
        }
        if (subtotal <= 0) {
            throw new AppError("Giá trị đơn hàng không hợp lệ để áp dụng voucher", 400);
        }

        const normalizedCode = normalizeCode(code);
        const voucher = await Voucher.findOne({ code: normalizedCode });

        if (!voucher) {
            throw new AppError("Voucher không tồn tại hoặc đã bị xóa", 404);
        }

        const { discountAmount, runtimeStatus } = ensureVoucherCanBeApplied(voucher, subtotal, userId);

        return {
            discountAmount,
            voucher: mapVoucher(voucher),
            runtimeStatus
        };
    },

    async incrementUsage(payload: VoucherUsagePayload) {
        const { voucherId, userId } = payload;
        const voucher = await Voucher.findById(voucherId);
        if (!voucher) return;

        voucher.usageCount += 1;
        voucher.lastUsedAt = new Date();

        if (userId && voucher.perUserLimit) {
            const existing = voucher.userUsage.find((usage) => usage.user.toString() === userId);
            if (existing) {
                existing.count += 1;
                existing.lastUsedAt = new Date();
            } else {
                voucher.userUsage.push({
                    user: new Types.ObjectId(userId),
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

