import mongoose from "mongoose";
import { connectDatabase } from "../config/database";
import { Translation, TranslationCategories } from "../models/Translation";
import { User } from "../models/User";
import { logger } from "../utils/logger";

/**
 * Default translations for the application
 */
const defaultTranslations = [
    // UI Translations
    {
        key: "ui.welcome",
        category: TranslationCategories.UI,
        translations: {
            vi: "Chào mừng",
            en: "Welcome",
            ja: "ようこそ"
        },
        description: "Welcome message"
    },
    {
        key: "ui.login",
        category: TranslationCategories.UI,
        translations: {
            vi: "Đăng nhập",
            en: "Login",
            ja: "ログイン"
        },
        description: "Login button text"
    },
    {
        key: "ui.register",
        category: TranslationCategories.UI,
        translations: {
            vi: "Đăng ký",
            en: "Register",
            ja: "登録"
        },
        description: "Register button text"
    },
    {
        key: "ui.logout",
        category: TranslationCategories.UI,
        translations: {
            vi: "Đăng xuất",
            en: "Logout",
            ja: "ログアウト"
        },
        description: "Logout button text"
    },
    {
        key: "ui.search",
        category: TranslationCategories.UI,
        translations: {
            vi: "Tìm kiếm",
            en: "Search",
            ja: "検索"
        },
        description: "Search placeholder text"
    },
    {
        key: "ui.add_to_cart",
        category: TranslationCategories.UI,
        translations: {
            vi: "Thêm vào giỏ hàng",
            en: "Add to Cart",
            ja: "カートに追加"
        },
        description: "Add to cart button"
    },
    {
        key: "ui.checkout",
        category: TranslationCategories.UI,
        translations: {
            vi: "Thanh toán",
            en: "Checkout",
            ja: "チェックアウト"
        },
        description: "Checkout button"
    },

    // Error Messages
    {
        key: "error.invalid_credentials",
        category: TranslationCategories.ERROR,
        translations: {
            vi: "Thông tin đăng nhập không hợp lệ",
            en: "Invalid credentials",
            ja: "無効な認証情報"
        },
        description: "Invalid login credentials error"
    },
    {
        key: "error.user_not_found",
        category: TranslationCategories.ERROR,
        translations: {
            vi: "Không tìm thấy người dùng",
            en: "User not found",
            ja: "ユーザーが見つかりません"
        },
        description: "User not found error"
    },
    {
        key: "error.product_not_found",
        category: TranslationCategories.ERROR,
        translations: {
            vi: "Không tìm thấy sản phẩm",
            en: "Product not found",
            ja: "商品が見つかりません"
        },
        description: "Product not found error"
    },
    {
        key: "error.insufficient_stock",
        category: TranslationCategories.ERROR,
        translations: {
            vi: "Không đủ hàng trong kho",
            en: "Insufficient stock",
            ja: "在庫不足"
        },
        description: "Insufficient stock error"
    },

    // Success Messages
    {
        key: "success.login",
        category: TranslationCategories.SUCCESS,
        translations: {
            vi: "Đăng nhập thành công",
            en: "Login successful",
            ja: "ログイン成功"
        },
        description: "Successful login message"
    },
    {
        key: "success.register",
        category: TranslationCategories.SUCCESS,
        translations: {
            vi: "Đăng ký thành công",
            en: "Registration successful",
            ja: "登録成功"
        },
        description: "Successful registration message"
    },
    {
        key: "success.product_added",
        category: TranslationCategories.SUCCESS,
        translations: {
            vi: "Đã thêm sản phẩm vào giỏ hàng",
            en: "Product added to cart",
            ja: "商品をカートに追加しました"
        },
        description: "Product added to cart success message"
    },
    {
        key: "success.order_placed",
        category: TranslationCategories.SUCCESS,
        translations: {
            vi: "Đặt hàng thành công",
            en: "Order placed successfully",
            ja: "注文が正常に完了しました"
        },
        description: "Order placed success message"
    },

    // Validation Messages
    {
        key: "validation.required",
        category: TranslationCategories.VALIDATION,
        translations: {
            vi: "Trường này là bắt buộc",
            en: "This field is required",
            ja: "この項目は必須です"
        },
        description: "Required field validation message"
    },
    {
        key: "validation.email_invalid",
        category: TranslationCategories.VALIDATION,
        translations: {
            vi: "Email không hợp lệ",
            en: "Invalid email address",
            ja: "無効なメールアドレス"
        },
        description: "Invalid email validation message"
    },
    {
        key: "validation.password_min_length",
        category: TranslationCategories.VALIDATION,
        translations: {
            vi: "Mật khẩu phải có ít nhất 6 ký tự",
            en: "Password must be at least 6 characters",
            ja: "パスワードは6文字以上である必要があります"
        },
        description: "Password minimum length validation"
    },

    // Product Related
    {
        key: "product.price",
        category: TranslationCategories.PRODUCT,
        translations: {
            vi: "Giá",
            en: "Price",
            ja: "価格"
        },
        description: "Product price label"
    },
    {
        key: "product.description",
        category: TranslationCategories.PRODUCT,
        translations: {
            vi: "Mô tả",
            en: "Description",
            ja: "説明"
        },
        description: "Product description label"
    },
    {
        key: "product.category",
        category: TranslationCategories.PRODUCT,
        translations: {
            vi: "Danh mục",
            en: "Category",
            ja: "カテゴリー"
        },
        description: "Product category label"
    },
    {
        key: "product.brand",
        category: TranslationCategories.PRODUCT,
        translations: {
            vi: "Thương hiệu",
            en: "Brand",
            ja: "ブランド"
        },
        description: "Product brand label"
    },
    {
        key: "product.in_stock",
        category: TranslationCategories.PRODUCT,
        translations: {
            vi: "Còn hàng",
            en: "In Stock",
            ja: "在庫あり"
        },
        description: "Product in stock status"
    },
    {
        key: "product.out_of_stock",
        category: TranslationCategories.PRODUCT,
        translations: {
            vi: "Hết hàng",
            en: "Out of Stock",
            ja: "在庫切れ"
        },
        description: "Product out of stock status"
    },

    // Email Templates
    {
        key: "email.welcome_subject",
        category: TranslationCategories.EMAIL,
        translations: {
            vi: "Chào mừng bạn đến với ShopDev",
            en: "Welcome to ShopDev",
            ja: "ShopDevへようこそ"
        },
        description: "Welcome email subject"
    },
    {
        key: "email.order_confirmation_subject",
        category: TranslationCategories.EMAIL,
        translations: {
            vi: "Xác nhận đơn hàng",
            en: "Order Confirmation",
            ja: "注文確認"
        },
        description: "Order confirmation email subject"
    }
];

/**
 * Seed translations into database
 */
async function seedTranslations() {
    try {
        logger.info("🌱 Starting translation seeding...");

        // Connect to database
        await connectDatabase();

        // Find admin user to use as creator
        const adminUser = await User.findOne({ role: "admin" });
        if (!adminUser) {
            throw new Error("Admin user not found. Please create an admin user first.");
        }

        let created = 0;
        let updated = 0;
        let skipped = 0;

        for (const translationData of defaultTranslations) {
            const existingTranslation = await Translation.findOne({ key: translationData.key });

            if (existingTranslation) {
                // Update existing translation if needed
                let needsUpdate = false;

                for (const lang of ["vi", "en", "ja"] as const) {
                    if (existingTranslation.translations[lang] !== translationData.translations[lang]) {
                        existingTranslation.translations[lang] = translationData.translations[lang];
                        needsUpdate = true;
                    }
                }

                if (translationData.description && existingTranslation.description !== translationData.description) {
                    existingTranslation.description = translationData.description;
                    needsUpdate = true;
                }

                if (needsUpdate) {
                    existingTranslation.updatedBy = adminUser._id as any;
                    await existingTranslation.save();
                    updated++;
                    logger.info(`📝 Updated translation: ${translationData.key}`);
                } else {
                    skipped++;
                }
            } else {
                // Create new translation
                const newTranslation = new Translation({
                    ...translationData,
                    createdBy: adminUser._id,
                    updatedBy: adminUser._id
                });

                await newTranslation.save();
                created++;
                logger.info(`✨ Created translation: ${translationData.key}`);
            }
        }

        logger.info("✅ Translation seeding completed!");
        logger.info(`📊 Results: ${created} created, ${updated} updated, ${skipped} skipped`);
    } catch (error) {
        logger.error("❌ Translation seeding failed:", error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        logger.info("👋 Database disconnected");
        process.exit(0);
    }
}

// Run the seeder
if (require.main === module) {
    seedTranslations();
}

export { seedTranslations };
