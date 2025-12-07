import mongoose from "mongoose";
import dotenv from "dotenv";
import { connectDatabase } from "../config/database";
import { News } from "../models/News";
import { logger } from "../utils/logger";

// Load environment variables
dotenv.config();

const slugifyTitle = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const sampleNews = [
  {
    title: "Chào mừng đến với AUOZ - Nền tảng thương mại điện tử hàng đầu",
    excerpt: "Khám phá những tính năng mới và cải tiến trong hệ thống quản trị AUOZ, giúp bạn quản lý cửa hàng trực tuyến một cách hiệu quả và chuyên nghiệp.",
    content: `
      <h1>Chào mừng đến với AUOZ</h1>
      <p>AUOZ là nền tảng thương mại điện tử hiện đại, được thiết kế để giúp các doanh nghiệp dễ dàng quản lý và phát triển cửa hàng trực tuyến của mình.</p>
      
      <h2>Tính năng nổi bật</h2>
      <ul>
        <li><strong>Quản lý sản phẩm:</strong> Thêm, sửa, xóa sản phẩm một cách dễ dàng với giao diện trực quan</li>
        <li><strong>Quản lý đơn hàng:</strong> Theo dõi và xử lý đơn hàng hiệu quả với hệ thống thông báo tự động</li>
        <li><strong>Hệ thống đa ngôn ngữ:</strong> Hỗ trợ 14 ngôn ngữ khác nhau để mở rộng thị trường quốc tế</li>
        <li><strong>Quản lý nội dung:</strong> Tạo và quản lý bài viết tin tức, blog với trình soạn thảo hiện đại</li>
      </ul>
      
      <h2>Bắt đầu ngay hôm nay</h2>
      <p>Đăng ký tài khoản ngay để trải nghiệm những tính năng tuyệt vời của AUOZ. Chúng tôi cam kết mang đến cho bạn trải nghiệm tốt nhất.</p>
    `,
    category: "Giới thiệu",
    tags: ["AUOZ", "Thương mại điện tử", "Giới thiệu"],
    locale: "vi",
    status: "published" as const,
    isFeatured: true,
    publishedAt: new Date(),
    views: 0,
  },
  {
    title: "Hướng dẫn sử dụng hệ thống quản trị AUOZ",
    excerpt: "Bài viết hướng dẫn chi tiết cách sử dụng các tính năng trong hệ thống quản trị AUOZ, từ quản lý sản phẩm đến xử lý đơn hàng.",
    content: `
      <h1>Hướng dẫn sử dụng hệ thống quản trị AUOZ</h1>
      <p>Hệ thống quản trị AUOZ được thiết kế với giao diện thân thiện và dễ sử dụng. Dưới đây là hướng dẫn chi tiết để bạn có thể tận dụng tối đa các tính năng.</p>
      
      <h2>1. Quản lý sản phẩm</h2>
      <p>Để thêm sản phẩm mới, bạn chỉ cần:</p>
      <ol>
        <li>Đăng nhập vào hệ thống quản trị</li>
        <li>Chọn mục "Sản phẩm" từ menu bên trái</li>
        <li>Nhấn nút "Thêm sản phẩm mới"</li>
        <li>Điền đầy đủ thông tin và tải lên hình ảnh</li>
        <li>Nhấn "Lưu" để hoàn tất</li>
      </ol>
      
      <h2>2. Quản lý đơn hàng</h2>
      <p>Hệ thống tự động cập nhật trạng thái đơn hàng và gửi thông báo cho khách hàng. Bạn có thể:</p>
      <ul>
        <li>Xem danh sách tất cả đơn hàng</li>
        <li>Lọc theo trạng thái (Chờ xử lý, Đang giao, Hoàn thành, Hủy)</li>
        <li>Cập nhật trạng thái đơn hàng</li>
        <li>In hóa đơn và phiếu giao hàng</li>
      </ul>
      
      <h2>3. Quản lý nội dung</h2>
      <p>Với trình soạn thảo hiện đại, bạn có thể tạo các bài viết tin tức, blog một cách dễ dàng với đầy đủ tính năng định dạng văn bản, chèn hình ảnh, và nhiều hơn nữa.</p>
    `,
    category: "Hướng dẫn",
    tags: ["Hướng dẫn", "Tutorial", "Quản trị"],
    locale: "vi",
    status: "published" as const,
    isFeatured: false,
    publishedAt: new Date(),
    views: 0,
  },
  {
    title: "Welcome to AUOZ - Leading E-commerce Platform",
    excerpt: "Discover new features and improvements in the AUOZ admin system, helping you manage your online store efficiently and professionally.",
    content: `
      <h1>Welcome to AUOZ</h1>
      <p>AUOZ is a modern e-commerce platform designed to help businesses easily manage and grow their online stores.</p>
      
      <h2>Key Features</h2>
      <ul>
        <li><strong>Product Management:</strong> Easily add, edit, and delete products with an intuitive interface</li>
        <li><strong>Order Management:</strong> Track and process orders efficiently with automatic notifications</li>
        <li><strong>Multi-language System:</strong> Support for 14 different languages to expand international markets</li>
        <li><strong>Content Management:</strong> Create and manage news articles and blogs with a modern editor</li>
      </ul>
      
      <h2>Get Started Today</h2>
      <p>Sign up now to experience the amazing features of AUOZ. We are committed to providing you with the best experience.</p>
    `,
    category: "Introduction",
    tags: ["AUOZ", "E-commerce", "Introduction"],
    locale: "en",
    status: "published" as const,
    isFeatured: true,
    publishedAt: new Date(),
    views: 0,
  },
  {
    title: "AUOZ管理システムの使い方ガイド",
    excerpt: "AUOZ管理システムの機能の使い方の詳細なガイド。商品管理から注文処理まで。",
    content: `
      <h1>AUOZ管理システムの使い方ガイド</h1>
      <p>AUOZ管理システムは、使いやすいインターフェースで設計されています。以下は、機能を最大限に活用するための詳細なガイドです。</p>
      
      <h2>1. 商品管理</h2>
      <p>新しい商品を追加するには：</p>
      <ol>
        <li>管理システムにログイン</li>
        <li>左側のメニューから「商品」を選択</li>
        <li>「新しい商品を追加」ボタンをクリック</li>
        <li>情報を入力し、画像をアップロード</li>
        <li>「保存」をクリックして完了</li>
      </ol>
      
      <h2>2. 注文管理</h2>
      <p>システムは自動的に注文ステータスを更新し、顧客に通知を送信します。以下のことができます：</p>
      <ul>
        <li>すべての注文のリストを表示</li>
        <li>ステータスでフィルタリング（処理待ち、配送中、完了、キャンセル）</li>
        <li>注文ステータスを更新</li>
        <li>請求書と配送票を印刷</li>
      </ul>
    `,
    category: "ガイド",
    tags: ["ガイド", "チュートリアル", "管理"],
    locale: "ja",
    status: "published" as const,
    isFeatured: false,
    publishedAt: new Date(),
    views: 0,
  },
];

async function seedNews() {
  try {
    logger.info("🌱 Starting news seeding...");
    
    // Connect to MongoDB
    await connectDatabase();

    // Check existing news
    const existingCount = await News.countDocuments();
    if (existingCount > 0) {
      logger.info(`Found ${existingCount} existing news articles. Will add new ones without duplicates.`);
    }

    // Generate slugs and insert news
    const newsToInsert = sampleNews.map((article) => {
      const baseSlug = slugifyTitle(article.title);
      return {
        ...article,
        slug: baseSlug,
      };
    });

    // Check for duplicate slugs and add counter if needed
    for (let i = 0; i < newsToInsert.length; i++) {
      let slug = newsToInsert[i].slug;
      let counter = 1;
      while (await News.exists({ slug })) {
        slug = `${newsToInsert[i].slug}-${counter++}`;
      }
      newsToInsert[i].slug = slug;
    }

    // Insert news articles (skip duplicates)
    let inserted = 0;
    let skipped = 0;
    
    for (const article of newsToInsert) {
      const existing = await News.findOne({ slug: article.slug });
      if (existing) {
        logger.info(`⏭️  Skipping duplicate: ${article.slug}`);
        skipped++;
        continue;
      }
      
      await News.create(article);
      inserted++;
      logger.info(`✨ Created: [${article.locale.toUpperCase()}] ${article.title}`);
    }

    logger.info(`\n✅ News seeding completed!`);
    logger.info(`📊 Results: ${inserted} created, ${skipped} skipped`);
  } catch (error) {
    logger.error("❌ Error seeding news:", error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    logger.info("👋 Database disconnected");
    process.exit(0);
  }
}

// Run the seed function
seedNews();

