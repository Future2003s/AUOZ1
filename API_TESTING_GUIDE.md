# 🧪 Comprehensive API Testing Guide

## 📋 **Overview**

This guide provides comprehensive testing procedures for the Node.js e-commerce backend API to ensure all endpoints are production-ready for frontend integration.

## 🚀 **Quick Start**

### **Prerequisites**
1. Server running on `http://localhost:8081`
2. MongoDB database connected
3. Redis cache (optional but recommended)
4. Node.js and npm installed

### **Run Tests**
```bash
# Quick API test (basic functionality)
node quick-api-test.js

# Comprehensive test suite
node run-api-tests.js

# Individual endpoint testing
node comprehensive-api-test.js
```

## 📊 **Test Categories**

### **1. Authentication APIs** 🔐

| Endpoint | Method | Purpose | Expected Status |
|----------|--------|---------|----------------|
| `/auth/register` | POST | User registration | 201 |
| `/auth/login` | POST | User login | 200 |
| `/auth/logout` | POST | User logout | 200 |
| `/auth/me` | GET | Get current user | 200 |
| `/auth/refresh-token` | POST | Refresh JWT token | 200 |
| `/auth/forgot-password` | POST | Password reset request | 200 |
| `/auth/reset-password/:token` | PUT | Reset password | 200 |
| `/auth/change-password` | PUT | Change password | 200 |

**Test Scenarios:**
- ✅ Valid credentials
- ❌ Invalid credentials
- ❌ Missing required fields
- ❌ Weak passwords
- ⏱️ Rate limiting (5 failed attempts)
- 🔒 JWT token validation

### **2. User Management APIs** 👤

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/users/profile` | GET | Get user profile | Yes |
| `/users/profile` | PUT | Update profile | Yes |
| `/users/avatar` | POST | Upload avatar | Yes |

**Test Scenarios:**
- ✅ Authenticated access
- ❌ Unauthenticated access
- ✅ Valid profile updates
- ❌ Invalid data validation

### **3. Product APIs** 📦

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/products` | GET | Get all products | No |
| `/products/:id` | GET | Get product by ID | No |
| `/products/search` | GET | Search products | No |
| `/products/category/:category` | GET | Products by category | No |
| `/products/brand/:brand` | GET | Products by brand | No |

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `sort` - Sort field (price, name, rating)
- `order` - Sort order (asc, desc)
- `q` - Search query
- `category` - Filter by category
- `brand` - Filter by brand
- `minPrice` - Minimum price
- `maxPrice` - Maximum price

### **4. Cart APIs** 🛒

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/cart` | GET | Get user cart | Yes |
| `/cart/add` | POST | Add item to cart | Yes |
| `/cart/update` | PUT | Update cart item | Yes |
| `/cart/remove/:productId` | DELETE | Remove item | Yes |
| `/cart/clear` | DELETE | Clear cart | Yes |

**Test Data:**
```json
{
  "productId": "product_id_here",
  "quantity": 2
}
```

### **5. Order APIs** 📋

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/orders` | GET | Get order history | Yes |
| `/orders` | POST | Create order | Yes |
| `/orders/:id` | GET | Get order details | Yes |
| `/orders/:id/cancel` | PUT | Cancel order | Yes |

**Test Data:**
```json
{
  "shippingAddress": {
    "street": "123 Test St",
    "city": "Test City",
    "state": "TS",
    "zipCode": "12345",
    "country": "Test Country"
  },
  "paymentMethod": "credit_card"
}
```

### **6. Admin APIs** 👑

| Endpoint | Method | Purpose | Admin Required |
|----------|--------|---------|----------------|
| `/admin/users` | GET | Get all users | Yes |
| `/admin/products` | POST | Create product | Yes |
| `/admin/products/:id` | PUT | Update product | Yes |
| `/admin/products/:id` | DELETE | Delete product | Yes |
| `/admin/orders` | GET | Get all orders | Yes |
| `/admin/analytics` | GET | Get analytics | Yes |

## 🔒 **Security Testing**

### **Authentication & Authorization**
- ✅ JWT token validation
- ❌ Invalid/expired tokens
- ❌ Missing authorization headers
- ✅ Role-based access control
- ❌ Privilege escalation attempts

### **Input Validation**
- ❌ SQL injection attempts
- ❌ XSS payloads
- ❌ Invalid email formats
- ❌ Weak passwords
- ❌ Missing required fields
- ❌ Invalid data types

### **Rate Limiting**
- ⏱️ Login attempts (5 per 15 minutes)
- ⏱️ API requests (100 per minute)
- ⏱️ Password reset (3 per hour)

## 🌐 **CORS & Headers Testing**

### **Required Headers**
```
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

### **Security Headers**
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
```

## 📊 **Response Format Standards**

### **Success Response**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  },
  "timestamp": "2025-08-19T10:30:00.000Z"
}
```

### **Error Response**
```json
{
  "success": false,
  "error": "Error message",
  "message": "Detailed error description",
  "statusCode": 400,
  "timestamp": "2025-08-19T10:30:00.000Z",
  "path": "/api/v1/auth/login",
  "method": "POST"
}
```

## 🛠️ **Testing Tools**

### **1. Automated Testing**
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:security
npm run test:performance
```

### **2. Manual Testing Tools**
- **Postman**: Import `postman-collection.json`
- **Thunder Client**: VS Code extension
- **Insomnia**: REST client
- **curl**: Command line testing

### **3. Performance Testing**
```bash
# Load testing with autocannon
npx autocannon -c 10 -d 30 http://localhost:8081/api/v1/products

# Memory profiling
npm run performance:test
```

## 📈 **Performance Benchmarks**

### **Target Metrics**
- **Response Time**: < 100ms (95th percentile)
- **Throughput**: > 500 requests/second
- **Error Rate**: < 1%
- **Memory Usage**: < 512MB
- **CPU Usage**: < 70%

### **Database Performance**
- **Query Time**: < 50ms average
- **Connection Pool**: 50 max, 10 min
- **Cache Hit Rate**: > 80%

## 🚨 **Common Issues & Solutions**

### **Authentication Issues**
```
❌ "Illegal arguments: string, undefined"
✅ Fixed: Separated auth queries from cached queries

❌ "Invalid token"
✅ Check JWT secret and token format

❌ "Token expired"
✅ Implement token refresh mechanism
```

### **Database Issues**
```
❌ "Connection timeout"
✅ Check MongoDB connection string and network

❌ "Slow queries"
✅ Add database indexes and optimize queries

❌ "Memory leaks"
✅ Implement proper connection pooling
```

### **CORS Issues**
```
❌ "CORS policy error"
✅ Configure CORS middleware with correct origins

❌ "Preflight request failed"
✅ Handle OPTIONS requests properly
```

## 📋 **Testing Checklist**

### **Before Frontend Integration**
- [ ] All authentication endpoints working
- [ ] CORS configured for frontend domain
- [ ] Input validation implemented
- [ ] Error responses standardized
- [ ] Rate limiting configured
- [ ] Security headers present
- [ ] Performance benchmarks met
- [ ] Database indexes optimized
- [ ] Caching implemented
- [ ] Logging configured

### **Production Readiness**
- [ ] Environment variables configured
- [ ] SSL/TLS certificates installed
- [ ] Database backups scheduled
- [ ] Monitoring alerts configured
- [ ] Load balancer configured
- [ ] CDN for static assets
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring (New Relic)

## 🎯 **Next Steps**

1. **Run Tests**: Execute all test suites
2. **Fix Issues**: Address any failed tests
3. **Performance Tuning**: Optimize slow endpoints
4. **Security Review**: Conduct security audit
5. **Documentation**: Update API documentation
6. **Frontend Integration**: Provide API specs to frontend team
7. **Monitoring**: Set up production monitoring
8. **Deployment**: Deploy to staging/production

---

**📞 Support**: For issues or questions, check the logs and error reports generated by the test suites.
