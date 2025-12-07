import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ResponseHandler } from "../utils/response";
import { INews, News, NewsStatus } from "../models/News";
import { AppError } from "../utils/AppError";

const slugifyTitle = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const buildSearchFilter = (search?: string) => {
  if (!search) return {};
  const regex = new RegExp(search, "i");
  return {
    $or: [{ title: regex }, { excerpt: regex }, { tags: regex }],
  };
};

const buildStatusFilter = (status?: string) => {
  if (!status) return {};
  if (status === "draft" || status === "published") {
    return { status };
  }
  return {};
};

export const createNews = asyncHandler(async (req: Request, res: Response) => {
  const {
    title,
    excerpt,
    content,
    contentBlocks,
    coverImage,
    category,
    tags = [],
    authorName,
    authorRole,
    readTime,
    locale = "vi",
    status = "draft",
    isFeatured = false,
    publishedAt,
    views,
  } = req.body as Partial<INews>;

  if (!title || !excerpt || !content) {
    return ResponseHandler.badRequest(
      res,
      "Vui lòng nhập đầy đủ tiêu đề, mô tả ngắn và nội dung."
    );
  }

  const baseSlug = slugifyTitle(title);
  let slug = baseSlug;
  let counter = 1;
  while (await News.exists({ slug })) {
    slug = `${baseSlug}-${counter++}`;
  }

  const news = await News.create({
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
    createdBy: (req as any).user?._id,
    updatedBy: (req as any).user?._id,
  });

  return ResponseHandler.created(res, news, "Đã tạo bài viết");
});

export const getPublicNews = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
    const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : 12;
    const locale = (req.query.locale as string) || "vi";
    const search = (req.query.search as string) || undefined;

    const filter: Record<string, any> = {
      status: "published",
      locale,
      ...buildSearchFilter(search),
    };

    // Debug logging
    console.log("getPublicNews filter:", JSON.stringify(filter, null, 2));
    
    // Check total count without filter first
    const totalAll = await News.countDocuments({});
    const totalPublished = await News.countDocuments({ status: "published" });
    const totalPublishedLocale = await News.countDocuments({ status: "published", locale });
    console.log(`News counts - All: ${totalAll}, Published: ${totalPublished}, Published+Locale(${locale}): ${totalPublishedLocale}`);

    const [items, total] = await Promise.all([
      News.find(filter)
        .sort({ 
          isFeatured: -1, 
          publishedAt: -1,
          createdAt: -1 // Fallback sort by createdAt if publishedAt is null
        })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      News.countDocuments(filter),
    ]);

    console.log(`getPublicNews returning ${items.length} items out of ${total} total`);

    return ResponseHandler.paginated(res, items, page, limit, total);
  }
);

export const getNewsBySlug = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const locale = (req.query.locale as string) || "vi";
  const news = await News.findOneAndUpdate(
    {
      slug,
      locale,
      status: "published",
    },
    { $inc: { views: 1 } },
    { new: true }
  ).lean();

  if (!news) {
    return ResponseHandler.notFound(res, "Không tìm thấy bài viết");
  }

  return ResponseHandler.success(res, news);
});

export const getAdminNewsById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const news = await News.findById(id).lean();

  if (!news) {
    return ResponseHandler.notFound(res, "Không tìm thấy bài viết");
  }

  return ResponseHandler.success(res, news);
});

export const getAdminNews = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
    const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : 20;
    const locale = (req.query.locale as string) || undefined;
    const search = (req.query.search as string) || undefined;
    const status = req.query.status as NewsStatus | undefined;

    const filter: Record<string, any> = {
      ...(locale ? { locale } : {}),
      ...buildStatusFilter(status),
      ...buildSearchFilter(search),
    };

    const [items, total] = await Promise.all([
      News.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      News.countDocuments(filter),
    ]);

    return ResponseHandler.paginated(res, items, page, limit, total);
  }
);

export const updateNews = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    title,
    excerpt,
    content,
    contentBlocks,
    coverImage,
    category,
    tags,
    authorName,
    authorRole,
    readTime,
    locale,
    status,
    isFeatured,
    publishedAt,
    views,
  } = req.body as Partial<INews>;

  const update: Record<string, any> = {
    updatedBy: (req as any).user?._id,
  };

  if (title) {
    update.title = title;
    const baseSlug = slugifyTitle(title);
    let slug = baseSlug;
    let counter = 1;
    while (await News.exists({ slug, _id: { $ne: id } })) {
      slug = `${baseSlug}-${counter++}`;
    }
    update.slug = slug;
  }

  if (excerpt !== undefined) update.excerpt = excerpt;
  if (content !== undefined) update.content = content;
  if (coverImage !== undefined) update.coverImage = coverImage;
  if (contentBlocks !== undefined) update.contentBlocks = contentBlocks;
  if (category !== undefined) update.category = category;
  if (tags !== undefined) update.tags = tags;
  if (authorName !== undefined) update.authorName = authorName;
  if (authorRole !== undefined) update.authorRole = authorRole;
  if (readTime !== undefined) update.readTime = readTime;
  if (locale !== undefined) update.locale = locale;
  if (typeof isFeatured === "boolean") update.isFeatured = isFeatured;

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

  const news = await News.findByIdAndUpdate(id, update, {
    new: true,
  });

  if (!news) {
    throw new AppError("Không tìm thấy bài viết", 404);
  }

  return ResponseHandler.updated(res, news, "Đã cập nhật bài viết");
});

export const deleteNews = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const news = await News.findByIdAndDelete(id);
  if (!news) {
    throw new AppError("Không tìm thấy bài viết", 404);
  }
  return ResponseHandler.deleted(res, "Đã xoá bài viết");
});

