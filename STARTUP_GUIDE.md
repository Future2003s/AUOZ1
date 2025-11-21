# 🚀 Hướng dẫn khởi động Full-Stack E-Commerce System

## 📋 **Yêu cầu hệ thống**

### **Phần mềm cần thiết:**
- ✅ **Node.js** >= 18.0.0
- ✅ **npm** >= 8.0.0 
- ✅ **MongoDB** (local hoặc cloud)
- ✅ **Redis** (optional - cho caching)

### **Kiểm tra phiên bản:**
```bash
node --version    # >= 18.0.0
npm --version     # >= 8.0.0
```

---

## 🔧 **Cài đặt và cấu hình**

### **1. Clone và cài đặt dependencies**
```bash
# Cài đặt backend dependencies
npm install

# Cài đặt frontend dependencies
cd clientCompany
npm install
cd ..
```

### **2. Cấu hình Environment Variables**

#### **Backend (.env)**
```env
# Environment
NODE_ENV=development
PORT=8081

# Database
DATABASE_URI=mongodb://localhost:27017/ShopDev

# JWT Secrets (GENERATE STRONG SECRETS!)
JWT_SECRET=your-super-secret-jwt-key-256-bits-long
JWT_REFRESH_SECRET=your-super-secret-refresh-key-256-bits-long
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

#### **Frontend (clientCompany/.env.local)**
```env
# Frontend Configuration
NEXT_PUBLIC_URL=http://localhost:3000
NEXT_PUBLIC_API_END_POINT=http://localhost:8081/api/v1
NEXT_PUBLIC_URL_LOGO=/logo.png

# Backend Configuration
NEXT_PUBLIC_BACKEND_URL=http://localhost:8081
NEXT_PUBLIC_API_VERSION=v1
```

---

## 🚀 **Khởi động hệ thống**

### **Phương pháp 1: Khởi động tự động (Khuyến nghị)**
```bash
# Khởi động cả backend và frontend cùng lúc
node start-fullstack.js
```

### **Phương pháp 2: Khởi động thủ công**

#### **Terminal 1 - Backend:**
```bash
# Khởi động backend trên port 8081
npm run dev
```

#### **Terminal 2 - Frontend:**
```bash
# Khởi động frontend trên port 3000
cd clientCompany
npm run dev
```

---

## 🌐 **Truy cập ứng dụng**

Sau khi khởi động thành công:

- 🌐 **Frontend**: http://localhost:3000
- 🔗 **Backend API**: http://localhost:8081
- 📚 **API Documentation**: http://localhost:8081/api-docs
- 🔍 **Health Check**: http://localhost:8081/api/v1/performance/health

---

## 🧪 **Kiểm tra hệ thống**

### **1. Test Backend API**
```bash
# Health check
curl http://localhost:8081/api/v1/performance/health

# Test registration
curl -X POST http://localhost:8081/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User", 
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'
```

### **2. Test Frontend**
1. Mở http://localhost:3000
2. Đăng ký tài khoản mới
3. Đăng nhập
4. Kiểm tra trang cá nhân

---

## 🛠️ **Troubleshooting**

### **Lỗi thường gặp:**

#### **1. Port đã được sử dụng**
```bash
# Kiểm tra port đang sử dụng
netstat -ano | findstr :8081
netstat -ano | findstr :3000

# Kill process (Windows)
taskkill /PID <PID> /F

# Kill process (Mac/Linux)
kill -9 <PID>
```

#### **2. MongoDB connection failed**
```bash
# Kiểm tra MongoDB đang chạy
mongosh --eval "db.adminCommand('ismaster')"

# Khởi động MongoDB (Windows)
net start MongoDB

# Khởi động MongoDB (Mac)
brew services start mongodb-community

# Khởi động MongoDB (Linux)
sudo systemctl start mongod
```

#### **3. Dependencies issues**
```bash
# Xóa node_modules và cài đặt lại
rm -rf node_modules package-lock.json
npm install

# Frontend
cd clientCompany
rm -rf node_modules package-lock.json  
npm install
```

#### **4. Environment variables not loaded**
- Kiểm tra file `.env` và `.env.local` có tồn tại
- Đảm bảo không có khoảng trắng trong tên biến
- Restart server sau khi thay đổi env

---

## 📊 **Monitoring & Logs**

### **Backend Logs:**
- Application logs: `logs/combined.log`
- Error logs: `logs/error.log`
- Console output với colors

### **Performance Monitoring:**
```bash
# Cache statistics
curl http://localhost:8081/api/v1/performance/cache-stats

# Performance metrics
curl http://localhost:8081/api/v1/performance/metrics
```

---

## 🔒 **Security Notes**

### **Development:**
- ✅ CORS enabled cho localhost
- ✅ JWT tokens với short expiry
- ✅ Input validation active
- ✅ Rate limiting enabled

### **Production:**
- 🔐 Generate strong JWT secrets
- 🔐 Use HTTPS
- 🔐 Configure proper CORS origins
- 🔐 Set secure cookie options
- 🔐 Enable all security headers

---

## 📚 **Tài liệu tham khảo**

- 📖 [Backend API Documentation](./API_DOCUMENTATION.md)
- 🔧 [Optimization Report](./OPTIMIZATION_REPORT.md)
- 🛡️ [Security Audit](./SECURITY_AUDIT_REPORT.md)
- 🚀 [Production Deployment](./PRODUCTION_DEPLOYMENT_CHECKLIST.md)
- 🎯 [Frontend Integration](./clientCompany/BACKEND_INTEGRATION_README.md)

---

## 🆘 **Hỗ trợ**

Nếu gặp vấn đề:

1. **Kiểm tra logs** trong console và file logs
2. **Verify environment** variables
3. **Check ports** availability
4. **Restart services** nếu cần
5. **Clear cache** và reinstall dependencies

**Happy Coding! 🎉**
