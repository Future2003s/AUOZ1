# 🔐 Authentication & User Management API Documentation

## Base URL

```
http://localhost:8081/api/v1
```

## 🚀 Quick Test

```bash
curl -X GET http://localhost:8081/health
curl -X GET http://localhost:8081/api/v1/test
```

## 📋 Authentication Endpoints

### 1. Register User

**POST** `/auth/register`

**Request Body:**

```json
{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "password": "Password123",
    "phone": "+1234567890" // optional
}
```

**Response:**

```json
{
    "success": true,
    "message": "User registered successfully. Please check your email for verification.",
    "data": {
        "user": {
            "_id": "user_id",
            "firstName": "John",
            "lastName": "Doe",
            "email": "john@example.com",
            "role": "customer",
            "isActive": true,
            "isEmailVerified": false
        },
        "token": "jwt_token",
        "refreshToken": "refresh_token"
    }
}
```

### 2. Login User

**POST** `/auth/login`

**Request Body:**

```json
{
    "email": "john@example.com",
    "password": "Password123"
}
```

**Response:**

```json
{
    "success": true,
    "message": "Login successful",
    "data": {
        "user": {
            "_id": "user_id",
            "firstName": "John",
            "lastName": "Doe",
            "email": "john@example.com",
            "role": "customer",
            "lastLogin": "2025-08-17T10:30:00.000Z"
        },
        "token": "jwt_token",
        "refreshToken": "refresh_token"
    }
}
```

### 3. Get Current User

**GET** `/auth/me`

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response:**

```json
{
    "success": true,
    "message": "User profile retrieved successfully",
    "data": {
        "_id": "user_id",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "role": "customer",
        "addresses": [],
        "preferences": {
            "language": "en",
            "currency": "USD",
            "notifications": {
                "email": true,
                "sms": false,
                "push": true
            }
        }
    }
}
```

### 4. Change Password

**PUT** `/auth/change-password`

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Request Body:**

```json
{
    "currentPassword": "OldPassword123",
    "newPassword": "NewPassword123"
}
```

**Response:**

```json
{
    "success": true,
    "message": "Password changed successfully"
}
```

### 5. Forgot Password

**POST** `/auth/forgot-password`

**Request Body:**

```json
{
    "email": "john@example.com"
}
```

**Response:**

```json
{
    "success": true,
    "message": "Password reset email sent"
}
```

### 6. Reset Password

**PUT** `/auth/reset-password/:token`

**Request Body:**

```json
{
    "password": "NewPassword123"
}
```

**Response:**

```json
{
    "success": true,
    "message": "Password reset successful",
    "data": {
        "user": {
            /* user object */
        },
        "token": "new_jwt_token",
        "refreshToken": "new_refresh_token"
    }
}
```

### 7. Verify Email

**GET** `/auth/verify-email/:token`

**Response:**

```json
{
    "success": true,
    "message": "Email verified successfully"
}
```

### 8. Refresh Token

**POST** `/auth/refresh-token`

**Request Body:**

```json
{
    "refreshToken": "refresh_token"
}
```

**Response:**

```json
{
    "success": true,
    "message": "Token refreshed successfully",
    "data": {
        "token": "new_jwt_token",
        "refreshToken": "new_refresh_token"
    }
}
```

## 👤 User Management Endpoints

### 1. Get User Profile

**GET** `/users/profile`

**Headers:**

```
Authorization: Bearer <jwt_token>
```

### 2. Update User Profile

**PUT** `/users/profile`

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Request Body:**

```json
{
    "firstName": "John Updated",
    "lastName": "Doe Updated",
    "phone": "+1234567890"
}
```

### 3. Get User Addresses

**GET** `/users/addresses`

**Headers:**

```
Authorization: Bearer <jwt_token>
```

### 4. Add Address

**POST** `/users/addresses`

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Request Body:**

```json
{
    "type": "home",
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA",
    "isDefault": true
}
```

### 5. Update Address

**PUT** `/users/addresses/:addressId`

**Headers:**

```
Authorization: Bearer <jwt_token>
```

### 6. Delete Address

**DELETE** `/users/addresses/:addressId`

**Headers:**

```
Authorization: Bearer <jwt_token>
```

### 7. Set Default Address

**PUT** `/users/addresses/:addressId/default`

**Headers:**

```
Authorization: Bearer <jwt_token>
```

## 🔒 Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## 📝 Validation Rules

### Password Requirements:

- Minimum 6 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

### Email:

- Valid email format
- Unique (for registration)

## ❌ Error Responses

```json
{
    "success": false,
    "error": "Error message here"
}
```

Common HTTP Status Codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

## 🧪 Testing with cURL

### Register a new user:

```bash
curl -X POST http://localhost:8081/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "password": "Password123"
  }'
```

### Login:

```bash
curl -X POST http://localhost:8081/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "Password123"
  }'
```

### Get user profile (replace TOKEN with actual JWT):

```bash
curl -X GET http://localhost:8081/api/v1/auth/me \
  -H "Authorization: Bearer TOKEN"
```

## 📊 Database Requirements

To use these APIs with a real database:

1. **Install MongoDB:**

    ```bash
    # Windows (with Chocolatey)
    choco install mongodb

    # macOS (with Homebrew)
    brew install mongodb-community

    # Ubuntu
    sudo apt install mongodb
    ```

2. **Start MongoDB:**

    ```bash
    mongod
    ```

3. **Update .env file:**

    ```env
    DATABASE_URI=mongodb://localhost:27017/ecommerce
    ```

4. **Restart the server:**
    ```bash
    npm run dev
    ```

## 🚀 Next Steps

1. Set up MongoDB for persistent data storage
2. Implement email service for verification/reset emails
3. Add Redis for session management and caching
4. Implement file upload for user avatars
5. Add rate limiting for security
6. Set up comprehensive testing
