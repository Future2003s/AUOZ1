# 🚀 ShopDev Performance Optimization Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment Variables
Copy the performance environment variables:
```bash
cp .env.performance .env
```

### 3. Start Optimized Server
```bash
# Development with optimizations
npm run dev:optimized

# Production with optimizations
npm run build
npm run prod:optimized
```

## 🔧 Performance Features

### Database Optimizations
- **Connection Pooling**: 50 max connections, 5 min connections
- **Optimized Indexes**: Compound indexes for common queries
- **Query Optimization**: Lean queries, selective population
- **Compression**: zlib compression for network traffic

### Caching Strategy
- **Multi-layer Caching**: Redis + In-memory
- **Smart TTL**: Different TTL for different data types
- **Cache Invalidation**: Intelligent cache invalidation patterns
- **Cache Warming**: Pre-populate frequently accessed data

### API Performance
- **Response Compression**: gzip/brotli compression
- **Rate Limiting**: Redis-based rate limiting
- **Pagination Optimization**: Cursor-based pagination
- **Validation Caching**: Cached Zod validation results

### Security Performance
- **JWT Caching**: Cached token validation
- **User Data Caching**: Avoid repeated DB lookups
- **Optimized Bcrypt**: Balanced security vs performance

## 📊 Performance Monitoring

### Health Check
```bash
curl http://localhost:8081/api/v1/performance/health
```

### Performance Metrics
```bash
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     http://localhost:8081/api/v1/performance/metrics
```

### Cache Statistics
```bash
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     http://localhost:8081/api/v1/performance/cache
```

## 🛠️ Performance Commands

### Run Benchmarks
```bash
npm run benchmark
```

### Clear Cache
```bash
npm run cache:clear
```

### Create Database Indexes
```bash
npm run db:indexes
```

### Check Health
```bash
npm run health:check
```

### View Metrics
```bash
npm run metrics
```

## 📈 Expected Performance Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| API Response Time | 100-500ms | 30-150ms | **70% faster** |
| Database Queries | 50-200ms | 10-50ms | **60-75% faster** |
| Memory Usage | High variance | Stable, 30% less | **30% reduction** |
| Cache Hit Rate | 0% | 80-95% | **New capability** |
| Concurrent Users | 100-200 | 500-1000 | **5x increase** |

## 🔍 Performance Monitoring Endpoints

### Admin Only Endpoints
All performance endpoints require admin authentication:

- `GET /api/v1/performance/metrics` - Overall performance metrics
- `GET /api/v1/performance/cache` - Cache statistics
- `GET /api/v1/performance/rate-limits` - Rate limiting stats
- `GET /api/v1/performance/database` - Database performance
- `GET /api/v1/performance/health` - System health check
- `DELETE /api/v1/performance/cache` - Clear cache (admin)
- `DELETE /api/v1/performance/rate-limits` - Clear rate limits (admin)

## ⚙️ Configuration

### Environment Variables
Key performance settings in `.env`:

```env
# Database Performance
DB_MAX_POOL_SIZE=50
DB_MIN_POOL_SIZE=5
DB_COMPRESSION_LEVEL=6

# Redis Cache
REDIS_HOST=localhost
REDIS_PORT=6379

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=1000
RATE_LIMIT_WINDOW_MS=900000

# Compression
COMPRESSION_LEVEL=6
COMPRESSION_THRESHOLD=1024
```

### Cache TTL Settings
```env
CACHE_SHORT_TTL=300      # 5 minutes
CACHE_MEDIUM_TTL=1800    # 30 minutes
CACHE_LONG_TTL=3600      # 1 hour
CACHE_VERY_LONG_TTL=86400 # 24 hours
```

## 🚀 Production Deployment

### 1. Build for Production
```bash
npm run build
```

### 2. Set Production Environment
```bash
export NODE_ENV=production
```

### 3. Start with PM2 (Recommended)
```bash
pm2 start dist/index.js --name "shopdev-api" -i max
```

### 4. Monitor Performance
```bash
pm2 monit
```

## 🔧 Troubleshooting

### High Memory Usage
1. Check cache memory usage:
   ```bash
   curl -H "Authorization: Bearer TOKEN" \
        http://localhost:8081/api/v1/performance/cache
   ```

2. Clear cache if needed:
   ```bash
   npm run cache:clear
   ```

### Slow Database Queries
1. Check database performance:
   ```bash
   curl -H "Authorization: Bearer TOKEN" \
        http://localhost:8081/api/v1/performance/database
   ```

2. Recreate indexes:
   ```bash
   npm run db:indexes
   ```

### Rate Limiting Issues
1. Check rate limit stats:
   ```bash
   curl -H "Authorization: Bearer TOKEN" \
        http://localhost:8081/api/v1/performance/rate-limits
   ```

2. Clear rate limits if needed:
   ```bash
   curl -X DELETE -H "Authorization: Bearer TOKEN" \
        http://localhost:8081/api/v1/performance/rate-limits
   ```

## 📋 Performance Checklist

- ✅ Database indexes optimized
- ✅ Connection pooling configured
- ✅ Multi-layer caching implemented
- ✅ Response compression enabled
- ✅ JWT validation optimized
- ✅ Rate limiting implemented
- ✅ Memory management optimized
- ✅ Query performance monitored
- ✅ Error handling streamlined
- ✅ Static asset caching enabled

## 🎯 Performance Best Practices

### 1. Database
- Use lean queries for read-only operations
- Implement proper indexing strategy
- Use aggregation pipelines for complex queries
- Monitor slow queries

### 2. Caching
- Cache frequently accessed data
- Use appropriate TTL for different data types
- Implement cache invalidation strategies
- Monitor cache hit rates

### 3. API Design
- Implement pagination for large datasets
- Use compression for large responses
- Implement proper rate limiting
- Monitor response times

### 4. Security
- Cache authentication results
- Use efficient password hashing
- Implement token blacklisting
- Monitor security metrics

## 📞 Support

For performance-related issues:
1. Check the performance metrics endpoint
2. Review the logs for slow queries
3. Monitor memory and CPU usage
4. Check cache hit rates

The optimized ShopDev backend is now ready for high-performance e-commerce workloads! 🎉
