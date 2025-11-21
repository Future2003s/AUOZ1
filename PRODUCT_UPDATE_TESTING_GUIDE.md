# Product Update Testing Guide with Postman

## Prerequisites

1. Backend server running: `npm run dev`
2. Postman installed and opened
3. Import the updated `postman-collection.json`

## Test Flow for Product Update

### Step 1: Authentication Setup

1. **Register Admin User** (if not exists)
    - Method: `POST {{baseUrl}}/auth/register`
    - Body: Admin user credentials
    - This will set `{{authToken}}` and `{{userId}}` variables

2. **Login Admin User**
    - Method: `POST {{baseUrl}}/auth/login`
    - Body: Admin credentials
    - This will update `{{authToken}}` variable

### Step 2: Get Category ID

1. **Get Categories**
    - Method: `GET {{baseUrl}}/categories`
    - This will provide category IDs for product creation
    - Manually set `{{categoryId}}` variable with a valid category ID

### Step 3: Product Lifecycle Testing

#### 3.1 Create Product

- **Endpoint**: `POST {{baseUrl}}/products`
- **Headers**:
    - `Authorization: Bearer {{authToken}}`
    - `Content-Type: application/json`
- **Body**:

```json
{
    "name": "Test Product",
    "description": "This is a test product for API testing",
    "price": 29.99,
    "sku": "TEST-001",
    "category": "{{categoryId}}",
    "trackQuantity": true,
    "quantity": 100,
    "allowBackorder": false,
    "status": "active",
    "isVisible": true,
    "isFeatured": false,
    "onSale": false,
    "requiresShipping": true,
    "tags": ["test", "api"]
}
```

- **Expected Response**: 201 Created with product data
- **Test**: Automatically sets `{{productId}}` variable

#### 3.2 Update Product

- **Endpoint**: `PUT {{baseUrl}}/products/{{productId}}`
- **Headers**:
    - `Authorization: Bearer {{authToken}}`
    - `Content-Type: application/json`
- **Body**:

```json
{
    "name": "Updated Test Product",
    "description": "This product has been updated via API",
    "price": 39.99,
    "sku": "TEST-001-UPDATED",
    "isFeatured": true,
    "onSale": true,
    "salePrice": 34.99
}
```

- **Expected Response**: 200 OK with updated product data
- **Validation**: Check that all updated fields are reflected

#### 3.3 Update Product Stock

- **Endpoint**: `PUT {{baseUrl}}/products/{{productId}}/stock`
- **Headers**:
    - `Authorization: Bearer {{authToken}}`
    - `Content-Type: application/json`
- **Body**:

```json
{
    "quantity": 150
}
```

- **Expected Response**: 200 OK with updated stock quantity

#### 3.4 Verify Updates

- **Endpoint**: `GET {{baseUrl}}/products/{{productId}}`
- **Expected Response**: 200 OK with all updated product data
- **Validation**: Verify all changes are persisted

### Step 4: Validation Testing

#### 4.1 Create Product - Validation Errors

- **Endpoint**: `POST {{baseUrl}}/products`
- **Headers**:
    - `Authorization: Bearer {{authToken}}`
    - `Content-Type: application/json`
- **Body** (Invalid data):

```json
{
    "name": "",
    "price": -10,
    "sku": ""
}
```

- **Expected Response**: 400 Bad Request with validation errors
- **Validation**: Check for specific field error messages

#### 4.2 Update Product - Validation Errors

- **Endpoint**: `PUT {{baseUrl}}/products/{{productId}}`
- **Headers**:
    - `Authorization: Bearer {{authToken}}`
    - `Content-Type: application/json`
- **Body** (Invalid data):

```json
{
    "name": "A",
    "price": -5,
    "sku": ""
}
```

- **Expected Response**: 400 Bad Request with validation errors

### Step 5: Cleanup

- **Endpoint**: `DELETE {{baseUrl}}/products/{{productId}}`
- **Headers**: `Authorization: Bearer {{authToken}}`
- **Expected Response**: 200 OK with success message

## Expected Validation Error Response Format

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
        },
        {
            "field": "sku",
            "message": "SKU is required"
        }
    ]
}
```

## Test Scenarios

### Success Scenarios

1. ✅ Update product name and description
2. ✅ Update product pricing (price, sale price)
3. ✅ Update product status (featured, on sale, visible)
4. ✅ Update product stock quantity
5. ✅ Update product tags and categories
6. ✅ Partial updates (only specific fields)

### Error Scenarios

1. ❌ Update without authentication
2. ❌ Update with invalid product ID
3. ❌ Update with validation errors
4. ❌ Update with insufficient permissions
5. ❌ Update non-existent product

### Edge Cases

1. 🔍 Update with empty strings
2. 🔍 Update with negative values
3. 🔍 Update with extremely long text
4. 🔍 Update with special characters
5. 🔍 Update with Vietnamese text (encoding test)

## Performance Testing

### Rate Limiting

- Test admin rate limiting on product updates
- Verify rate limit headers are present
- Test concurrent update requests

### Response Time

- Monitor response times for product updates
- Test with different payload sizes
- Verify caching behavior

## Security Testing

### Authentication

- Test without valid token
- Test with expired token
- Test with invalid token format

### Authorization

- Test with different user roles
- Verify admin/seller permissions
- Test cross-user access prevention

## Monitoring and Logging

### Backend Logs

- Check console logs for validation messages
- Monitor performance metrics
- Verify error handling

### Database Verification

- Confirm updates are persisted
- Check audit trails
- Verify data integrity

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check token validity and expiration
2. **400 Bad Request**: Review request body and validation rules
3. **404 Not Found**: Verify product ID exists
4. **403 Forbidden**: Check user role permissions
5. **429 Too Many Requests**: Rate limiting in effect

### Debug Steps

1. Check authentication token in headers
2. Verify request body format
3. Review backend console logs
4. Check database for product existence
5. Verify user role permissions

## Next Steps

After completing product update testing:

1. Test product deletion functionality
2. Test product search and filtering
3. Test product image management
4. Test product variant handling
5. Test bulk product operations
