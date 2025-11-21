import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ResponseHandler } from "../utils/response";
import { voucherService } from "../services/voucherService";

export const getVouchers = asyncHandler(async (req: Request, res: Response) => {
    const { search, status = "all", isActive, page = "1", limit = "20", sort = "latest" } = req.query;

    const result = await voucherService.list({
        search: (search as string) || "",
        status: (status as any) || "all",
        isActive: typeof isActive === "string" ? isActive === "true" : undefined,
        page: Number(page) || 1,
        limit: Math.min(Number(limit) || 20, 100),
        sort: (sort as "latest" | "usage") || "latest"
    });

    return ResponseHandler.success(res, result, "Lấy danh sách voucher thành công");
});

export const getVoucher = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const voucher = await voucherService.findById(id);
    return ResponseHandler.success(res, voucher, "Lấy thông tin voucher thành công");
});

export const createVoucher = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const voucher = await voucherService.create(req.body, userId);
    return ResponseHandler.created(res, voucher, "Tạo voucher thành công");
});

export const updateVoucher = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const voucher = await voucherService.update(id, req.body, userId);
    return ResponseHandler.updated(res, voucher, "Cập nhật voucher thành công");
});

export const deleteVoucher = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await voucherService.remove(id);
    return ResponseHandler.deleted(res, "Đã xóa voucher");
});

export const applyVoucher = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { code, subtotal } = req.body || {};
    const userId = (req as any).user?.id;

    const numericSubtotal = Number(subtotal);
    const result = await voucherService.preview({
        code,
        subtotal: numericSubtotal,
        userId
    });

    return ResponseHandler.success(res, result, "Áp dụng voucher thành công");
});

