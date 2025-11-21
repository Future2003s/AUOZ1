import { redisCache } from '../config/redis';
import { logger } from '../utils/logger';

/**
 * Test Redis connection and basic operations
 */
async function testRedisConnection() {
    try {
        logger.info('🧪 Testing Redis connection...');

        // Connect to Redis
        await redisCache.connect();
        logger.info('✅ Redis connection successful');

        // Test basic set/get operations
        const testKey = 'test:connection';
        const testValue = { message: 'Hello Redis!', timestamp: new Date().toISOString() };

        // Set a value
        const setResult = await redisCache.set(testKey, testValue, { ttl: 60 });
        logger.info(`📝 Set operation result: ${setResult}`);

        // Get the value
        const getValue = await redisCache.get(testKey);
        logger.info('📖 Get operation result:', getValue);

        // Test exists
        const exists = await redisCache.exists(testKey);
        logger.info(`🔍 Key exists: ${exists}`);

        // Test multiple operations
        const msetData = [
            { key: 'test:key1', value: 'value1', ttl: 60 },
            { key: 'test:key2', value: 'value2', ttl: 60 },
            { key: 'test:key3', value: 'value3', ttl: 60 }
        ];

        const msetResult = await redisCache.mset(msetData);
        logger.info(`📝 Multi-set operation result: ${msetResult}`);

        const mgetResult = await redisCache.mget(['test:key1', 'test:key2', 'test:key3']);
        logger.info('📖 Multi-get operation result:', mgetResult);

        // Test delete
        const delResult = await redisCache.del(testKey);
        logger.info(`🗑️ Delete operation result: ${delResult}`);

        // Verify deletion
        const getAfterDelete = await redisCache.get(testKey);
        logger.info(`📖 Get after delete: ${getAfterDelete}`);

        // Clean up test keys
        await redisCache.flush('test:*');
        logger.info('🧹 Cleaned up test keys');

        logger.info('✅ All Redis tests passed!');

    } catch (error) {
        logger.error('❌ Redis test failed:', error);
        process.exit(1);
    } finally {
        await redisCache.disconnect();
        logger.info('👋 Redis disconnected');
        process.exit(0);
    }
}

// Run the test
if (require.main === module) {
    testRedisConnection();
}

export { testRedisConnection };
