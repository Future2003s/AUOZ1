"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupIndexes = cleanupIndexes;
const mongoose_1 = __importDefault(require("mongoose"));
const database_1 = require("../config/database");
const logger_1 = require("../utils/logger");
/**
 * Clean up duplicate and conflicting indexes
 */
async function cleanupIndexes() {
    try {
        logger_1.logger.info('🧹 Starting index cleanup...');
        // Connect to database
        await (0, database_1.connectDatabase)();
        const db = mongoose_1.default.connection.db;
        if (!db) {
            throw new Error('Database connection not available');
        }
        // Clean up Product indexes
        await cleanupProductIndexes(db);
        // Clean up User indexes
        await cleanupUserIndexes(db);
        // Clean up Category indexes
        await cleanupCategoryIndexes(db);
        // Clean up Brand indexes
        await cleanupBrandIndexes(db);
        logger_1.logger.info('✅ Index cleanup completed successfully!');
    }
    catch (error) {
        logger_1.logger.error('❌ Index cleanup failed:', error);
        process.exit(1);
    }
    finally {
        await mongoose_1.default.disconnect();
        logger_1.logger.info('👋 Database disconnected');
        process.exit(0);
    }
}
async function cleanupProductIndexes(db) {
    try {
        const collection = db.collection('products');
        const indexes = await collection.listIndexes().toArray();
        logger_1.logger.info('📋 Current product indexes:');
        indexes.forEach((index) => {
            logger_1.logger.info(`  - ${index.name}: ${JSON.stringify(index.key)}`);
        });
        // Find and remove old text indexes
        const textIndexes = indexes.filter((index) => index.key && index.key._fts === "text");
        for (const textIndex of textIndexes) {
            if (textIndex.name !== "product_text_search") {
                logger_1.logger.info(`🗑️ Dropping old product text index: ${textIndex.name}`);
                try {
                    await collection.dropIndex(textIndex.name);
                    logger_1.logger.info(`✅ Dropped index: ${textIndex.name}`);
                }
                catch (error) {
                    if (error.code === 27) { // IndexNotFound
                        logger_1.logger.warn(`⚠️ Index ${textIndex.name} not found, skipping...`);
                    }
                    else {
                        logger_1.logger.error(`❌ Error dropping index ${textIndex.name}:`, error.message);
                    }
                }
            }
        }
        // Remove duplicate slug indexes
        const slugIndexes = indexes.filter((index) => index.key && index.key.slug === 1);
        if (slugIndexes.length > 1) {
            // Keep the first one, drop the rest
            for (let i = 1; i < slugIndexes.length; i++) {
                const indexName = slugIndexes[i].name;
                if (indexName !== '_id_') { // Never drop the _id_ index
                    logger_1.logger.info(`🗑️ Dropping duplicate slug index: ${indexName}`);
                    try {
                        await collection.dropIndex(indexName);
                        logger_1.logger.info(`✅ Dropped duplicate index: ${indexName}`);
                    }
                    catch (error) {
                        logger_1.logger.error(`❌ Error dropping duplicate index ${indexName}:`, error.message);
                    }
                }
            }
        }
        logger_1.logger.info('✅ Product indexes cleaned up');
    }
    catch (error) {
        logger_1.logger.error('❌ Error cleaning up product indexes:', error);
    }
}
async function cleanupUserIndexes(db) {
    try {
        const collection = db.collection('users');
        const indexes = await collection.listIndexes().toArray();
        logger_1.logger.info('📋 Current user indexes:');
        indexes.forEach((index) => {
            logger_1.logger.info(`  - ${index.name}: ${JSON.stringify(index.key)}`);
        });
        // Remove duplicate user indexes
        const userIndexes = indexes.filter((index) => index.key && index.key.user === 1);
        if (userIndexes.length > 1) {
            for (let i = 1; i < userIndexes.length; i++) {
                const indexName = userIndexes[i].name;
                if (indexName !== '_id_') {
                    logger_1.logger.info(`🗑️ Dropping duplicate user index: ${indexName}`);
                    try {
                        await collection.dropIndex(indexName);
                        logger_1.logger.info(`✅ Dropped duplicate index: ${indexName}`);
                    }
                    catch (error) {
                        logger_1.logger.error(`❌ Error dropping duplicate index ${indexName}:`, error.message);
                    }
                }
            }
        }
        logger_1.logger.info('✅ User indexes cleaned up');
    }
    catch (error) {
        logger_1.logger.error('❌ Error cleaning up user indexes:', error);
    }
}
async function cleanupCategoryIndexes(db) {
    try {
        const collection = db.collection('categories');
        const indexes = await collection.listIndexes().toArray();
        logger_1.logger.info('📋 Current category indexes:');
        indexes.forEach((index) => {
            logger_1.logger.info(`  - ${index.name}: ${JSON.stringify(index.key)}`);
        });
        // Remove duplicate slug indexes
        const slugIndexes = indexes.filter((index) => index.key && index.key.slug === 1);
        if (slugIndexes.length > 1) {
            for (let i = 1; i < slugIndexes.length; i++) {
                const indexName = slugIndexes[i].name;
                if (indexName !== '_id_') {
                    logger_1.logger.info(`🗑️ Dropping duplicate category slug index: ${indexName}`);
                    try {
                        await collection.dropIndex(indexName);
                        logger_1.logger.info(`✅ Dropped duplicate index: ${indexName}`);
                    }
                    catch (error) {
                        logger_1.logger.error(`❌ Error dropping duplicate index ${indexName}:`, error.message);
                    }
                }
            }
        }
        logger_1.logger.info('✅ Category indexes cleaned up');
    }
    catch (error) {
        logger_1.logger.error('❌ Error cleaning up category indexes:', error);
    }
}
async function cleanupBrandIndexes(db) {
    try {
        const collection = db.collection('brands');
        const indexes = await collection.listIndexes().toArray();
        logger_1.logger.info('📋 Current brand indexes:');
        indexes.forEach((index) => {
            logger_1.logger.info(`  - ${index.name}: ${JSON.stringify(index.key)}`);
        });
        // Remove duplicate slug indexes
        const slugIndexes = indexes.filter((index) => index.key && index.key.slug === 1);
        if (slugIndexes.length > 1) {
            for (let i = 1; i < slugIndexes.length; i++) {
                const indexName = slugIndexes[i].name;
                if (indexName !== '_id_') {
                    logger_1.logger.info(`🗑️ Dropping duplicate brand slug index: ${indexName}`);
                    try {
                        await collection.dropIndex(indexName);
                        logger_1.logger.info(`✅ Dropped duplicate index: ${indexName}`);
                    }
                    catch (error) {
                        logger_1.logger.error(`❌ Error dropping duplicate index ${indexName}:`, error.message);
                    }
                }
            }
        }
        logger_1.logger.info('✅ Brand indexes cleaned up');
    }
    catch (error) {
        logger_1.logger.error('❌ Error cleaning up brand indexes:', error);
    }
}
// Run the cleanup
if (require.main === module) {
    cleanupIndexes();
}
