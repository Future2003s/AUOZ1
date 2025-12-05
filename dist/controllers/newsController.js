"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteNews = exports.updateNews = exports.getAdminNews = exports.getNewsBySlug = exports.getPublicNews = exports.createNews = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const News_1 = require("../models/News");
const AppError_1 = require("../utils/AppError");
const slugifyTitle = (value) => value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
const buildSearchFilter = (search) => {
    if (!search)
        return {};
    const regex = new RegExp(search, "i");
    return {
        $or: [{ title: regex }, { excerpt: regex }, { tags: regex }],
    };
};
const buildStatusFilter = (status) => {
    if (!status)
        return {};
    if (status === "draft" || status === "published") {
        return { status };
    }
    return {};
};
exports.createNews = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { title, excerpt, content, contentBlocks, coverImage, category, tags = [], authorName, authorRole, readTime, locale = "vi", status = "draft", isFeatured = false, publishedAt, views, } = req.body;
    if (!title || !excerpt || !content) {
        return response_1.ResponseHandler.badRequest(res, "Vui lòng nhập đầy đủ tiêu đề, mô tả ngắn và nội dung.");
    }
    const baseSlug = slugifyTitle(title);
    let slug = baseSlug;
    let counter = 1;
    while (await News_1.News.exists({ slug })) {
        slug = `${baseSlug}-${counter++}`;
    }
    const news = await News_1.News.create({
        title,
        slug,
        excerpt,
        content,
        coverImage,
        contentBlocks,
        category,
        tags,
        authorName,
        authorRole,
        readTime,
        locale,
        status,
        isFeatured,
        views: typeof views === "number" ? views : 0,
        publishedAt: publishedAt || (status === "published" ? new Date() : null),
        createdBy: req.user?._id,
        updatedBy: req.user?._id,
    });
    return response_1.ResponseHandler.created(res, news, "Đã tạo bài viết");
});
exports.getPublicNews = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
    const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : 12;
    const locale = req.query.locale || "vi";
    const search = req.query.search || undefined;
    const filter = {
        status: "published",
        locale,
        ...buildSearchFilter(search),
    };
    const [items, total] = await Promise.all([
        News_1.News.find(filter)
            .sort({ isFeatured: -1, publishedAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        News_1.News.countDocuments(filter),
    ]);
    return response_1.ResponseHandler.paginated(res, items, page, limit, total);
});
exports.getNewsBySlug = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { slug } = req.params;
    const locale = req.query.locale || "vi";
    const news = await News_1.News.findOneAndUpdate({
        slug,
        locale,
        status: "published",
    }, { $inc: { views: 1 } }, { new: true }).lean();
    if (!news) {
        return response_1.ResponseHandler.notFound(res, "Không tìm thấy bài viết");
    }
    return response_1.ResponseHandler.success(res, news);
});
exports.getAdminNews = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
    const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : 20;
    const locale = req.query.locale || undefined;
    const search = req.query.search || undefined;
    const status = req.query.status;
    const filter = {
        ...(locale ? { locale } : {}),
        ...buildStatusFilter(status),
        ...buildSearchFilter(search),
    };
    const [items, total] = await Promise.all([
        News_1.News.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        News_1.News.countDocuments(filter),
    ]);
    return response_1.ResponseHandler.paginated(res, items, page, limit, total);
});
exports.updateNews = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { title, excerpt, content, contentBlocks, coverImage, category, tags, authorName, authorRole, readTime, locale, status, isFeatured, publishedAt, views, } = req.body;
    const update = {
        updatedBy: req.user?._id,
    };
    if (title) {
        update.title = title;
        const baseSlug = slugifyTitle(title);
        let slug = baseSlug;
        let counter = 1;
        while (await News_1.News.exists({ slug, _id: { $ne: id } })) {
            slug = `${baseSlug}-${counter++}`;
        }
        update.slug = slug;
    }
    if (excerpt !== undefined)
        update.excerpt = excerpt;
    if (content !== undefined)
        update.content = content;
    if (coverImage !== undefined)
        update.coverImage = coverImage;
    if (contentBlocks !== undefined)
        update.contentBlocks = contentBlocks;
    if (category !== undefined)
        update.category = category;
    if (tags !== undefined)
        update.tags = tags;
    if (authorName !== undefined)
        update.authorName = authorName;
    if (authorRole !== undefined)
        update.authorRole = authorRole;
    if (readTime !== undefined)
        update.readTime = readTime;
    if (locale !== undefined)
        update.locale = locale;
    if (typeof isFeatured === "boolean")
        update.isFeatured = isFeatured;
    if (status) {
        update.status = status;
        if (status === "published" && !publishedAt) {
            update.publishedAt = new Date();
        }
    }
    if (publishedAt !== undefined) {
        update.publishedAt = publishedAt;
    }
    if (typeof views === "number") {
        update.views = views;
    }
    const news = await News_1.News.findByIdAndUpdate(id, update, {
        new: true,
    });
    if (!news) {
        throw new AppError_1.AppError("Không tìm thấy bài viết", 404);
    }
    return response_1.ResponseHandler.updated(res, news, "Đã cập nhật bài viết");
});
exports.deleteNews = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const news = await News_1.News.findByIdAndDelete(id);
    if (!news) {
        throw new AppError_1.AppError("Không tìm thấy bài viết", 404);
    }
    return response_1.ResponseHandler.deleted(res, "Đã xoá bài viết");
});
