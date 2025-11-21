"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testRedisConnection = testRedisConnection;
const redis_1 = require("../config/redis");
const logger_1 = require("../utils/logger");
/**
 * Test Redis connection and basic operations
 */
async function testRedisConnection() {
    try {
        logger_1.logger.info('🧪 Testing Redis connection...');
        // Connect to Redis
        await redis_1.redisCache.connect();
        logger_1.logger.info('✅ Redis connection successful');
        // Test basic set/get operations
        const testKey = 'test:connection';
        const testValue = { message: 'Hello Redis!', timestamp: new Date().toISOString() };
        // Set a value
        const setResult = await redis_1.redisCache.set(testKey, testValue, { ttl: 60 });
        logger_1.logger.info(`📝 Set operation result: ${setResult}`);
        // Get the value
        const getValue = await redis_1.redisCache.get(testKey);
        logger_1.logger.info('📖 Get operation result:', getValue);
        // Test exists
        const exists = await redis_1.redisCache.exists(testKey);
        logger_1.logger.info(`🔍 Key exists: ${exists}`);
        // Test multiple operations
        const msetData = [
            { key: 'test:key1', value: 'value1', ttl: 60 },
            { key: 'test:key2', value: 'value2', ttl: 60 },
            { key: 'test:key3', value: 'value3', ttl: 60 }
        ];
        const msetResult = await redis_1.redisCache.mset(msetData);
        logger_1.logger.info(`📝 Multi-set operation result: ${msetResult}`);
        const mgetResult = await redis_1.redisCache.mget(['test:key1', 'test:key2', 'test:key3']);
        logger_1.logger.info('📖 Multi-get operation result:', mgetResult);
        // Test delete
        const delResult = await redis_1.redisCache.del(testKey);
        logger_1.logger.info(`🗑️ Delete operation result: ${delResult}`);
        // Verify deletion
        const getAfterDelete = await redis_1.redisCache.get(testKey);
        logger_1.logger.info(`📖 Get after delete: ${getAfterDelete}`);
        // Clean up test keys
        await redis_1.redisCache.flush('test:*');
        logger_1.logger.info('🧹 Cleaned up test keys');
        logger_1.logger.info('✅ All Redis tests passed!');
    }
    catch (error) {
        logger_1.logger.error('❌ Redis test failed:', error);
        process.exit(1);
    }
    finally {
        await redis_1.redisCache.disconnect();
        logger_1.logger.info('👋 Redis disconnected');
        process.exit(0);
    }
}
// Run the test
if (require.main === module) {
    testRedisConnection();
}
