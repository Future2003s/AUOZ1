import request from 'supertest';
import { app } from '../../src/app';
import { User } from '../../src/models/User';
import { getCacheStats, clearAllCache } from '../../src/utils/performance';

describe('Performance Tests', () => {
  beforeEach(async () => {
    // Clear cache before each test for consistent results
    clearAllCache();
  });

  describe('Response Time Benchmarks', () => {
    it('should register user within acceptable time limit', async () => {
      const userData = {
        firstName: 'Performance',
        lastName: 'Test',
        email: global.testUtils.generateRandomEmail(),
        password: 'PerformanceTest123!'
      };

      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(1000); // Should complete within 1 second
      expect(response.body.success).toBe(true);
    });

    it('should login within acceptable time limit', async () => {
      // First register a user
      const userData = {
        firstName: 'Performance',
        lastName: 'Test',
        email: global.testUtils.generateRandomEmail(),
        password: 'PerformanceTest123!'
      };

      await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(500); // Should complete within 500ms
      expect(response.body.success).toBe(true);
    });

    it('should refresh token within acceptable time limit', async () => {
      // Register and get tokens
      const userData = {
        firstName: 'Performance',
        lastName: 'Test',
        email: global.testUtils.generateRandomEmail(),
        password: 'PerformanceTest123!'
      };

      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: registerResponse.body.data.refreshToken })
        .expect(200);

      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(300); // Should complete within 300ms
      expect(response.body.success).toBe(true);
    });

    it('should get current user within acceptable time limit', async () => {
      // Register and get token
      const userData = {
        firstName: 'Performance',
        lastName: 'Test',
        email: global.testUtils.generateRandomEmail(),
        password: 'PerformanceTest123!'
      };

      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${registerResponse.body.data.token}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(200); // Should complete within 200ms
      expect(response.body.success).toBe(true);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle multiple concurrent registrations', async () => {
      const concurrentRequests = 10;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        const userData = {
          firstName: 'Concurrent',
          lastName: `Test${i}`,
          email: `concurrent${i}@example.com`,
          password: 'ConcurrentTest123!'
        };

        promises.push(
          request(app)
            .post('/api/v1/auth/register')
            .send(userData)
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Average response time should be reasonable
      const averageTime = totalTime / concurrentRequests;
      expect(averageTime).toBeLessThan(2000); // Average under 2 seconds
    });

    it('should handle multiple concurrent logins', async () => {
      // First create test users
      const users = [];
      for (let i = 0; i < 5; i++) {
        const userData = {
          firstName: 'Login',
          lastName: `Test${i}`,
          email: `login${i}@example.com`,
          password: 'LoginTest123!'
        };

        await request(app)
          .post('/api/v1/auth/register')
          .send(userData);

        users.push(userData);
      }

      // Now test concurrent logins
      const promises = users.map(user =>
        request(app)
          .post('/api/v1/auth/login')
          .send({
            email: user.email,
            password: user.password
          })
      );

      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Total time should be reasonable
      expect(totalTime).toBeLessThan(3000); // Under 3 seconds for 5 concurrent logins
    });
  });

  describe('Cache Performance', () => {
    it('should improve performance with caching', async () => {
      // Register a user
      const userData = {
        firstName: 'Cache',
        lastName: 'Test',
        email: global.testUtils.generateRandomEmail(),
        password: 'CacheTest123!'
      };

      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      const token = registerResponse.body.data.token;

      // First request (cache miss)
      const startTime1 = Date.now();
      await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const firstRequestTime = Date.now() - startTime1;

      // Second request (should hit cache)
      const startTime2 = Date.now();
      await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const secondRequestTime = Date.now() - startTime2;

      // Second request should be faster due to caching
      expect(secondRequestTime).toBeLessThanOrEqual(firstRequestTime);
      
      // Check cache statistics
      const cacheStats = getCacheStats();
      expect(cacheStats.cache.keys).toBeGreaterThan(0);
    });

    it('should maintain cache hit rate above threshold', async () => {
      // Create multiple users and make repeated requests
      const users = [];
      
      for (let i = 0; i < 3; i++) {
        const userData = {
          firstName: 'Cache',
          lastName: `Test${i}`,
          email: `cache${i}@example.com`,
          password: 'CacheTest123!'
        };

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(userData);

        users.push(response.body.data);
      }

      // Make multiple requests for each user
      for (const user of users) {
        for (let j = 0; j < 3; j++) {
          await request(app)
            .get('/api/v1/auth/me')
            .set('Authorization', `Bearer ${user.token}`);
        }
      }

      const cacheStats = getCacheStats();
      const hitRate = cacheStats.cache.hitRate;
      
      // Cache hit rate should be above 50%
      expect(hitRate).toBeGreaterThan(50);
    });
  });

  describe('Memory Usage', () => {
    it('should not have memory leaks during multiple operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform many operations
      for (let i = 0; i < 20; i++) {
        const userData = {
          firstName: 'Memory',
          lastName: `Test${i}`,
          email: `memory${i}@example.com`,
          password: 'MemoryTest123!'
        };

        const registerResponse = await request(app)
          .post('/api/v1/auth/register')
          .send(userData);

        await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: userData.email,
            password: userData.password
          });

        await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${registerResponse.body.data.token}`);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseInMB = memoryIncrease / (1024 * 1024);

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncreaseInMB).toBeLessThan(50);
    });
  });

  describe('Database Query Performance', () => {
    it('should use efficient queries for user lookup', async () => {
      // Create multiple users
      const users = [];
      for (let i = 0; i < 10; i++) {
        const userData = {
          firstName: 'Query',
          lastName: `Test${i}`,
          email: `query${i}@example.com`,
          password: 'QueryTest123!'
        };

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(userData);

        users.push(response.body.data);
      }

      // Test login performance (should use email index)
      const startTime = Date.now();
      
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: users[5].user.email,
          password: 'QueryTest123!'
        });

      const queryTime = Date.now() - startTime;
      
      // Query should be fast due to email index
      expect(queryTime).toBeLessThan(100); // Under 100ms
    });

    it('should handle bulk operations efficiently', async () => {
      const startTime = Date.now();

      // Create multiple users in sequence
      const promises = [];
      for (let i = 0; i < 5; i++) {
        const userData = {
          firstName: 'Bulk',
          lastName: `Test${i}`,
          email: `bulk${i}@example.com`,
          password: 'BulkTest123!'
        };

        promises.push(
          request(app)
            .post('/api/v1/auth/register')
            .send(userData)
        );
      }

      await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      // Bulk operations should complete in reasonable time
      expect(totalTime).toBeLessThan(5000); // Under 5 seconds for 5 users
    });
  });

  describe('Rate Limiting Performance', () => {
    it('should handle rate limiting efficiently', async () => {
      const userData = {
        firstName: 'Rate',
        lastName: 'Test',
        email: global.testUtils.generateRandomEmail(),
        password: 'RateTest123!'
      };

      await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      // Make requests until rate limited
      let rateLimitedTime = 0;
      for (let i = 0; i < 10; i++) {
        const startTime = Date.now();
        
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: userData.email,
            password: 'WrongPassword123!'
          });

        const requestTime = Date.now() - startTime;

        if (response.status === 429) {
          rateLimitedTime = requestTime;
          break;
        }
      }

      // Rate limiting should not add significant overhead
      if (rateLimitedTime > 0) {
        expect(rateLimitedTime).toBeLessThan(100); // Under 100ms
      }
    });
  });
});
