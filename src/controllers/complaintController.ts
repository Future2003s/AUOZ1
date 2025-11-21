import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ResponseHandler } from "../utils/response";
import { Complaint, ComplaintStatus } from "../models/Complaint";
import { AppError } from "../utils/AppError";

const buildSearchFilter = (search?: string) => {
  if (!search) return {};
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

export const createComplaintRequest = asyncHandler(
  async (req: Request, res: Response) => {
    const { fullName, orderCode, email, phone, title, description } = req.body;

    if (!fullName || !orderCode || !email || !title || !description) {
      return ResponseHandler.badRequest(
        res,
        "Vui lòng nhập đầy đủ các trường bắt buộc"
      );
    }

    const complaint = await Complaint.create({
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

    return ResponseHandler.created(
      res,
      complaint,
      "Đã tiếp nhận yêu cầu khiếu nại"
    );
  }
);

export const getComplaintRequests = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
    const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : 20;
    const statusParam = (req.query.status as string) || "";
    const allowedStatuses: ComplaintStatus[] = [
      "new",
      "in_progress",
      "resolved",
      "rejected",
    ];
    const status = allowedStatuses.includes(statusParam as ComplaintStatus)
      ? (statusParam as ComplaintStatus)
      : undefined;
    const search = (req.query.search as string) || undefined;

    const filter: Record<string, any> = {
      ...(status ? { status } : {}),
      ...buildSearchFilter(search),
    };

    const [items, total] = await Promise.all([
      Complaint.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Complaint.countDocuments(filter),
    ]);

    return ResponseHandler.paginated(res, items, page, limit, total);
  }
);

export const updateComplaintRequest = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, adminNotes } = req.body as {
      status?: ComplaintStatus;
      adminNotes?: string;
    };

    if (!status && adminNotes === undefined) {
      throw new AppError("Không có dữ liệu để cập nhật", 400);
    }

    const update: Record<string, any> = {};

    if (status) {
      update.status = status;
    }

    if (adminNotes !== undefined) {
      update.adminNotes = adminNotes;
    }

    const historyEntry =
      status || adminNotes !== undefined
        ? {
            action: status ? `status:${status}` : "note:update",
            note: adminNotes,
            status,
            createdAt: new Date(),
            createdBy: (req as any).user?._id,
          }
        : null;

    if (historyEntry) {
      update.$push = { history: historyEntry };
    }

    const complaint = await Complaint.findByIdAndUpdate(id, update, {
      new: true,
    });

    if (!complaint) {
      return ResponseHandler.notFound(res, "Không tìm thấy yêu cầu");
    }

    return ResponseHandler.success(
      res,
      complaint,
      "Đã cập nhật yêu cầu khiếu nại"
    );
  }
);

