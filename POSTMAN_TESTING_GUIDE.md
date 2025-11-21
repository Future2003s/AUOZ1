# 🚀 Hướng Dẫn Test Postman với Validation Mới

## 📋 Tổng quan

Validation middleware mới đã được tạo để hoạt động chắc chắn với Postman. Không còn sử dụng express-validator phức tạp, thay vào đó sử dụng validation đơn giản và rõ ràng.

## 🔧 Validation Rules

### 1. **Products API** (`/api/v1/products`)

#### POST - Create Product

**URL:** `POST http://localhost:8081/api/v1/products`
**Headers:**

```
Content-Type: application/json
Authorization: Bearer <your-jwt-token>
```

**Test Cases:**

**✅ Valid Data:**

```json
{
    "name": "Sản phẩm test hợp lệ",
    "price": 299000,
    "sku": "TEST-001"
}
```

**❌ Invalid Data - Name too short:**

```json
{
    "name": "A",
    "price": 299000,
    "sku": "TEST-001"
}
```

**Expected Response:**

```json
{
    "success": false,
    "message": "Validation failed",
    "errors": [
        {
            "field": "name",
            "message": "Product name must be at least 2 characters long"
        }
    ]
}
```

**❌ Invalid Data - Negative price:**

```json
{
    "name": "Sản phẩm test",
    "price": -100,
    "sku": "TEST-001"
}
```

**Expected Response:**

```json
{
    "success": false,
    "message": "Validation failed",
    "errors": [
        {
            "field": "price",
            "message": "Price must be a positive number"
        }
    ]
}
```

**❌ Invalid Data - Empty SKU:**

```json
{
    "name": "Sản phẩm test",
    "price": 299000,
    "sku": ""
}
```

**Expected Response:**

```json
{
    "success": false,
    "message": "Validation failed",
    "errors": [
        {
            "field": "sku",
            "message": "SKU is required"
        }
    ]
}
```

#### PUT - Update Product

**URL:** `PUT http://localhost:8081/api/v1/products/:id`
**Headers:**

```
Content-Type: application/json
Authorization: Bearer <your-jwt-token>
```

**Test Cases:**

**✅ Valid Update - Partial data:**

```json
{
    "name": "Sản phẩm đã cập nhật"
}
```

**❌ Invalid Update - Invalid name:**

```json
{
    "name": "A"
}
```

### 2. **Categories API** (`/api/v1/categories`)

#### POST - Create Category

**URL:** `POST http://localhost:8081/api/v1/categories`
**Headers:**

```
Content-Type: application/json
Authorization: Bearer <your-jwt-token>
```

**Test Cases:**

**✅ Valid Data:**

```json
{
    "name": "Danh mục test",
    "description": "Mô tả danh mục test"
}
```

**❌ Invalid Data - Empty name:**

```json
{
    "name": "",
    "description": "Mô tả danh mục test"
}
```

**❌ Invalid Data - Name too short:**

```json
{
    "name": "A",
    "description": "Mô tả danh mục test"
}
```

### 3. **Reviews API** (`/api/v1/reviews`)

#### POST - Create Review

**URL:** `POST http://localhost:8081/api/v1/reviews`
**Headers:**

```
Content-Type: application/json
Authorization: Bearer <your-jwt-token>
```

**Test Cases:**

**✅ Valid Data:**

```json
{
    "rating": 5,
    "productId": "64f8b8b8b8b8b8b8b8b8b8b8",
    "comment": "Đánh giá rất tốt!"
}
```

**❌ Invalid Data - Rating too high:**

```json
{
    "rating": 6,
    "productId": "64f8b8b8b8b8b8b8b8b8b8b8",
    "comment": "Đánh giá rất tốt!"
}
```

**❌ Invalid Data - Invalid product ID:**

```json
{
    "rating": 5,
    "productId": "invalid-id",
    "comment": "Đánh giá rất tốt!"
}
```

### 4. **Auth API** (`/api/v1/auth`)

#### POST - Register

**URL:** `POST http://localhost:8081/api/v1/auth/register`
**Headers:**

```
Content-Type: application/json
```

**Test Cases:**

**✅ Valid Data:**

```json
{
    "firstName": "Nguyễn",
    "lastName": "Văn A",
    "email": "test@example.com",
    "password": "123456"
}
```

**❌ Invalid Data - Invalid email:**

```json
{
    "firstName": "Nguyễn",
    "lastName": "Văn A",
    "email": "invalid-email",
    "password": "123456"
}
```

**❌ Invalid Data - Password too short:**

```json
{
    "firstName": "Nguyễn",
    "lastName": "Văn A",
    "email": "test@example.com",
    "password": "123"
}
```

#### POST - Login

**URL:** `POST http://localhost:8081/api/v1/auth/login`
**Headers:**

```
Content-Type: application/json
```

**Test Cases:**

**✅ Valid Data:**

```json
{
    "email": "test@example.com",
    "password": "123456"
}
```

**❌ Invalid Data - Missing password:**

```json
{
    "email": "test@example.com"
}
```

## 🧪 Test Scenarios

### 1. **Test Validation Without Token**

- Gửi request không có `Authorization` header
- Expected: `401 Unauthorized`

### 2. **Test Validation With Invalid Token**

- Gửi request với `Authorization: Bearer fake-token`
- Expected: `401 Unauthorized`

### 3. **Test Validation With Valid Token But Invalid Data**

- Gửi request với token hợp lệ nhưng dữ liệu không hợp lệ
- Expected: `400 Bad Request` với validation errors

### 4. **Test Validation With Valid Token And Valid Data**

- Gửi request với token hợp lệ và dữ liệu hợp lệ
- Expected: `200 OK` hoặc `201 Created`

## 📊 Response Format

### Success Response

```json
{
    "success": true,
    "message": "Product created successfully",
    "data": { ... }
}
```

### Validation Error Response

```json
{
    "success": false,
    "message": "Validation failed",
    "errors": [
        {
            "field": "name",
            "message": "Product name must be at least 2 characters long"
        },
        {
            "field": "price",
            "message": "Price must be a positive number"
        }
    ]
}
```

### Authentication Error Response

```json
{
    "success": false,
    "message": "Not authorized to access this route"
}
```

## 🔍 Debug Tips

1. **Check Console Logs:** Validation middleware sẽ log ra console để debug
2. **Check Response Status:** Đảm bảo nhận đúng HTTP status code
3. **Check Response Body:** Validation errors sẽ hiển thị chi tiết field nào bị lỗi
4. **Check Headers:** Đảm bảo `Content-Type: application/json` được set

## 🚀 Quick Test

1. **Start Backend:** `npm run dev`
2. **Open Postman**
3. **Test Products API:**
    - POST `/api/v1/products` với dữ liệu không hợp lệ
    - Expected: `400 Bad Request` với validation errors
4. **Test Auth API:**
    - POST `/api/v1/auth/register` với email không hợp lệ
    - Expected: `400 Bad Request` với validation errors

## ✅ Expected Results

- ✅ Validation errors rõ ràng và cụ thể
- ✅ Response format nhất quán
- ✅ Console logs để debug
- ✅ Không còn lỗi "Validation error" mơ hồ
- ✅ Hoạt động chắc chắn với Postman

Bây giờ bạn có thể test bằng Postman và sẽ nhận được validation errors rõ ràng thay vì lỗi "Validation error" không rõ ràng như trước!
