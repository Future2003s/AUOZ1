# Hướng dẫn Setup và Test Sản phẩm Nước Ép Vải

## Tổng quan

Hệ thống đã được cập nhật để hỗ trợ 4 sản phẩm nước ép vải với đầy đủ thông tin dinh dưỡng và thành phần.

## Các sản phẩm

1. **Nước Ép Vải Thiều** - 75.000 VND (slug: `nuoc-ep-vai-thieu`)
2. **Nước Ép Vải Phối Trộn** - 80.000 VND (slug: `nuoc-ep-vai-phoi-tron`)
3. **Nước Ép Vải Tàu Lai** - 80.000 VND (slug: `nuoc-ep-vai-tau-lai`)
4. **Nước Ép Vải U Hồng** - 95.000 VND (slug: `nuoc-ep-vai-u-hong`)

## Files đã sửa

### 1. Model (`src/models/Product.ts`)
- ✅ Thêm field `slug` (unique, indexed)
- ✅ Thêm field `currency` (default: "VND")
- ✅ Thêm field `ingredients` (string)
- ✅ Thêm field `nutrition` (object với energyKcal, proteinG, fatG, totalSugarG, sugarRangeG, sodiumMg)
- ✅ Thêm field `volumeMl` (number)
- ✅ Thêm field `supervisedBy` (string)
- ✅ Thêm field `claims` (array of strings)

### 2. Service (`src/services/productService.ts`)
- ✅ Update `getProductBySlug()` để hỗ trợ slug alias
- ✅ Hỗ trợ backward compatibility: `nuoc-cot-vai-100` → `nuoc-ep-vai-thieu`

### 3. Controller (`src/controllers/productController.ts`)
- ✅ Update `getProduct()` để hỗ trợ cả ID và slug
- ✅ Tự động detect ObjectId vs slug

### 4. Routes (`src/routes/products.ts`)
- ✅ Route `/:id` hỗ trợ cả ID và slug
- ✅ Giữ route cũ `/nuoc-cot-vai-100` cho backward compatibility

### 5. Script Seed (`src/scripts/seed-nuoc-ep-vai-products.ts`)
- ✅ Script để tạo/update 4 sản phẩm
- ✅ Xử lý migration từ slug cũ sang mới
- ✅ Tự động tìm category và user admin

## Cách chạy seed script

```bash
# Từ thư mục root của BeLLLC
npx ts-node src/scripts/seed-nuoc-ep-vai-products.ts
```

Hoặc nếu đã build:

```bash
node dist/scripts/seed-nuoc-ep-vai-products.js
```

## Test các endpoint

### 1. Test endpoint bằng slug mới

```bash
# Nước Ép Vải Thiều
curl http://localhost:8081/api/v1/products/nuoc-ep-vai-thieu

# Nước Ép Vải Phối Trộn
curl http://localhost:8081/api/v1/products/nuoc-ep-vai-phoi-tron

# Nước Ép Vải Tàu Lai
curl http://localhost:8081/api/v1/products/nuoc-ep-vai-tau-lai

# Nước Ép Vải U Hồng
curl http://localhost:8081/api/v1/products/nuoc-ep-vai-u-hong
```

### 2. Test endpoint cũ (backward compatibility)

```bash
# Endpoint cũ vẫn hoạt động
curl http://localhost:8081/api/v1/products/nuoc-cot-vai-100
```

### 3. Test bằng ObjectId (nếu có)

```bash
# Thay <PRODUCT_ID> bằng ObjectId thực tế
curl http://localhost:8081/api/v1/products/<PRODUCT_ID>
```

## Response mẫu

```json
{
  "success": true,
  "message": "Product retrieved successfully",
  "data": {
    "_id": "...",
    "name": "Nước Ép Vải Thiều",
    "slug": "nuoc-ep-vai-thieu",
    "price": 75000,
    "currency": "VND",
    "ingredients": "Thành Phần: 98% Nước Ép Vải, 2% Nước Ép Chanh",
    "nutrition": {
      "energyKcal": 64,
      "proteinG": 0,
      "fatG": 0,
      "totalSugarG": 16,
      "sugarRangeG": "15-16",
      "sodiumMg": 1
    },
    "volumeMl": 250,
    "supervisedBy": "MASATOSHI OZAKI - Chuyên gia công nghệ chế biến thực phẩm",
    "claims": [
      "Không chất bảo quản",
      "Không Thêm Đường",
      "Không Thêm Nước"
    ],
    "description": "...",
    "shortDescription": "...",
    "status": "active",
    "isVisible": true,
    "isFeatured": true,
    ...
  }
}
```

## Kiểm tra dữ liệu

Sau khi chạy seed script, kiểm tra trong database:

```javascript
// MongoDB shell hoặc MongoDB Compass
db.products.find({ 
  slug: { $in: [
    "nuoc-ep-vai-thieu",
    "nuoc-ep-vai-phoi-tron", 
    "nuoc-ep-vai-tau-lai",
    "nuoc-ep-vai-u-hong"
  ]}
}).pretty()
```

## Lưu ý

1. **Encoding**: Tất cả dữ liệu tiếng Việt được lưu với UTF-8, không có vấn đề encoding.

2. **Slug alias**: Slug cũ `nuoc-cot-vai-100` tự động redirect đến `nuoc-ep-vai-thieu` trong service layer.

3. **Validation**: Model không reject dấu tiếng Việt, `sugarRangeG` có thể là string "15-16".

4. **Cache**: Tất cả endpoint có cache (300-600 giây) để tối ưu performance.

## Troubleshooting

### Lỗi: "No user found in database"
- Tạo ít nhất 1 user trong database (có thể là admin hoặc user bất kỳ)

### Lỗi: "No category found in database"
- Tạo ít nhất 1 category trong database

### Lỗi: "Product with this SKU already exists"
- Script sẽ update product nếu đã tồn tại (dựa trên slug)
- Nếu vẫn lỗi, kiểm tra SKU trong database

### Slug không hoạt động
- Đảm bảo đã chạy seed script
- Kiểm tra index `slug` đã được tạo trong MongoDB
- Clear cache nếu cần: `redis-cli FLUSHDB`

## Next Steps

1. ✅ Chạy seed script để tạo 4 sản phẩm
2. ✅ Test các endpoint bằng curl
3. ✅ Verify dữ liệu trong database
4. ✅ Update frontend (OrderFe) để sử dụng slug mới
5. ✅ Monitor logs để đảm bảo không có lỗi
