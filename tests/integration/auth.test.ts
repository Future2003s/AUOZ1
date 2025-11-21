import request from 'supertest';
import { app } from '../../src/app';
import { User } from '../../src/models/User';

describe('Authentication API Endpoints', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: global.testUtils.generateRandomEmail(),
        password: 'SecurePassword123!',
        phone: '+1234567890'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User registered successfully.');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should return 400 for duplicate email', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'duplicate@example.com',
        password: 'SecurePassword123!'
      };

      // Register first user
      await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      // Try to register with same email
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should return 400 for invalid email format', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email',
        password: 'SecurePassword123!'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for weak password', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: global.testUtils.generateRandomEmail(),
        password: '123456' // Weak password
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing required fields', async () => {
      const userData = {
        firstName: 'John',
        // Missing lastName, email, password
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
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

    it('should login with valid credentials', async () => {
      const loginData = {
        email: testUser.user.email,
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('refreshToken');
    });

    it('should return 401 for invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should return 401 for invalid password', async () => {
      const loginData = {
        email: testUser.user.email,
        password: 'WrongPassword123!'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should return 401 for inactive user', async () => {
      // Deactivate user
      await User.findByIdAndUpdate(testUser.user._id, { isActive: false });

      const loginData = {
        email: testUser.user.email,
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Account is deactivated');
    });

    it('should implement rate limiting', async () => {
      const loginData = {
        email: testUser.user.email,
        password: 'WrongPassword123!'
      };

      // Make multiple failed attempts
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .send(loginData);
      }

      // Next attempt should be rate limited
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(429);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Too many');
    });
  });

  describe('POST /api/v1/auth/refresh-token', () => {
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

    it('should refresh token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: testUser.refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.token).not.toBe(testUser.token);
      expect(response.body.data.refreshToken).not.toBe(testUser.refreshToken);
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: 'invalid.refresh.token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid refresh token');
    });

    it('should blacklist used refresh token', async () => {
      const oldRefreshToken = testUser.refreshToken;

      // Use refresh token once
      await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: oldRefreshToken })
        .expect(200);

      // Try to use the same token again
      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: oldRefreshToken })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Token has been revoked');
    });
  });

  describe('GET /api/v1/auth/me', () => {
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

    it('should get current user with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(testUser.user.email);
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied. No token provided');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid token');
    });
  });
});
