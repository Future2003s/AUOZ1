require("dotenv").config();
const mongoose = require("mongoose");
const { redisCache } = require("./src/config/redis");

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

const clearFeaturedCache = async () => {
  try {
    await connectDB();
    await redisCache.connect();

    console.log("\n🧹 Clearing Featured Products Cache...\n");

    // Clear all featured product caches using flush with pattern
    try {
      const result = await redisCache.flush("products:featured:*");
      if (result) {
        console.log("✅ Cache cleared using pattern: products:featured:*");
      } else {
        console.log("ℹ️  Pattern clear returned false (may be no matches)");
      }
    } catch (error) {
      console.log("ℹ️  Pattern clear error (may be expected):", error.message);
    }
    
    // Also try to get all keys and delete manually
    try {
      const client = redisCache.getClient();
      const allKeys = await client.keys("*products*featured*");
      if (allKeys.length > 0) {
        await client.del(allKeys);
        console.log(`✅ Manually cleared ${allKeys.length} cache keys`);
      }
    } catch (error) {
      console.log("ℹ️  Manual key deletion error:", error.message);
    }

    console.log("\n✅ Cache clearing completed!\n");

    // Check products again
    const productSchema = new mongoose.Schema({}, { strict: false, collection: "products" });
    const Product = mongoose.model("Product", productSchema);

    const featuredProducts = await Product.find({ isFeatured: true }).lean();
    const validProducts = await Product.find({
      isFeatured: true,
      status: "active",
      isVisible: true,
    }).lean();

    console.log("📊 After cache clear:");
    console.log(`   - Products with isFeatured=true: ${featuredProducts.length}`);
    console.log(`   - Products meeting all criteria: ${validProducts.length}`);

    if (validProducts.length > 0) {
      console.log("\n✅ Valid featured products:");
      validProducts.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.name} (${p.status}, visible: ${p.isVisible}, featured: ${p.isFeatured})`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error clearing cache:", error);
    process.exit(1);
  }
};

clearFeaturedCache();

