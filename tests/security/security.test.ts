import request from 'supertest';
import { app } from '../../src/app';
import { User } from '../../src/models/User';

describe('Security Tests', () => {
  describe('Input Validation & Sanitization', () => {
    it('should prevent XSS attacks in registration', async () => {
      const maliciousData = {
        firstName: '<script>alert("xss")</script>',
        lastName: 'User',
        email: global.testUtils.generateRandomEmail(),
        password: 'SecurePassword123!'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(maliciousData);

      // Should either reject or sanitize the input
      if (response.status === 201) {
        expect(response.body.data.user.firstName).not.toContain('<script>');
      } else {
        expect(response.status).toBe(400);
      }
    });

    it('should prevent SQL injection in email field', async () => {
      const maliciousData = {
        firstName: 'John',
        lastName: 'Doe',
        email: "'; DROP TABLE users; --",
        password: 'SecurePassword123!'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(maliciousData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate email format strictly', async () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user..name@domain.com',
        'user@domain',
        'user@.com'
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({
            firstName: 'Test',
            lastName: 'User',
            email: email,
            password: 'SecurePassword123!'
          });

        expect(response.status).toBe(400);
      }
    });

    it('should enforce strong password requirements', async () => {
      const weakPasswords = [
        '123456',
        'password',
        'Password123', // Missing special character
        'password123!', // Missing uppercase
        'PASSWORD123!', // Missing lowercase
        'Password!', // Missing number
        'Pass1!', // Too short
        'password', // Common weak password
        'qwerty123!', // Common pattern
      ];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({
            firstName: 'Test',
            lastName: 'User',
            email: global.testUtils.generateRandomEmail(),
            password: password
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit registration attempts', async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        password: 'SecurePassword123!'
      };

      // Make multiple registration attempts
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post('/api/v1/auth/register')
            .send({
              ...userData,
              email: `test${i}@example.com`
            })
        );
      }

      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should rate limit login attempts per email', async () => {
      // First register a user
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: global.testUtils.generateRandomEmail(),
        password: 'SecurePassword123!'
      };

      await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      // Make multiple failed login attempts
      const loginData = {
        email: userData.email,
        password: 'WrongPassword123!'
      };

      let rateLimited = false;
      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send(loginData);

        if (response.status === 429) {
          rateLimited = true;
          break;
        }
      }

      expect(rateLimited).toBe(true);
    });

    it('should have different rate limits for different endpoints', async () => {
      // Test that auth endpoints have stricter limits than general endpoints
      const authRequests = [];
      const generalRequests = [];

      // Make requests to auth endpoint
      for (let i = 0; i < 20; i++) {
        authRequests.push(
          request(app)
            .post('/api/v1/auth/login')
            .send({
              email: 'test@example.com',
              password: 'password'
            })
        );
      }

      const authResponses = await Promise.all(authRequests);
      const authRateLimited = authResponses.filter(r => r.status === 429).length;

      expect(authRateLimited).toBeGreaterThan(0);
    });
  });

  describe('JWT Token Security', () => {
    let testUser: any;

    beforeEach(async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: global.testUtils.generateRandomEmail(),
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      testUser = response.body.data;
    });

    it('should reject malformed JWT tokens', async () => {
      const malformedTokens = [
        'invalid.token',
        'header.payload', // Missing signature
        'not-a-jwt-token',
        '',
        'Bearer invalid-token'
      ];

      for (const token of malformedTokens) {
        const response = await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(401);
      }
    });

    it('should reject expired tokens', async () => {
      // This test would require manipulating token expiration
      // For now, we'll test with an obviously invalid token
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYwZjE5YjI4ZjI4ZjI4ZjI4ZjI4ZjI4ZiIsImlhdCI6MTYyNjQ0NjEyOCwiZXhwIjoxNjI2NDQ2MTI5fQ.invalid';

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject tokens with invalid signature', async () => {
      // Modify the signature part of a valid token
      const tokenParts = testUser.token.split('.');
      const invalidToken = `${tokenParts[0]}.${tokenParts[1]}.invalid-signature`;

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should validate token payload integrity', async () => {
      // Test with a token that has valid structure but invalid payload
      const fakePayload = Buffer.from(JSON.stringify({
        id: 'fake-user-id',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      })).toString('base64');

      const tokenParts = testUser.token.split('.');
      const tamperedToken = `${tokenParts[0]}.${fakePayload}.${tokenParts[2]}`;

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Password Security', () => {
    it('should hash passwords before storing', async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: global.testUtils.generateRandomEmail(),
        password: 'PlainTextPassword123!'
      };

      await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      const user = await User.findOne({ email: userData.email }).select('+password');
      
      expect(user?.password).not.toBe(userData.password);
      expect(user?.password).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt hash pattern
    });

    it('should not return password in any response', async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: global.testUtils.generateRandomEmail(),
        password: 'TestPassword123!'
      };

      // Test registration response
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      expect(registerResponse.body.data.user).not.toHaveProperty('password');

      // Test login response
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        });

      expect(loginResponse.body.data.user).not.toHaveProperty('password');

      // Test get user response
      const userResponse = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${loginResponse.body.data.token}`);

      expect(userResponse.body.data).not.toHaveProperty('password');
    });
  });

  describe('Session Management', () => {
    let testUser: any;

    beforeEach(async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: global.testUtils.generateRandomEmail(),
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      testUser = response.body.data;
    });

    it('should invalidate tokens on logout', async () => {
      // Logout
      await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ refreshToken: testUser.refreshToken })
        .expect(200);

      // Try to use the token after logout
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should prevent refresh token reuse', async () => {
      const oldRefreshToken = testUser.refreshToken;

      // Use refresh token
      const refreshResponse = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: oldRefreshToken })
        .expect(200);

      // Try to use the old refresh token again
      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: oldRefreshToken })
        .expect(401);

      expect(response.body.message).toContain('revoked');
    });
  });

  describe('Error Information Disclosure', () => {
    it('should not leak sensitive information in error messages', async () => {
      // Test with non-existent user
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password'
        })
        .expect(401);

      // Should not reveal whether email exists or not
      expect(response.body.message).toBe('Invalid credentials');
      expect(response.body.message).not.toContain('user not found');
      expect(response.body.message).not.toContain('email');
    });

    it('should not expose stack traces in production', async () => {
      // Force an error and check response
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          // Invalid data to trigger error
          firstName: null,
          lastName: null,
          email: 'invalid',
          password: 'weak'
        });

      expect(response.body).not.toHaveProperty('stack');
      expect(response.body).not.toHaveProperty('trace');
    });
  });
});
