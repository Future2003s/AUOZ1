# 🚀 Production Deployment Checklist

## ✅ **Pre-Deployment Verification**

### **1. Code Quality & Testing**
- [ ] All tests pass: `npm run test:all`
- [ ] Code coverage ≥ 95%: `npm run test:coverage`
- [ ] Security tests pass: `npm run test:security`
- [ ] Performance benchmarks meet requirements
- [ ] No ESLint errors: `npm run lint`
- [ ] Code formatted: `npm run prettier`
- [ ] TypeScript compilation successful: `npm run build`

### **2. Security Verification**
- [ ] JWT secrets are cryptographically strong (256-bit)
- [ ] Environment variables are properly configured
- [ ] No hardcoded secrets in code
- [ ] Rate limiting is properly configured
- [ ] Input validation is comprehensive
- [ ] HTTPS is enforced
- [ ] Security headers are configured

### **3. Performance Optimization**
- [ ] Database indexes are created
- [ ] Caching is properly configured
- [ ] Memory usage is optimized
- [ ] Response times meet SLA requirements
- [ ] Concurrent user limits are tested

---

## 🔧 **Environment Setup**

### **Required Environment Variables**
```bash
# Application
NODE_ENV=production
PORT=8081

# Database
MONGODB_URI=mongodb://production-cluster/shopdev
REDIS_URL=redis://production-redis:6379

# JWT Configuration
JWT_SECRET=<GENERATE_256_BIT_SECRET>
JWT_REFRESH_SECRET=<GENERATE_256_BIT_SECRET>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_MAX=1000
CORS_ORIGIN=https://yourdomain.com

# Performance
CACHE_TTL=1800
MAX_CONNECTIONS=100
```

### **Generate Secure Secrets**
```bash
# Generate JWT secrets
openssl rand -hex 32  # For JWT_SECRET
openssl rand -hex 32  # For JWT_REFRESH_SECRET
```

---

## 📦 **Deployment Steps**

### **1. Install Dependencies**
```bash
npm ci --only=production
```

### **2. Build Application**
```bash
npm run build
```

### **3. Database Setup**
```bash
# Create indexes
npm run db:indexes

# Run migrations (if any)
npm run migrate
```

### **4. Start Application**
```bash
# Production start
npm run start:prod

# Or with PM2
pm2 start ecosystem.config.js --env production
```

---

## 🔍 **Health Checks**

### **Application Health**
```bash
# Basic health check
curl -f http://localhost:8081/api/v1/performance/health

# Detailed metrics
curl http://localhost:8081/api/v1/performance/metrics

# Cache statistics
curl http://localhost:8081/api/v1/performance/cache-stats
```

### **Expected Responses**
```json
// Health check response
{
  "status": "healthy",
  "timestamp": "2025-08-18T12:00:00.000Z",
  "uptime": 3600,
  "memory": {
    "used": "85MB",
    "total": "512MB"
  },
  "database": "connected",
  "cache": "connected"
}
```

---

## 📊 **Monitoring Setup**

### **Key Metrics to Monitor**
- **Response Time**: <100ms average
- **Throughput**: 500+ requests/second
- **Error Rate**: <0.1%
- **Memory Usage**: <100MB
- **Cache Hit Rate**: >85%
- **Database Connections**: <80% of pool

### **Alerts Configuration**
```yaml
# Example alert rules
alerts:
  - name: "High Response Time"
    condition: "avg_response_time > 200ms"
    severity: "warning"
  
  - name: "High Error Rate"
    condition: "error_rate > 1%"
    severity: "critical"
  
  - name: "Memory Usage High"
    condition: "memory_usage > 150MB"
    severity: "warning"
```

---

## 🔒 **Security Configuration**

### **Firewall Rules**
```bash
# Allow only necessary ports
ufw allow 22    # SSH
ufw allow 80    # HTTP (redirect to HTTPS)
ufw allow 443   # HTTPS
ufw deny 8081   # Block direct access to app port
```

### **Reverse Proxy (Nginx)**
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location /api/ {
        proxy_pass http://localhost:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 🚨 **Rollback Plan**

### **Quick Rollback Steps**
1. **Stop current application**
   ```bash
   pm2 stop all
   ```

2. **Restore previous version**
   ```bash
   git checkout previous-stable-tag
   npm ci --only=production
   npm run build
   ```

3. **Restart application**
   ```bash
   pm2 start ecosystem.config.js --env production
   ```

4. **Verify health**
   ```bash
   curl -f http://localhost:8081/api/v1/performance/health
   ```

---

## 📋 **Post-Deployment Verification**

### **Functional Tests**
- [ ] User registration works
- [ ] User login works
- [ ] Token refresh works
- [ ] Password reset works
- [ ] Rate limiting is active
- [ ] All API endpoints respond correctly

### **Performance Tests**
- [ ] Response times are within SLA
- [ ] Concurrent user handling works
- [ ] Memory usage is stable
- [ ] Cache is functioning properly

### **Security Tests**
- [ ] HTTPS is enforced
- [ ] Security headers are present
- [ ] Rate limiting blocks excessive requests
- [ ] Input validation prevents attacks

---

## 📞 **Support & Maintenance**

### **Log Locations**
```bash
# Application logs
/var/log/shopdev/app.log

# Error logs
/var/log/shopdev/error.log

# Access logs
/var/log/nginx/access.log
```

### **Common Issues & Solutions**

#### **High Memory Usage**
```bash
# Check memory usage
pm2 monit

# Restart if needed
pm2 restart all

# Clear cache
npm run cache:clear
```

#### **Database Connection Issues**
```bash
# Check MongoDB status
systemctl status mongod

# Check connection
mongo --eval "db.adminCommand('ismaster')"
```

#### **Cache Issues**
```bash
# Check Redis status
systemctl status redis

# Clear cache
redis-cli flushall
```

---

## 🔄 **Maintenance Schedule**

### **Daily**
- [ ] Monitor application health
- [ ] Check error logs
- [ ] Verify performance metrics

### **Weekly**
- [ ] Review security logs
- [ ] Update dependencies (if needed)
- [ ] Performance optimization review

### **Monthly**
- [ ] Security audit
- [ ] Database optimization
- [ ] Backup verification
- [ ] Disaster recovery test

---

## 📈 **Success Criteria**

### **Performance KPIs**
- ✅ Response time: <100ms (95th percentile)
- ✅ Throughput: 500+ requests/second
- ✅ Uptime: 99.9%
- ✅ Error rate: <0.1%

### **Security KPIs**
- ✅ Zero security incidents
- ✅ All security tests passing
- ✅ Regular security audits
- ✅ Compliance with security standards

### **Operational KPIs**
- ✅ Deployment time: <5 minutes
- ✅ Rollback time: <2 minutes
- ✅ Mean time to recovery: <10 minutes
- ✅ Monitoring coverage: 100%

---

## 🎯 **Final Checklist**

Before marking deployment as complete:

- [ ] All tests pass
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] Monitoring configured
- [ ] Alerts set up
- [ ] Documentation updated
- [ ] Team trained on new features
- [ ] Rollback plan tested
- [ ] Support procedures documented

**🎉 Deployment Complete! System is production-ready.**
