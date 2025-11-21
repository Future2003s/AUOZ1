import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { config } from '../src/config/config';

let mongoServer: MongoMemoryServer;

// Setup test database
beforeAll(async () => {
  // Start in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect to the in-memory database
  await mongoose.connect(mongoUri);
  
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-only';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-purposes-only';
});

// Clean up after each test
afterEach(async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Cleanup after all tests
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

// Global test utilities
global.testUtils = {
  createTestUser: () => ({
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    password: 'TestPassword123!',
    phone: '+1234567890'
  }),
  
  createAdminUser: () => ({
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@example.com',
    password: 'AdminPassword123!',
    role: 'admin'
  }),
  
  generateRandomEmail: () => `test${Date.now()}${Math.random().toString(36).substring(7)}@example.com`,
  
  sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
};

// Extend global namespace for TypeScript
declare global {
  var testUtils: {
    createTestUser: () => any;
    createAdminUser: () => any;
    generateRandomEmail: () => string;
    sleep: (ms: number) => Promise<void>;
  };
}
