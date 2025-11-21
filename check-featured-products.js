require("dotenv").config();
const mongoose = require("mongoose");

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/shopdev", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
};

// Product Schema (simplified)
const productSchema = new mongoose.Schema({}, { strict: false, collection: "products" });
const Product = mongoose.model("Product", productSchema);

// Also try with lowercase
const ProductLower = mongoose.model("product", productSchema);

const checkFeaturedProducts = async () => {
  try {
    await connectDB();

    console.log("\n🔍 Checking Featured Products...\n");

    // Check all products with isFeatured: true
    const featuredProducts = await Product.find({ isFeatured: true }).lean();
    console.log(`📊 Total products with isFeatured: true: ${featuredProducts.length}`);

    if (featuredProducts.length > 0) {
      console.log("\n📋 Featured Products Details:");
      featuredProducts.forEach((product, index) => {
        console.log(`\n${index + 1}. ${product.name || "Unnamed Product"}`);
        console.log(`   - ID: ${product._id}`);
        console.log(`   - Status: ${product.status || "undefined"}`);
        console.log(`   - isVisible: ${product.isVisible !== undefined ? product.isVisible : "undefined"}`);
        console.log(`   - isFeatured: ${product.isFeatured}`);
        console.log(`   - Price: ${product.price || "N/A"}`);
      });
    }

    // Check products that meet all criteria
    const validFeaturedProducts = await Product.find({
      isFeatured: true,
      status: "active",
      isVisible: true,
    }).lean();

    console.log(`\n✅ Products meeting all criteria (isFeatured: true, status: "active", isVisible: true): ${validFeaturedProducts.length}`);

    if (validFeaturedProducts.length === 0 && featuredProducts.length > 0) {
      console.log("\n⚠️  WARNING: Some products are marked as featured but don't meet all criteria:");
      featuredProducts.forEach((product) => {
        const issues = [];
        if (product.status !== "active") {
          issues.push(`status is "${product.status}" (should be "active")`);
        }
        if (product.isVisible !== true) {
          issues.push(`isVisible is ${product.isVisible} (should be true)`);
        }
        if (issues.length > 0) {
          console.log(`   - ${product.name || product._id}: ${issues.join(", ")}`);
        }
      });
    }

    // Check total products
    const totalProducts = await Product.countDocuments({});
    const totalProductsLower = await ProductLower.countDocuments({});
    console.log(`\n📦 Total products in database (Product model): ${totalProducts}`);
    console.log(`📦 Total products in database (product model): ${totalProductsLower}`);
    
    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`\n📚 Available collections: ${collections.map(c => c.name).join(", ") || "None"}`);

    // Check products by status
    const activeProducts = await Product.countDocuments({ status: "active" });
    const visibleProducts = await Product.countDocuments({ isVisible: true });
    console.log(`   - Active products: ${activeProducts}`);
    console.log(`   - Visible products: ${visibleProducts}`);

    console.log("\n✅ Check completed!\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error checking featured products:", error);
    process.exit(1);
  }
};

checkFeaturedProducts();

