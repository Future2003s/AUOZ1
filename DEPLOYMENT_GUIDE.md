# 🚀 Production Deployment Guide - Backend (BeLLLC)

## ✅ Đã Chuyển Sang Production Mode

Backend đã được cấu hình để chạy ở **production mode** mặc định.

## 📋 Quick Start

### 1. Build Production
```bash
npm run build
```

### 2. Start Production Server
```bash
npm run start
# hoặc
npm run start:prod
```

## 🔧 Environment Variables

Tạo file `.env` trên server với nội dung từ `.env.production`:

```env
NODE_ENV=production
PORT=8081
DATABASE_URI=your-production-mongodb-uri
JWT_SECRET=your-secure-secret
ALLOW_ALL_CORS=true
# ... (xem .env.production để biết đầy đủ)
```

## ⚙️ Production Features Enabled

- ✅ Production optimizations
- ✅ Security headers (Helmet)
- ✅ CORS configured (allows all by default)
- ✅ Rate limiting
- ✅ Compression
- ✅ Performance monitoring
- ✅ Minimal logging (only errors/warnings)

## 🔒 Security

- Helmet security headers
- CORS properly configured
- Rate limiting enabled
- Input sanitization
- SQL injection protection
- XSS protection

## 📝 Notes

- Tất cả scripts tự động set `NODE_ENV=production`
- Default config = production
- Logging chỉ hiển thị errors/warnings

