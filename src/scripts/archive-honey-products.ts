/**
 * Script to archive/hide honey products (Mật Ong)
 * Run: npx ts-node src/scripts/archive-honey-products.ts
 */

import { connectDatabase } from "../config/database";
import { Product } from "../models/Product";
import { logger } from "../utils/logger";
import dotenv from "dotenv";

dotenv.config();

async function archiveHoneyProducts() {
    try {
        // Connect to MongoDB
        await connectDatabase();
        logger.info("✅ Connected to MongoDB");

        // Find all products with "mật ong" or "honey" in name
        const honeyProducts = await Product.find({
            $or: [
                { name: { $regex: /mật ong|mat ong/i } },
                { name: { $regex: /honey/i } },
                { tags: { $in: [/mật ong|mat ong|honey/i] } },
                { description: { $regex: /mật ong|mat ong|honey/i } }
            ]
        });

        logger.info(`📦 Found ${honeyProducts.length} honey product(s)`);

        if (honeyProducts.length === 0) {
            logger.info("✅ No honey products found. Nothing to archive.");
            return;
        }

        // Archive all honey products
        let archivedCount = 0;
        for (const product of honeyProducts) {
            await Product.findByIdAndUpdate(product._id, {
                status: "archived",
                isVisible: false,
                isFeatured: false
            });
            logger.info(`   ✅ Archived: ${product.name} (${product.slug || product._id})`);
            archivedCount++;
        }

        logger.info(`🎉 Successfully archived ${archivedCount} honey product(s)!`);
        logger.info("   These products are now hidden from public API.");

    } catch (error) {
        logger.error("❌ Error archiving honey products:", error);
        throw error;
    } finally {
        process.exit(0);
    }
}

// Run if called directly
if (require.main === module) {
    archiveHoneyProducts()
        .then(() => {
            logger.info("✅ Script completed successfully");
        })
        .catch((error) => {
            logger.error(error);
            process.exit(1);
        });
}

export { archiveHoneyProducts };
