"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyVoucher = exports.deleteVoucher = exports.updateVoucher = exports.createVoucher = exports.getVoucher = exports.getVouchers = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const voucherService_1 = require("../services/voucherService");
exports.getVouchers = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { search, status = "all", isActive, page = "1", limit = "20", sort = "latest" } = req.query;
    const result = await voucherService_1.voucherService.list({
        search: search || "",
        status: status || "all",
        isActive: typeof isActive === "string" ? isActive === "true" : undefined,
        page: Number(page) || 1,
        limit: Math.min(Number(limit) || 20, 100),
        sort: sort || "latest"
    });
    return response_1.ResponseHandler.success(res, result, "Lấy danh sách voucher thành công");
});
exports.getVoucher = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const voucher = await voucherService_1.voucherService.findById(id);
    return response_1.ResponseHandler.success(res, voucher, "Lấy thông tin voucher thành công");
});
exports.createVoucher = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    const voucher = await voucherService_1.voucherService.create(req.body, userId);
    return response_1.ResponseHandler.created(res, voucher, "Tạo voucher thành công");
});
exports.updateVoucher = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const voucher = await voucherService_1.voucherService.update(id, req.body, userId);
    return response_1.ResponseHandler.updated(res, voucher, "Cập nhật voucher thành công");
});
exports.deleteVoucher = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    await voucherService_1.voucherService.remove(id);
    return response_1.ResponseHandler.deleted(res, "Đã xóa voucher");
});
exports.applyVoucher = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { code, subtotal } = req.body || {};
    const userId = req.user?.id;
    const numericSubtotal = Number(subtotal);
    const result = await voucherService_1.voucherService.preview({
        code,
        subtotal: numericSubtotal,
        userId
    });
    return response_1.ResponseHandler.success(res, result, "Áp dụng voucher thành công");
});
