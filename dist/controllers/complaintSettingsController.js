"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateComplaintSettings = exports.getComplaintSettings = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const ComplaintSettings_1 = require("../models/ComplaintSettings");
const defaultSteps = [
    {
        title: "Tiếp nhận & xác thực",
        description: "Kiểm tra thông tin đơn hàng và xác thực yêu cầu của khách hàng.",
    },
    {
        title: "Liên hệ & làm rõ",
        description: "Trong vòng 24h, bộ phận CSKH sẽ liên hệ để trao đổi chi tiết và đề xuất phương án xử lý.",
    },
    {
        title: "Xử lý & phản hồi",
        description: "Tiến hành bồi hoàn, đổi trả hoặc hỗ trợ kỹ thuật theo thỏa thuận với khách hàng.",
    },
    {
        title: "Hoàn tất & ghi nhận",
        description: "Gửi biên bản hoàn tất khiếu nại và ghi nhận phản hồi cuối cùng.",
    },
];
exports.getComplaintSettings = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    let settings = await ComplaintSettings_1.ComplaintSettings.findOne();
    if (!settings) {
        settings = await ComplaintSettings_1.ComplaintSettings.create({
            steps: defaultSteps,
        });
    }
    const payload = settings ? settings.toObject() : { steps: defaultSteps };
    response_1.ResponseHandler.success(res, payload);
});
exports.updateComplaintSettings = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const userId = req.user?.id;
    const payload = {
        ...req.body,
        updatedBy: userId,
    };
    const settings = await ComplaintSettings_1.ComplaintSettings.findOneAndUpdate({}, payload, {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
    }).lean();
    response_1.ResponseHandler.success(res, settings, "Complaint settings updated successfully");
});
