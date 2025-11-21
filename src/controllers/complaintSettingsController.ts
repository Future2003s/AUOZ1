import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ResponseHandler } from "../utils/response";
import { ComplaintSettings } from "../models/ComplaintSettings";

const defaultSteps = [
  {
    title: "Tiếp nhận & xác thực",
    description:
      "Kiểm tra thông tin đơn hàng và xác thực yêu cầu của khách hàng.",
  },
  {
    title: "Liên hệ & làm rõ",
    description:
      "Trong vòng 24h, bộ phận CSKH sẽ liên hệ để trao đổi chi tiết và đề xuất phương án xử lý.",
  },
  {
    title: "Xử lý & phản hồi",
    description:
      "Tiến hành bồi hoàn, đổi trả hoặc hỗ trợ kỹ thuật theo thỏa thuận với khách hàng.",
  },
  {
    title: "Hoàn tất & ghi nhận",
    description: "Gửi biên bản hoàn tất khiếu nại và ghi nhận phản hồi cuối cùng.",
  },
];

export const getComplaintSettings = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    let settings = await ComplaintSettings.findOne();

    if (!settings) {
      settings = await ComplaintSettings.create({
        steps: defaultSteps,
      });
    }

    const payload = settings ? settings.toObject() : { steps: defaultSteps };

    ResponseHandler.success(res, payload);
  }
);

export const updateComplaintSettings = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.id;
    const payload = {
      ...req.body,
      updatedBy: userId,
    };

    const settings = await ComplaintSettings.findOneAndUpdate({}, payload, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }).lean();

    ResponseHandler.success(res, settings, "Complaint settings updated successfully");
  }
);


