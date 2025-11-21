# 🚀 Hướng Dẫn Kết Nối Frontend với Backend API

## 📋 **Tổng Quan**

Hướng dẫn này sẽ giúp bạn kết nối frontend React với backend Node.js API đã được tạo. Tất cả các file cần thiết đã được tạo sẵn và sẵn sàng sử dụng.

---

## 📁 **Cấu Trúc File**

```
frontend/
├── api-client.ts              # API client để gọi backend
├── frontend-types.ts          # TypeScript types
├── react-hooks.tsx           # React hooks cho authentication
├── react-components-examples.tsx # Các component React mẫu
├── components.css            # CSS styles
├── App.tsx                   # Component chính
└── FRONTEND_INTEGRATION_GUIDE.md # Hướng dẫn này
```

---

## 🔧 **Cài Đặt và Cấu Hình**

### 1. **Cài Đặt Dependencies**

```bash
# Cài đặt React và TypeScript (nếu chưa có)
npm install react react-dom typescript @types/react @types/react-dom

# Hoặc với Yarn
yarn add react react-dom typescript @types/react @types/react-dom
```

### 2. **Copy Files vào Project React**

Copy tất cả các file đã tạo vào thư mục `src/` của project React:

```bash
# Copy các file vào src/
cp api-client.ts src/
cp frontend-types.ts src/
cp react-hooks.tsx src/
cp react-components-examples.tsx src/
cp components.css src/
cp App.tsx src/
```

### 3. **Cập Nhật URL Backend**

Trong file `api-client.ts`, đảm bảo URL backend đúng:

```typescript
// Thay đổi URL này nếu backend chạy trên port khác
const apiClient = new ApiClient('http://localhost:8081/api/v1');
```

---

## 🎯 **Cách Sử Dụng**

### 1. **Khởi Tạo App**

```typescript
// src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### 2. **Sử Dụng Authentication**

```typescript
import { useAuth } from './react-hooks';

const MyComponent = () => {
  const { user, login, logout, isAuthenticated, isLoading } = useAuth();

  const handleLogin = async () => {
    try {
      await login({ email: 'user@example.com', password: 'password' });
      console.log('Đăng nhập thành công!');
    } catch (error) {
      console.error('Lỗi đăng nhập:', error);
    }
  };

  if (isLoading) return <div>Đang tải...</div>;

  return (
    <div>
      {isAuthenticated ? (
        <div>
          <h1>Xin chào, {user?.firstName}!</h1>
          <button onClick={logout}>Đăng xuất</button>
        </div>
      ) : (
        <button onClick={handleLogin}>Đăng nhập</button>
      )}
    </div>
  );
};
```

### 3. **Sử Dụng API Client Trực Tiếp**

```typescript
import api from './api-client';

// Đăng ký user mới
const registerUser = async () => {
  try {
    const response = await api.auth.register({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'SecureP@ssw0rd123!',
      phone: '+84987654321'
    });
    
    if (response.success) {
      console.log('Đăng ký thành công:', response.data);
    }
  } catch (error) {
    console.error('Lỗi đăng ký:', error);
  }
};

// Lấy thông tin user hiện tại
const getCurrentUser = async () => {
  try {
    const response = await api.auth.getMe();
    if (response.success) {
      console.log('User info:', response.data);
    }
  } catch (error) {
    console.error('Lỗi lấy thông tin user:', error);
  }
};
```

---

## 🔐 **Authentication Flow**

### 1. **Đăng Ký**
```typescript
const { register } = useAuth();

const handleRegister = async (formData) => {
  try {
    await register({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      password: formData.password,
      phone: formData.phone
    });
    // User được tự động đăng nhập sau khi đăng ký thành công
  } catch (error) {
    console.error('Đăng ký thất bại:', error.message);
  }
};
```

### 2. **Đăng Nhập**
```typescript
const { login } = useAuth();

const handleLogin = async (credentials) => {
  try {
    await login({
      email: credentials.email,
      password: credentials.password
    });
    // Token được tự động lưu và user được authenticate
  } catch (error) {
    console.error('Đăng nhập thất bại:', error.message);
  }
};
```

### 3. **Đăng Xuất**
```typescript
const { logout } = useAuth();

const handleLogout = async () => {
  await logout();
  // Token được xóa và user được logout
};
```

---

## 🛡️ **Protected Routes**

```typescript
import { ProtectedRoute } from './react-components-examples';

const App = () => {
  return (
    <div>
      {/* Public routes */}
      <Route path="/login" component={LoginForm} />
      <Route path="/register" component={RegisterForm} />
      
      {/* Protected routes */}
      <ProtectedRoute>
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/profile" component={UserProfile} />
      </ProtectedRoute>
    </div>
  );
};
```

---

## 📝 **Form Handling**

```typescript
import { useForm } from './react-hooks';

const MyForm = () => {
  const { values, errors, handleChange, handleSubmit, isLoading } = useForm(
    { name: '', email: '' }, // Initial values
    async (formData) => {
      // Submit handler
      const response = await api.user.updateProfile(formData);
      if (response.success) {
        alert('Cập nhật thành công!');
      }
    }
  );

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={values.name}
        onChange={(e) => handleChange('name', e.target.value)}
        placeholder="Tên"
      />
      {errors.name && <span className="error">{errors.name}</span>}
      
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Đang lưu...' : 'Lưu'}
      </button>
    </form>
  );
};
```

---

## 🎨 **Styling**

File `components.css` đã bao gồm:
- ✅ Responsive design
- ✅ Form styling
- ✅ Button states
- ✅ Error/success messages
- ✅ Loading states
- ✅ Accessibility features

---

## 🔧 **Customization**

### 1. **Thay Đổi API Base URL**
```typescript
// Trong api-client.ts
const apiClient = new ApiClient('https://your-api-domain.com/api/v1');
```

### 2. **Thêm API Endpoints Mới**
```typescript
// Trong api-client.ts
export class ProductAPI {
  constructor(private client: ApiClient) {}

  async getProducts(): Promise<ApiResponse<Product[]>> {
    return this.client.get<Product[]>('/products');
  }

  async createProduct(data: CreateProductRequest): Promise<ApiResponse<Product>> {
    return this.client.post<Product>('/products', data);
  }
}

// Thêm vào main api object
export const api = {
  auth: new AuthAPI(apiClient),
  user: new UserAPI(apiClient),
  products: new ProductAPI(apiClient), // Thêm dòng này
};
```

### 3. **Custom Hooks**
```typescript
// Hook để lấy danh sách products
export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await api.products.getProducts();
        if (response.success) {
          setProducts(response.data || []);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return { products, loading };
};
```

---

## 🚀 **Deployment**

### 1. **Build cho Production**
```bash
npm run build
```

### 2. **Environment Variables**
```bash
# .env.production
REACT_APP_API_URL=https://your-production-api.com/api/v1
```

### 3. **Update API Client**
```typescript
const apiClient = new ApiClient(
  process.env.REACT_APP_API_URL || 'http://localhost:8081/api/v1'
);
```

---

## 🐛 **Troubleshooting**

### 1. **CORS Issues**
Đảm bảo backend đã cấu hình CORS cho frontend domain:
```javascript
// Backend: src/middleware/cors.ts
app.use(cors({
  origin: ['http://localhost:3000', 'https://your-frontend-domain.com'],
  credentials: true
}));
```

### 2. **Token Expiration**
API client tự động handle token refresh. Nếu refresh thất bại, user sẽ được redirect về login.

### 3. **Network Errors**
API client có retry logic cho network errors và rate limiting.

---

## 📞 **Hỗ Trợ**

Nếu gặp vấn đề:
1. Kiểm tra console browser để xem error messages
2. Kiểm tra Network tab để xem API calls
3. Đảm bảo backend đang chạy trên đúng port
4. Kiểm tra CORS configuration

---

**🎉 Chúc bạn thành công với việc kết nối frontend và backend!**
