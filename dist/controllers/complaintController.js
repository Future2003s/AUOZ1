"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateComplaintRequest = exports.getComplaintRequests = exports.createComplaintRequest = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const Complaint_1 = require("../models/Complaint");
const AppError_1 = require("../utils/AppError");
const buildSearchFilter = (search) => {
    if (!search)
        return {};
    const regex = new RegExp(search, "i");
    return {
        $or: [
            { fullName: regex },
            { orderCode: regex },
            { email: regex },
            { phone: regex },
            { title: regex },
        ],
    };
};
exports.createComplaintRequest = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { fullName, orderCode, email, phone, title, description } = req.body;
    if (!fullName || !orderCode || !email || !title || !description) {
        return response_1.ResponseHandler.badRequest(res, "Vui lòng nhập đầy đủ các trường bắt buộc");
    }
    const complaint = await Complaint_1.Complaint.create({
        fullName,
        orderCode,
        email,
        phone,
        title,
        description,
        status: "new",
        history: [
            {
                action: "created",
                note: "Người dùng gửi yêu cầu khiếu nại",
                status: "new",
            },
        ],
    });
    return response_1.ResponseHandler.created(res, complaint, "Đã tiếp nhận yêu cầu khiếu nại");
});
exports.getComplaintRequests = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
    const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : 20;
    const statusParam = req.query.status || "";
    const allowedStatuses = [
        "new",
        "in_progress",
        "resolved",
        "rejected",
    ];
    const status = allowedStatuses.includes(statusParam)
        ? statusParam
        : undefined;
    const search = req.query.search || undefined;
    const filter = {
        ...(status ? { status } : {}),
        ...buildSearchFilter(search),
    };
    const [items, total] = await Promise.all([
        Complaint_1.Complaint.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        Complaint_1.Complaint.countDocuments(filter),
    ]);
    return response_1.ResponseHandler.paginated(res, items, page, limit, total);
});
exports.updateComplaintRequest = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { status, adminNotes } = req.body;
    if (!status && adminNotes === undefined) {
        throw new AppError_1.AppError("Không có dữ liệu để cập nhật", 400);
    }
    const update = {};
    if (status) {
        update.status = status;
    }
    if (adminNotes !== undefined) {
        update.adminNotes = adminNotes;
    }
    const historyEntry = status || adminNotes !== undefined
        ? {
            action: status ? `status:${status}` : "note:update",
            note: adminNotes,
            status,
            createdAt: new Date(),
            createdBy: req.user?._id,
        }
        : null;
    if (historyEntry) {
        update.$push = { history: historyEntry };
    }
    const complaint = await Complaint_1.Complaint.findByIdAndUpdate(id, update, {
        new: true,
    });
    if (!complaint) {
        return response_1.ResponseHandler.notFound(res, "Không tìm thấy yêu cầu");
    }
    return response_1.ResponseHandler.success(res, complaint, "Đã cập nhật yêu cầu khiếu nại");
});
