# Validation Middleware Thống Nhất

## Tổng quan

Dự án này đã được thống nhất để sử dụng chỉ **express-validator** thay vì sử dụng nhiều loại validation khác nhau (Zod, express-validator, custom validation).

## Lý do thay đổi

- **Loại bỏ lỗi validation**: Trước đây có nhiều lỗi "Validation error" không rõ ràng
- **Thống nhất codebase**: Sử dụng một loại validation duy nhất
- **Dễ bảo trì**: Không cần học nhiều syntax validation khác nhau
- **Tương thích tốt**: express-validator hoạt động tốt với Express.js

## Cấu trúc mới

### File chính

- `src/middleware/unifiedValidation.ts` - Chứa tất cả validation rules

### Các loại validation

#### 1. Product Validation

```typescript
validateCreateProduct; // Tạo sản phẩm mới
validateUpdateProduct; // Cập nhật sản phẩm
validateProductId; // Validate ID sản phẩm
```

#### 2. Auth Validation

```typescript
validateRegister; // Đăng ký
validateLogin; // Đăng nhập
validateChangePassword; // Đổi mật khẩu
validateForgotPassword; // Quên mật khẩu
validateResetPassword; // Reset mật khẩu
```

#### 3. Category Validation

```typescript
validateCategory; // Validate category data
validateCategoryId; // Validate category ID
```

#### 4. Review Validation

```typescript
validateReview; // Validate review data
validateReviewId; // Validate review ID
```

#### 5. User Validation

```typescript
validateAddress; // Validate địa chỉ
validateUserId; // Validate user ID
```

#### 6. Translation Validation

```typescript
validateTranslation; // Validate translation data
validateTranslationKey; // Validate translation key
validateBulkTranslations; // Validate bulk translations
```

#### 7. Order Validation

```typescript
validateCreateOrder; // Validate tạo đơn hàng
validateOrderId; // Validate order ID
validateOrderStatus; // Validate trạng thái đơn hàng
```

#### 8. Brand Validation

```typescript
validateCreateBrand; // Validate tạo thương hiệu
validateUpdateBrand; // Validate cập nhật thương hiệu
validateBrandId; // Validate brand ID
```

#### 9. Cart Validation

```typescript
validateAddToCart; // Validate thêm vào giỏ hàng
validateUpdateCartItem; // Validate cập nhật giỏ hàng
validateCartProductId; // Validate product ID trong giỏ hàng
```

#### 10. Admin Validation

```typescript
validateAdminAction; // Validate hành động admin
```

#### 11. Common Validation

```typescript
validatePagination; // Validate phân trang
validateSearchQuery; // Validate tìm kiếm
```

## Cách sử dụng

### Trong Routes

```typescript
import { validateCreateProduct, validateUpdateProduct } from "../middleware/unifiedValidation";

// Tạo sản phẩm
router.post("/", protect, authorize("admin"), validateCreateProduct, createProduct);

// Cập nhật sản phẩm
router.put("/:id", protect, authorize("admin"), validateUpdateProduct, updateProduct);
```

### Validation Rules

```typescript
// Ví dụ: validateCreateProduct
export const validateCreateProduct = [
    body("name").trim().isLength({ min: 2, max: 200 }).withMessage("Product name must be between 2 and 200 characters"),
    body("price").isFloat({ min: 0 }).withMessage("Price must be a positive number"),
    body("sku").trim().notEmpty().withMessage("SKU is required"),
    handleValidationErrors
];
```

## Response Format

Khi validation thất bại, API sẽ trả về:

```json
{
    "success": false,
    "message": "Validation error",
    "errors": [
        {
            "field": "name",
            "message": "Product name must be between 2 and 200 characters"
        },
        {
            "field": "price",
            "message": "Price must be a positive number"
        }
    ]
}
```

## Lợi ích

1. **Lỗi rõ ràng**: Mỗi field có message lỗi cụ thể
2. **Dễ debug**: Biết chính xác field nào bị lỗi
3. **Thống nhất**: Tất cả API đều có format lỗi giống nhau
4. **Dễ mở rộng**: Thêm validation rules mới dễ dàng

## Test

### Test từng API riêng lẻ

```bash
# Test API update sản phẩm
node test-update-product-unified.js

# Test tất cả APIs
node test-all-apis-unified.js
```

### Scripts test có sẵn

- `test-update-product-unified.js` - Test API update sản phẩm
- `test-all-apis-unified.js` - Test tất cả các APIs

### Các test cases bao gồm

- Validation khi thiếu dữ liệu
- Validation khi dữ liệu không hợp lệ
- Authentication và Authorization
- Response format mới
- Error handling

## APIs đã được cập nhật

### ✅ Đã hoàn thành

1. **Products** (`/api/v1/products`) - CRUD với validation
2. **Categories** (`/api/v1/categories`) - CRUD với validation
3. **Brands** (`/api/v1/brands`) - CRUD với validation
4. **Reviews** (`/api/v1/reviews`) - CRUD với validation
5. **Users** (`/api/v1/users`) - Profile và địa chỉ với validation
6. **Cart** (`/api/v1/cart`) - Thêm/sửa/xóa với validation
7. **Orders** (`/api/v1/orders`) - Tạo và cập nhật với validation
8. **Admin** (`/api/v1/admin`) - Quản lý với validation
9. **Analytics** (`/api/v1/analytics`) - Thống kê với validation
10. **Performance** (`/api/v1/performance`) - Hiệu suất với validation
11. **Auth** (`/api/v1/auth`) - Đăng ký/đăng nhập với validation
12. **Translations** (`/api/v1/translations`) - Đa ngôn ngữ với validation

### 🔧 Validation Rules áp dụng

- **Required fields**: Kiểm tra các trường bắt buộc
- **Length validation**: Độ dài tối thiểu/tối đa
- **Type validation**: Kiểm tra kiểu dữ liệu (email, number, etc.)
- **Range validation**: Giá trị trong khoảng cho phép
- **Format validation**: Định dạng hợp lệ (URL, MongoDB ID, etc.)
- **Array validation**: Kiểm tra mảng và phần tử con

## Migration

### Đã loại bỏ

- `src/middleware/zodValidation.ts`
- `src/middleware/validation.ts` (cũ)
- `src/middleware/simpleValidation.ts`
- `src/schemas/validation.ts`
- `src/schemas/translationValidation.ts`
- Dependency `zod` trong package.json

### Đã cập nhật

- Tất cả routes sử dụng validation mới
- Response format thống nhất
- Error handling cải thiện
- Validation rules chi tiết cho từng API

## Cấu trúc thư mục sau khi cập nhật

```
src/
├── middleware/
│   ├── unifiedValidation.ts    # ✅ Validation thống nhất
│   ├── auth.ts                 # ✅ Authentication
│   ├── rateLimiting.ts         # ✅ Rate limiting
│   └── compression.ts          # ✅ Caching
├── routes/
│   ├── products.ts             # ✅ Đã cập nhật
│   ├── categories.ts           # ✅ Đã cập nhật
│   ├── brands.ts               # ✅ Đã cập nhật
│   ├── reviews.ts              # ✅ Đã cập nhật
│   ├── users.ts                # ✅ Đã cập nhật
│   ├── cart.ts                 # ✅ Đã cập nhật
│   ├── orders.ts               # ✅ Đã cập nhật
│   ├── admin.ts                # ✅ Đã cập nhật
│   ├── analytics.ts            # ✅ Đã cập nhật
│   ├── performance.ts          # ✅ Đã cập nhật
│   ├── auth.ts                 # ✅ Đã cập nhật
│   └── translations.ts         # ✅ Đã cập nhật
└── controllers/                # ✅ Sẵn sàng với validation
```

## Lưu ý

- Đảm bảo backend đang chạy trước khi test
- Thay các ID test bằng ID thực tế trong database
- Để test thành công với token thật, cần JWT token hợp lệ
- Tất cả APIs giờ đây đều có validation thống nhất
- Response format lỗi rõ ràng và dễ debug

## Kết quả

🎉 **Dự án đã hoàn toàn được thống nhất validation!**

- ✅ Loại bỏ tất cả lỗi "Validation error" không rõ ràng
- ✅ Sử dụng chỉ express-validator duy nhất
- ✅ Tất cả 12+ APIs đều có validation
- ✅ Response format thống nhất và rõ ràng
- ✅ Dễ bảo trì và mở rộng
- ✅ Test scripts đầy đủ
- ✅ Documentation chi tiết
