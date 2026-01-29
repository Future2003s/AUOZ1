"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleTaskStatus = exports.deleteTask = exports.updateTask = exports.getTaskById = exports.getTasksByDate = exports.getTasks = exports.createTask = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const Task_1 = require("../models/Task");
// @desc    Create new task
// @route   POST /api/v1/tasks
// @access  Private (Employee/Admin)
exports.createTask = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { date, title, assignee, tag, status, description, deadline, progressNotes } = req.body;
    if (!date || !title) {
        return response_1.ResponseHandler.badRequest(res, "Vui lòng nhập đầy đủ ngày và tiêu đề công việc.");
    }
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
        return response_1.ResponseHandler.badRequest(res, "Định dạng ngày không hợp lệ. Vui lòng sử dụng định dạng YYYY-MM-DD.");
    }
    // Validate deadline format if provided
    if (deadline && !dateRegex.test(deadline)) {
        return response_1.ResponseHandler.badRequest(res, "Định dạng thời hạn không hợp lệ. Vui lòng sử dụng định dạng YYYY-MM-DD.");
    }
    const task = await Task_1.Task.create({
        date,
        title,
        assignee: assignee || "Chưa chỉ định",
        tag: tag || "Chung",
        status: status || "todo",
        description: description || "",
        deadline: deadline || undefined,
        progressNotes: progressNotes || "",
        createdBy: req.user?._id,
        updatedBy: req.user?._id,
    });
    return response_1.ResponseHandler.created(res, task, "Đã tạo công việc mới");
});
// @desc    Get all tasks
// @route   GET /api/v1/tasks
// @access  Private (Employee/Admin)
exports.getTasks = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
    const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : 100;
    const skip = (page - 1) * limit;
    // Build filter
    const filter = {};
    // Filter by date range
    if (req.query.startDate && req.query.endDate) {
        filter.date = {
            $gte: req.query.startDate,
            $lte: req.query.endDate,
        };
    }
    else if (req.query.date) {
        filter.date = req.query.date;
    }
    // Filter by status
    if (req.query.status && ["todo", "pending", "done"].includes(req.query.status)) {
        filter.status = req.query.status;
    }
    // Filter by assignee
    if (req.query.assignee) {
        filter.assignee = new RegExp(req.query.assignee, "i");
    }
    // Filter by tag
    if (req.query.tag) {
        filter.tag = new RegExp(req.query.tag, "i");
    }
    // For employee: show tasks they created OR tasks assigned to them
    // For admin/seller: show all tasks
    const user = req.user;
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
    const tasks = await Task_1.Task.find(filter)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    const total = await Task_1.Task.countDocuments(filter);
    return response_1.ResponseHandler.paginated(res, tasks, page, limit, total, "Lấy danh sách công việc thành công");
});
// @desc    Get tasks by date
// @route   GET /api/v1/tasks/date/:date
// @access  Private (Employee/Admin)
exports.getTasksByDate = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { date } = req.params;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return response_1.ResponseHandler.badRequest(res, "Định dạng ngày không hợp lệ");
    }
    const filter = { date };
    // For employee: show tasks they created OR tasks assigned to them
    // For admin/seller: show all tasks
    const user = req.user;
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
    const tasks = await Task_1.Task.find(filter)
        .sort({ createdAt: -1 })
        .lean();
    return response_1.ResponseHandler.success(res, tasks, "Lấy danh sách công việc theo ngày thành công");
});
// @desc    Get single task
// @route   GET /api/v1/tasks/:id
// @access  Private (Employee/Admin)
exports.getTaskById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const filter = { _id: id };
    // For employee: show tasks they created OR tasks assigned to them
    // For admin/seller: show all tasks
    const user = req.user;
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
    const task = await Task_1.Task.findOne(filter).lean();
    if (!task) {
        return response_1.ResponseHandler.notFound(res, "Không tìm thấy công việc");
    }
    return response_1.ResponseHandler.success(res, task, "Lấy thông tin công việc thành công");
});
// @desc    Update task
// @route   PUT /api/v1/tasks/:id
// @access  Private (Employee/Admin)
exports.updateTask = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { date, title, assignee, tag, status, description, deadline, progressNotes } = req.body;
    const filter = { _id: id };
    // For employee: can update tasks they created OR tasks assigned to them
    // For admin: can update all tasks
    const user = req.user;
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
    const task = await Task_1.Task.findOne(filter);
    if (!task) {
        return response_1.ResponseHandler.notFound(res, "Không tìm thấy công việc");
    }
    // Validate date format if provided
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (date) {
        if (!dateRegex.test(date)) {
            return response_1.ResponseHandler.badRequest(res, "Định dạng ngày không hợp lệ. Vui lòng sử dụng định dạng YYYY-MM-DD.");
        }
        task.date = date;
    }
    // Validate deadline format if provided
    if (deadline !== undefined) {
        if (deadline && !dateRegex.test(deadline)) {
            return response_1.ResponseHandler.badRequest(res, "Định dạng thời hạn không hợp lệ. Vui lòng sử dụng định dạng YYYY-MM-DD.");
        }
        task.deadline = deadline || undefined;
    }
    if (title)
        task.title = title;
    if (assignee !== undefined)
        task.assignee = assignee || "Chưa chỉ định";
    if (tag !== undefined)
        task.tag = tag || "Chung";
    if (status && ["todo", "pending", "done"].includes(status)) {
        task.status = status;
    }
    if (description !== undefined)
        task.description = description || "";
    if (progressNotes !== undefined)
        task.progressNotes = progressNotes || "";
    task.updatedBy = user?._id;
    await task.save();
    return response_1.ResponseHandler.updated(res, task, "Cập nhật công việc thành công");
});
// @desc    Delete task
// @route   DELETE /api/v1/tasks/:id
// @access  Private (Employee/Admin)
exports.deleteTask = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const filter = { _id: id };
    // Filter by createdBy (if user is not admin, only delete their tasks)
    const user = req.user;
    if (user && user.role !== "admin") {
        filter.createdBy = user._id;
    }
    const task = await Task_1.Task.findOneAndDelete(filter);
    if (!task) {
        return response_1.ResponseHandler.notFound(res, "Không tìm thấy công việc");
    }
    return response_1.ResponseHandler.deleted(res, "Xóa công việc thành công");
});
// @desc    Toggle task status
// @route   PATCH /api/v1/tasks/:id/toggle-status
// @access  Private (Employee/Admin)
exports.toggleTaskStatus = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const filter = { _id: id };
    // For employee: can update tasks they created OR tasks assigned to them
    // For admin: can update all tasks
    const user = req.user;
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
    const task = await Task_1.Task.findOne(filter);
    if (!task) {
        return response_1.ResponseHandler.notFound(res, "Không tìm thấy công việc");
    }
    // Toggle between done and todo
    task.status = task.status === "done" ? "todo" : "done";
    task.updatedBy = user?._id;
    await task.save();
    return response_1.ResponseHandler.updated(res, task, "Cập nhật trạng thái công việc thành công");
});
