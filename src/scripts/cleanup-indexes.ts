import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { logger } from '../utils/logger';

/**
 * Clean up duplicate and conflicting indexes
 */
async function cleanupIndexes() {
    try {
        logger.info('🧹 Starting index cleanup...');

        // Connect to database
        await connectDatabase();

        const db = mongoose.connection.db;
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

        logger.info('✅ Index cleanup completed successfully!');

    } catch (error) {
        logger.error('❌ Index cleanup failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        logger.info('👋 Database disconnected');
        process.exit(0);
    }
}

async function cleanupProductIndexes(db: any) {
    try {
        const collection = db.collection('products');
        const indexes = await collection.listIndexes().toArray();
        
        logger.info('📋 Current product indexes:');
        indexes.forEach((index: any) => {
            logger.info(`  - ${index.name}: ${JSON.stringify(index.key)}`);
        });

        // Find and remove old text indexes
        const textIndexes = indexes.filter((index: any) => 
            index.key && index.key._fts === "text"
        );

        for (const textIndex of textIndexes) {
            if (textIndex.name !== "product_text_search") {
                logger.info(`🗑️ Dropping old product text index: ${textIndex.name}`);
                try {
                    await collection.dropIndex(textIndex.name);
                    logger.info(`✅ Dropped index: ${textIndex.name}`);
                } catch (error: any) {
                    if (error.code === 27) { // IndexNotFound
                        logger.warn(`⚠️ Index ${textIndex.name} not found, skipping...`);
                    } else {
                        logger.error(`❌ Error dropping index ${textIndex.name}:`, error.message);
                    }
                }
            }
        }

        // Remove duplicate slug indexes
        const slugIndexes = indexes.filter((index: any) => 
            index.key && index.key.slug === 1
        );

        if (slugIndexes.length > 1) {
            // Keep the first one, drop the rest
            for (let i = 1; i < slugIndexes.length; i++) {
                const indexName = slugIndexes[i].name;
                if (indexName !== '_id_') { // Never drop the _id_ index
                    logger.info(`🗑️ Dropping duplicate slug index: ${indexName}`);
                    try {
                        await collection.dropIndex(indexName);
                        logger.info(`✅ Dropped duplicate index: ${indexName}`);
                    } catch (error: any) {
                        logger.error(`❌ Error dropping duplicate index ${indexName}:`, error.message);
                    }
                }
            }
        }

        logger.info('✅ Product indexes cleaned up');
    } catch (error) {
        logger.error('❌ Error cleaning up product indexes:', error);
    }
}

async function cleanupUserIndexes(db: any) {
    try {
        const collection = db.collection('users');
        const indexes = await collection.listIndexes().toArray();
        
        logger.info('📋 Current user indexes:');
        indexes.forEach((index: any) => {
            logger.info(`  - ${index.name}: ${JSON.stringify(index.key)}`);
        });

        // Remove duplicate user indexes
        const userIndexes = indexes.filter((index: any) => 
            index.key && index.key.user === 1
        );

        if (userIndexes.length > 1) {
            for (let i = 1; i < userIndexes.length; i++) {
                const indexName = userIndexes[i].name;
                if (indexName !== '_id_') {
                    logger.info(`🗑️ Dropping duplicate user index: ${indexName}`);
                    try {
                        await collection.dropIndex(indexName);
                        logger.info(`✅ Dropped duplicate index: ${indexName}`);
                    } catch (error: any) {
                        logger.error(`❌ Error dropping duplicate index ${indexName}:`, error.message);
                    }
                }
            }
        }

        logger.info('✅ User indexes cleaned up');
    } catch (error) {
        logger.error('❌ Error cleaning up user indexes:', error);
    }
}

async function cleanupCategoryIndexes(db: any) {
    try {
        const collection = db.collection('categories');
        const indexes = await collection.listIndexes().toArray();
        
        logger.info('📋 Current category indexes:');
        indexes.forEach((index: any) => {
            logger.info(`  - ${index.name}: ${JSON.stringify(index.key)}`);
        });

        // Remove duplicate slug indexes
        const slugIndexes = indexes.filter((index: any) => 
            index.key && index.key.slug === 1
        );

        if (slugIndexes.length > 1) {
            for (let i = 1; i < slugIndexes.length; i++) {
                const indexName = slugIndexes[i].name;
                if (indexName !== '_id_') {
                    logger.info(`🗑️ Dropping duplicate category slug index: ${indexName}`);
                    try {
                        await collection.dropIndex(indexName);
                        logger.info(`✅ Dropped duplicate index: ${indexName}`);
                    } catch (error: any) {
                        logger.error(`❌ Error dropping duplicate index ${indexName}:`, error.message);
                    }
                }
            }
        }

        logger.info('✅ Category indexes cleaned up');
    } catch (error) {
        logger.error('❌ Error cleaning up category indexes:', error);
    }
}

async function cleanupBrandIndexes(db: any) {
    try {
        const collection = db.collection('brands');
        const indexes = await collection.listIndexes().toArray();
        
        logger.info('📋 Current brand indexes:');
        indexes.forEach((index: any) => {
            logger.info(`  - ${index.name}: ${JSON.stringify(index.key)}`);
        });

        // Remove duplicate slug indexes
        const slugIndexes = indexes.filter((index: any) => 
            index.key && index.key.slug === 1
        );

        if (slugIndexes.length > 1) {
            for (let i = 1; i < slugIndexes.length; i++) {
                const indexName = slugIndexes[i].name;
                if (indexName !== '_id_') {
                    logger.info(`🗑️ Dropping duplicate brand slug index: ${indexName}`);
                    try {
                        await collection.dropIndex(indexName);
                        logger.info(`✅ Dropped duplicate index: ${indexName}`);
                    } catch (error: any) {
                        logger.error(`❌ Error dropping duplicate index ${indexName}:`, error.message);
                    }
                }
            }
        }

        logger.info('✅ Brand indexes cleaned up');
    } catch (error) {
        logger.error('❌ Error cleaning up brand indexes:', error);
    }
}

// Run the cleanup
if (require.main === module) {
    cleanupIndexes();
}

export { cleanupIndexes };
