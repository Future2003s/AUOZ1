"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateHomepageSettings = exports.getDraftHomepageSettings = exports.getHomepageSettings = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const HomepageSettings_1 = require("../models/HomepageSettings");
// Default homepage settings
const getDefaultSettings = () => ({
    typography: {
        headingFont: 'Playfair Display',
        bodyFont: 'Be Vietnam Pro',
        googleFontUrl: "https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap",
        baseFontSize: 16,
        headingSizes: {
            h1: 48,
            h2: 36,
            h3: 24,
            h4: 20
        }
    },
    colors: {
        primary: '#e11d48',
        secondary: '#f43f5e',
        accent: '#fda4af',
        background: '#ffffff',
        text: '#1e293b'
    },
    hero: {
        slides: [
            {
                imageUrl: "https://res.cloudinary.com/duw5dconp/image/upload/v1752657773/banner_1_xqhehz.jpg",
                title: "Tinh hoa từ <span className=\"text-rose-300\">Trái Vải</span>",
                subtitle: "Khám phá bộ sưu tập sản phẩm cao cấp được chế tác từ những trái vải tươi ngon và tinh khiết nhất.",
                ctaText: "Khám phá bộ sưu tập",
                ctaLink: "#products",
                order: 0
            },
            {
                imageUrl: "https://res.cloudinary.com/duw5dconp/image/upload/v1752657773/banner_2_uswdjc.jpg",
                title: "Bộ Sưu Tập <span className=\"text-rose-300\">Quà Tặng Mới</span>",
                subtitle: "Món quà ý nghĩa và sang trọng cho những người bạn trân quý.",
                ctaText: "Xem ngay",
                ctaLink: "#collections",
                order: 1
            },
            {
                imageUrl: "https://res.cloudinary.com/duw5dconp/image/upload/v1752657773/banner_3_n36dif.jpg",
                title: "Trà Vải <span className=\"text-rose-300\">Thượng Hạng</span>",
                subtitle: "Trải nghiệm hương vị độc đáo, đánh thức mọi giác quan.",
                ctaText: "Thử ngay",
                ctaLink: "#products",
                order: 2
            },
            {
                imageUrl: "https://res.cloudinary.com/duw5dconp/image/upload/v1752657773/banner_4_dmohbb.jpg",
                title: "Trà Vải <span className=\"text-rose-300\">Thượng Hạng</span>",
                subtitle: "Trải nghiệm hương vị độc đáo, đánh thức mọi giác quan.",
                ctaText: "Thử ngay",
                ctaLink: "#products",
                order: 3
            }
        ]
    },
    marquee: {
        items: [
            "100% Vải Tươi Tuyển Chọn",
            "Công Thức Độc Quyền",
            "Quà Tặng Sang Trọng",
            "Giao Hàng Toàn Quốc",
            "Chất Lượng Hàng Đầu"
        ],
        enabled: true
    },
    featuredProducts: {
        productIds: [],
        title: "Sản Phẩm Nổi Bật",
        subtitle: "Những sáng tạo độc đáo từ LALA-LYCHEE, kết tinh hương vị ngọt ngào của đất trời và tâm huyết của người nông dân.",
        enabled: true
    },
    about: {
        title: "",
        content: "",
        enabled: true
    },
    socialProof: {
        testimonials: [],
        enabled: true
    },
    collectionSection: {
        title: "",
        description: "",
        enabled: true
    },
    craft: {
        title: "",
        description: "",
        images: [],
        enabled: true
    },
    map: {
        enabled: true
    },
    seo: {
        title: "LALA-LYCHEE - Tinh hoa từ Trái Vải",
        description: "Khám phá bộ sưu tập sản phẩm cao cấp từ vải tươi",
        keywords: ["vải", "lychee", "trà vải", "quà tặng"]
    },
    status: 'published',
    version: 1
});
// @desc    Get published homepage settings (public)
// @route   GET /api/v1/homepage
// @access  Public
exports.getHomepageSettings = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    let settings = await HomepageSettings_1.HomepageSettings.findOne({ status: 'published' })
        .sort({ version: -1 })
        .lean();
    // If no published settings exist, create default and return it
    if (!settings) {
        const defaultSettings = getDefaultSettings();
        const newSettings = await HomepageSettings_1.HomepageSettings.create({
            ...defaultSettings,
            status: 'published',
            publishedAt: new Date()
        });
        settings = newSettings.toObject();
    }
    response_1.ResponseHandler.success(res, settings, "Homepage settings retrieved successfully");
});
// @desc    Get draft homepage settings (admin only)
// @route   GET /api/v1/homepage/draft
// @access  Private/Admin
exports.getDraftHomepageSettings = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    let draft = await HomepageSettings_1.HomepageSettings.findOne({ status: 'draft' })
        .sort({ createdAt: -1 })
        .lean();
    // If no draft exists, get published or create default
    if (!draft) {
        const published = await HomepageSettings_1.HomepageSettings.findOne({ status: 'published' })
            .sort({ version: -1 })
            .lean();
        if (published) {
            // Create draft from published
            const { _id, __v, createdAt, updatedAt, ...publishedData } = published;
            const newDraft = await HomepageSettings_1.HomepageSettings.create({
                ...publishedData,
                status: 'draft',
                version: (published.version || 1) + 1
            });
            draft = newDraft.toObject();
        }
        else {
            // Create default draft
            const defaultSettings = getDefaultSettings();
            const newDraft = await HomepageSettings_1.HomepageSettings.create({
                ...defaultSettings,
                status: 'draft'
            });
            draft = newDraft.toObject();
        }
    }
    response_1.ResponseHandler.success(res, draft, "Draft homepage settings retrieved successfully");
});
// @desc    Update homepage settings
// @route   PUT /api/v1/homepage
// @access  Private/Admin
exports.updateHomepageSettings = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const userId = req.user?.id;
    const { status, ...updateData } = req.body;
    // Determine if we're updating draft or publishing
    const targetStatus = status || 'draft';
    let settings;
    if (targetStatus === 'published') {
        // When publishing, we update/create published version
        const updated = await HomepageSettings_1.HomepageSettings.findOneAndUpdate({ status: 'published' }, {
            ...updateData,
            status: 'published',
            publishedAt: new Date(),
            updatedBy: userId,
            $inc: { version: 1 }
        }, { new: true, upsert: true, setDefaultsOnInsert: true });
        settings = updated ? updated.toObject() : null;
    }
    else {
        // When saving draft, update/create draft
        const updated = await HomepageSettings_1.HomepageSettings.findOneAndUpdate({ status: 'draft' }, {
            ...updateData,
            status: 'draft',
            updatedBy: userId
        }, { new: true, upsert: true, setDefaultsOnInsert: true });
        settings = updated ? updated.toObject() : null;
    }
    response_1.ResponseHandler.success(res, settings, `Homepage settings ${targetStatus === 'published' ? 'published' : 'saved as draft'} successfully`);
});
