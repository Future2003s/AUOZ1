# 🚀 Production Setup Guide - Backend

## ✅ Đã Chuyển Sang Production Mode

Backend đã được cấu hình để chạy ở **production mode** mặc định.

## 📋 Các Thay Đổi Đã Thực Hiện

### 1. **Package.json Scripts**
- `build`: Tự động set `NODE_ENV=production`
- `start`: Tự động set `NODE_ENV=production`
- `start:prod`: Production start

### 2. **Config Defaults**
- `NODE_ENV` mặc định = `production`
- Production optimizations enabled
- Security features enabled

### 3. **CORS Configuration**
- Cho phép tất cả origins (có thể restrict qua env)
- Đã thêm domain: `https://lalalycheee.vn`

### 4. **Logging**
- Production: Chỉ log errors và warnings
- Development: Detailed logging

## 🔧 Cách Sử Dụng

### Build và Start:

```bash
# Build production
npm run build

# Start production server
npm run start
# hoặc
npm run start:prod
```

### Environment Variables:

1. Copy `.env.production` thành `.env` trên server
2. Điền đầy đủ các giá trị:
   - `DATABASE_URI`
   - `JWT_SECRET`
   - `JWT_REFRESH_SECRET`
   - `REDIS_HOST`, `REDIS_PASSWORD`
   - `CORS_ORIGIN` hoặc `ALLOW_ALL_CORS=true`
   - Các config khác

## ⚙️ Production Features

- ✅ Production optimizations enabled
- ✅ Security headers (Helmet)
- ✅ CORS configured
- ✅ Rate limiting enabled
- ✅ Compression enabled
- ✅ Performance monitoring
- ✅ Minimal logging (only errors/warnings)

## 🔒 Security

- Helmet security headers
- CORS properly configured
- Rate limiting
- Input sanitization
- SQL injection protection
- XSS protection

## 📝 Notes

- Tất cả code đã được tối ưu cho production
- Development features đã được tắt
- Logging chỉ hiển thị errors/warnings trong production
- Build output được tối ưu

## 🚀 Deployment Checklist

- [ ] Set `NODE_ENV=production` (đã set mặc định)
- [ ] Copy `.env.production` → `.env`
- [ ] Điền đầy đủ environment variables
- [ ] Build: `npm run build`
- [ ] Start: `npm run start`
- [ ] Kiểm tra health: `curl http://localhost:8081/health`
- [ ] Kiểm tra logs
- [ ] Test API endpoints

