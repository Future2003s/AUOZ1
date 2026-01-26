import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ResponseHandler } from "../utils/response";
import { ITask, Task, TaskStatus } from "../models/Task";
import { AppError } from "../utils/AppError";

// @desc    Create new task
// @route   POST /api/v1/tasks
// @access  Private (Employee/Admin)
export const createTask = asyncHandler(async (req: Request, res: Response) => {
  const { date, title, assignee, tag, status, description, deadline, progressNotes } = req.body as Partial<ITask>;

  if (!date || !title) {
    return ResponseHandler.badRequest(
      res,
      "Vui lòng nhập đầy đủ ngày và tiêu đề công việc."
    );
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return ResponseHandler.badRequest(
      res,
      "Định dạng ngày không hợp lệ. Vui lòng sử dụng định dạng YYYY-MM-DD."
    );
  }

  // Validate deadline format if provided
  if (deadline && !dateRegex.test(deadline)) {
    return ResponseHandler.badRequest(
      res,
      "Định dạng thời hạn không hợp lệ. Vui lòng sử dụng định dạng YYYY-MM-DD."
    );
  }

  const task = await Task.create({
    date,
    title,
    assignee: assignee || "Chưa chỉ định",
    tag: tag || "Chung",
    status: (status as TaskStatus) || "todo",
    description: description || "",
    deadline: deadline || undefined,
    progressNotes: progressNotes || "",
    createdBy: (req as any).user?._id,
    updatedBy: (req as any).user?._id,
  });

  return ResponseHandler.created(res, task, "Đã tạo công việc mới");
});

// @desc    Get all tasks
// @route   GET /api/v1/tasks
// @access  Private (Employee/Admin)
export const getTasks = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
  const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : 100;
  const skip = (page - 1) * limit;

  // Build filter
  const filter: Record<string, any> = {};

  // Filter by date range
  if (req.query.startDate && req.query.endDate) {
    filter.date = {
      $gte: req.query.startDate,
      $lte: req.query.endDate,
    };
  } else if (req.query.date) {
    filter.date = req.query.date;
  }

  // Filter by status
  if (req.query.status && ["todo", "pending", "done"].includes(req.query.status as string)) {
    filter.status = req.query.status;
  }

  // Filter by assignee
  if (req.query.assignee) {
    filter.assignee = new RegExp(req.query.assignee as string, "i");
  }

  // Filter by tag
  if (req.query.tag) {
    filter.tag = new RegExp(req.query.tag as string, "i");
  }

  // For employee: show tasks they created OR tasks assigned to them
  // For admin/seller: show all tasks
  const user = (req as any).user;
  if (user && user.role !== "admin" && user.role !== "seller" && user.role !== "staff") {
    // Employee can see: tasks they created OR tasks assigned to them (by name or email)
    const userFullName = user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}`.trim()
      : user.email || "";
    const userEmail = user.email || "";
    
    filter.$or = [
      { createdBy: user._id },
      { assignee: new RegExp(userFullName, "i") },
      { assignee: new RegExp(userEmail, "i") }
    ];
  }

  const tasks = await Task.find(filter)
    .sort({ date: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Task.countDocuments(filter);

  return ResponseHandler.paginated(res, tasks, page, limit, total, "Lấy danh sách công việc thành công");
});

// @desc    Get tasks by date
// @route   GET /api/v1/tasks/date/:date
// @access  Private (Employee/Admin)
export const getTasksByDate = asyncHandler(async (req: Request, res: Response) => {
  const { date } = req.params;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return ResponseHandler.badRequest(res, "Định dạng ngày không hợp lệ");
  }

  const filter: Record<string, any> = { date };

  // For employee: show tasks they created OR tasks assigned to them
  // For admin/seller: show all tasks
  const user = (req as any).user;
  if (user && user.role !== "admin" && user.role !== "seller" && user.role !== "staff") {
    // Employee can see: tasks they created OR tasks assigned to them (by name or email)
    const userFullName = user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}`.trim()
      : user.email || "";
    const userEmail = user.email || "";
    
    filter.$or = [
      { createdBy: user._id },
      { assignee: new RegExp(userFullName, "i") },
      { assignee: new RegExp(userEmail, "i") }
    ];
  }

  const tasks = await Task.find(filter)
    .sort({ createdAt: -1 })
    .lean();

  return ResponseHandler.success(res, tasks, "Lấy danh sách công việc theo ngày thành công");
});

// @desc    Get single task
// @route   GET /api/v1/tasks/:id
// @access  Private (Employee/Admin)
export const getTaskById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const filter: Record<string, any> = { _id: id };

  // For employee: show tasks they created OR tasks assigned to them
  // For admin/seller: show all tasks
  const user = (req as any).user;
  if (user && user.role !== "admin" && user.role !== "seller" && user.role !== "staff") {
    // Employee can see: tasks they created OR tasks assigned to them (by name or email)
    const userFullName = user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}`.trim()
      : user.email || "";
    const userEmail = user.email || "";
    
    filter.$or = [
      { createdBy: user._id },
      { assignee: new RegExp(userFullName, "i") },
      { assignee: new RegExp(userEmail, "i") }
    ];
  }

  const task = await Task.findOne(filter).lean();

  if (!task) {
    return ResponseHandler.notFound(res, "Không tìm thấy công việc");
  }

  return ResponseHandler.success(res, task, "Lấy thông tin công việc thành công");
});

// @desc    Update task
// @route   PUT /api/v1/tasks/:id
// @access  Private (Employee/Admin)
export const updateTask = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { date, title, assignee, tag, status, description, deadline, progressNotes } = req.body as Partial<ITask>;

  const filter: Record<string, any> = { _id: id };

  // For employee: can update tasks they created OR tasks assigned to them
  // For admin: can update all tasks
  const user = (req as any).user;
  if (user && user.role !== "admin" && user.role !== "staff") {
    // Employee can update: tasks they created OR tasks assigned to them
    const userFullName = user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}`.trim()
      : user.email || "";
    const userEmail = user.email || "";
    
    filter.$or = [
      { createdBy: user._id },
      { assignee: new RegExp(userFullName, "i") },
      { assignee: new RegExp(userEmail, "i") }
    ];
  }

  const task = await Task.findOne(filter);

  if (!task) {
    return ResponseHandler.notFound(res, "Không tìm thấy công việc");
  }

  // Validate date format if provided
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (date) {
    if (!dateRegex.test(date)) {
      return ResponseHandler.badRequest(
        res,
        "Định dạng ngày không hợp lệ. Vui lòng sử dụng định dạng YYYY-MM-DD."
      );
    }
    task.date = date;
  }

  // Validate deadline format if provided
  if (deadline !== undefined) {
    if (deadline && !dateRegex.test(deadline)) {
      return ResponseHandler.badRequest(
        res,
        "Định dạng thời hạn không hợp lệ. Vui lòng sử dụng định dạng YYYY-MM-DD."
      );
    }
    task.deadline = deadline || undefined;
  }

  if (title) task.title = title;
  if (assignee !== undefined) task.assignee = assignee || "Chưa chỉ định";
  if (tag !== undefined) task.tag = tag || "Chung";
  if (status && ["todo", "pending", "done"].includes(status)) {
    task.status = status as TaskStatus;
  }
  if (description !== undefined) task.description = description || "";
  if (progressNotes !== undefined) task.progressNotes = progressNotes || "";
  task.updatedBy = user?._id;

  await task.save();

  return ResponseHandler.updated(res, task, "Cập nhật công việc thành công");
});

// @desc    Delete task
// @route   DELETE /api/v1/tasks/:id
// @access  Private (Employee/Admin)
export const deleteTask = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const filter: Record<string, any> = { _id: id };

  // Filter by createdBy (if user is not admin, only delete their tasks)
  const user = (req as any).user;
  if (user && user.role !== "admin") {
    filter.createdBy = user._id;
  }

  const task = await Task.findOneAndDelete(filter);

  if (!task) {
    return ResponseHandler.notFound(res, "Không tìm thấy công việc");
  }

  return ResponseHandler.deleted(res, "Xóa công việc thành công");
});

// @desc    Toggle task status
// @route   PATCH /api/v1/tasks/:id/toggle-status
// @access  Private (Employee/Admin)
export const toggleTaskStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const filter: Record<string, any> = { _id: id };

  // For employee: can update tasks they created OR tasks assigned to them
  // For admin: can update all tasks
  const user = (req as any).user;
  if (user && user.role !== "admin" && user.role !== "staff") {
    // Employee can update: tasks they created OR tasks assigned to them
    const userFullName = user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}`.trim()
      : user.email || "";
    const userEmail = user.email || "";
    
    filter.$or = [
      { createdBy: user._id },
      { assignee: new RegExp(userFullName, "i") },
      { assignee: new RegExp(userEmail, "i") }
    ];
  }

  const task = await Task.findOne(filter);

  if (!task) {
    return ResponseHandler.notFound(res, "Không tìm thấy công việc");
  }

  // Toggle between done and todo
  task.status = task.status === "done" ? "todo" : "done";
  task.updatedBy = user?._id;

  await task.save();

  return ResponseHandler.updated(res, task, "Cập nhật trạng thái công việc thành công");
});

