"use strict";
/**
 * Script to archive/hide honey products (Mật Ong)
 * Run: npx ts-node src/scripts/archive-honey-products.ts
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.archiveHoneyProducts = archiveHoneyProducts;
const database_1 = require("../config/database");
const Product_1 = require("../models/Product");
const logger_1 = require("../utils/logger");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function archiveHoneyProducts() {
    try {
        // Connect to MongoDB
        await (0, database_1.connectDatabase)();
        logger_1.logger.info("✅ Connected to MongoDB");
        // Find all products with "mật ong" or "honey" in name
        const honeyProducts = await Product_1.Product.find({
            $or: [
                { name: { $regex: /mật ong|mat ong/i } },
                { name: { $regex: /honey/i } },
                { tags: { $in: [/mật ong|mat ong|honey/i] } },
                { description: { $regex: /mật ong|mat ong|honey/i } }
            ]
        });
        logger_1.logger.info(`📦 Found ${honeyProducts.length} honey product(s)`);
        if (honeyProducts.length === 0) {
            logger_1.logger.info("✅ No honey products found. Nothing to archive.");
            return;
        }
        // Archive all honey products
        let archivedCount = 0;
        for (const product of honeyProducts) {
            await Product_1.Product.findByIdAndUpdate(product._id, {
                status: "archived",
                isVisible: false,
                isFeatured: false
            });
            logger_1.logger.info(`   ✅ Archived: ${product.name} (${product.slug || product._id})`);
            archivedCount++;
        }
        logger_1.logger.info(`🎉 Successfully archived ${archivedCount} honey product(s)!`);
        logger_1.logger.info("   These products are now hidden from public API.");
    }
    catch (error) {
        logger_1.logger.error("❌ Error archiving honey products:", error);
        throw error;
    }
    finally {
        process.exit(0);
    }
}
// Run if called directly
if (require.main === module) {
    archiveHoneyProducts()
        .then(() => {
        logger_1.logger.info("✅ Script completed successfully");
    })
        .catch((error) => {
        logger_1.logger.error(error);
        process.exit(1);
    });
}
