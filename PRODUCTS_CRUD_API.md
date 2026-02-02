# Products CRUD API Documentation

## Base URL
```
http://localhost:8081/products
```

## Authentication
Các endpoint CREATE, UPDATE, DELETE yêu cầu authentication token trong header:
```
Authorization: Bearer <your-token>
```

## Endpoints

### 1. GET /products
Lấy danh sách sản phẩm với pagination và filters

**Query Parameters:**
- `page` (number): Trang hiện tại (default: 1)
- `limit` (number): Số sản phẩm mỗi trang (default: 20)
- `search` (string): Tìm kiếm theo tên, mô tả
- `category` (string): Filter theo category ID
- `brand` (string): Filter theo brand ID
- `minPrice` (number): Giá tối thiểu
- `maxPrice` (number): Giá tối đa
- `tags` (string): Filter theo tags (comma-separated)
- `status` (string): Filter theo status (draft, active, archived)
- `isVisible` (boolean): Filter theo visibility
- `isFeatured` (boolean): Filter theo featured
- `sort` (string): Sắp xếp theo field (default: createdAt)
- `order` (string): Thứ tự (asc, desc) (default: desc)

**Example:**
```bash
# Get all products
curl http://localhost:8081/products

# Get products with pagination
curl "http://localhost:8081/products?page=1&limit=10"

# Search products
curl "http://localhost:8081/products?search=nước ép vải"

# Filter by category
curl "http://localhost:8081/products?category=CATEGORY_ID"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5
    }
  }
}
```

---

### 2. GET /products/:id
Lấy thông tin một sản phẩm theo ID hoặc slug

**Parameters:**
- `id` (string): Product ID (ObjectId) hoặc slug (e.g., `nuoc-ep-vai-thieu`)

**Example:**
```bash
# Get by ID
curl http://localhost:8081/products/507f1f77bcf86cd799439011

# Get by slug
curl http://localhost:8081/products/nuoc-ep-vai-thieu
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "name": "Nước Ép Vải Thiều",
    "slug": "nuoc-ep-vai-thieu",
    "price": 75000,
    "currency": "VND",
    "images": [...],
    "ingredients": "...",
    "nutrition": {...},
    ...
  }
}
```

---

### 3. POST /products
Tạo sản phẩm mới

**Authentication:** Required (Admin/Seller/Employee)

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Nước Ép Vải Thiều",
  "slug": "nuoc-ep-vai-thieu",
  "price": 75000,
  "currency": "VND",
  "sku": "NEV-THIEU-250ML",
  "category": "CATEGORY_ID",
  "description": "Mô tả sản phẩm...",
  "shortDescription": "Mô tả ngắn",
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
  "images": [
    {
      "url": "https://example.com/image.jpg",
      "alt": "Product image",
      "isMain": true,
      "order": 0
    }
  ],
  "tags": ["nước ép vải", "vải thiều"],
  "status": "active",
  "isVisible": true,
  "isFeatured": true,
  "quantity": 100,
  "trackQuantity": true
}
```

**Example:**
```bash
curl -X POST http://localhost:8081/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nước Ép Vải Thiều",
    "price": 75000,
    "category": "CATEGORY_ID",
    "sku": "NEV-THIEU-250ML"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "_id": "...",
    "name": "Nước Ép Vải Thiều",
    ...
  }
}
```

---

### 4. PUT /products/:id
Cập nhật sản phẩm

**Authentication:** Required (Admin/Seller)

**Parameters:**
- `id` (string): Product ID (ObjectId)

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:** (Tương tự POST, nhưng chỉ cần gửi các field muốn update)

**Example:**
```bash
curl -X PUT http://localhost:8081/products/PRODUCT_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "price": 80000,
    "quantity": 150
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Product updated successfully",
  "data": {
    "_id": "...",
    "name": "Nước Ép Vải Thiều",
    "price": 80000,
    ...
  }
}
```

---

### 5. DELETE /products/:id
Xóa sản phẩm

**Authentication:** Required (Admin/Seller)

**Parameters:**
- `id` (string): Product ID (ObjectId)

**Headers:**
```
Authorization: Bearer <token>
```

**Example:**
```bash
curl -X DELETE http://localhost:8081/products/PRODUCT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Product deleted successfully",
  "data": null
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Validation error",
  "message": "Product name is required"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Please provide a valid token"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Forbidden",
  "message": "You don't have permission to perform this action"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Resource not found",
  "message": "Product not found"
}
```

---

## Quick Test Commands

```bash
# 1. Get all products
curl http://localhost:8081/products

# 2. Get product by slug
curl http://localhost:8081/products/nuoc-ep-vai-thieu

# 3. Create product (replace TOKEN và CATEGORY_ID)
curl -X POST http://localhost:8081/products \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Product","price":100000,"category":"CATEGORY_ID","sku":"TEST-001"}'

# 4. Update product (replace PRODUCT_ID và TOKEN)
curl -X PUT http://localhost:8081/products/PRODUCT_ID \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"price":120000}'

# 5. Delete product (replace PRODUCT_ID và TOKEN)
curl -X DELETE http://localhost:8081/products/PRODUCT_ID \
  -H "Authorization: Bearer TOKEN"
```

---

## Notes

1. **Slug vs ID**: Endpoint `GET /products/:id` hỗ trợ cả ObjectId và slug
2. **Images**: Có thể upload ảnh qua endpoint `/api/v1/products/images` (POST) trước, sau đó dùng URL trong `images` array
3. **Validation**: Tất cả fields bắt buộc sẽ được validate tự động
4. **Cache**: GET requests có cache để tối ưu performance
5. **Rate Limiting**: Có rate limiting để bảo vệ API
