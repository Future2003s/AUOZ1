# 🚀 Frontend Integration Guide

## 📁 File Structure

```
src/
├── api/
│   ├── frontend-types.ts      # TypeScript types
│   ├── api-client.ts          # API client
│   ├── validation-utils.ts    # Validation utilities
│   └── react-hooks.tsx        # React hooks
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── ChangePasswordForm.tsx
│   └── user/
│       └── UserProfile.tsx
└── App.tsx
```

## 🔧 Setup Instructions

### 1. Install Dependencies

```bash
npm install react react-dom @types/react @types/react-dom
```

### 2. Copy Files to Your Project

Copy these files to your React project:
- `frontend-types.ts` → `src/api/types.ts`
- `api-client.ts` → `src/api/client.ts`
- `validation-utils.ts` → `src/api/validation.ts`
- `react-hooks.tsx` → `src/hooks/auth.tsx`
- `example-components.tsx` → `src/components/auth/`

### 3. Setup App.tsx

```tsx
import React from 'react';
import { AuthProvider } from './hooks/auth';
import { LoginForm, RegisterForm, UserProfile } from './components/auth';

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto pt-8">
          <AuthenticatedApp />
        </div>
      </div>
    </AuthProvider>
  );
}

function AuthenticatedApp() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="text-center">Loading...</div>;
  }

  return isAuthenticated ? <UserProfile /> : <LoginForm />;
}

export default App;
```

## 🎯 Usage Examples

### Basic Authentication

```tsx
import { useAuth } from '../hooks/auth';

function MyComponent() {
  const { user, login, logout, isAuthenticated } = useAuth();

  const handleLogin = async () => {
    try {
      await login({ email: 'user@example.com', password: 'password' });
      console.log('Login successful!');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div>
      {isAuthenticated ? (
        <div>
          <p>Welcome, {user?.fullName}!</p>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <button onClick={handleLogin}>Login</button>
      )}
    </div>
  );
}
```

### API Calls

```tsx
import api from '../api/client';

function UserManagement() {
  const [addresses, setAddresses] = useState([]);

  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        const response = await api.user.getAddresses();
        setAddresses(response.data || []);
      } catch (error) {
        console.error('Failed to fetch addresses:', error);
      }
    };

    fetchAddresses();
  }, []);

  const addAddress = async (addressData) => {
    try {
      await api.user.addAddress(addressData);
      // Refresh addresses
      const response = await api.user.getAddresses();
      setAddresses(response.data || []);
    } catch (error) {
      console.error('Failed to add address:', error);
    }
  };

  return (
    <div>
      {/* Address list and form */}
    </div>
  );
}
```

### Form Validation

```tsx
import { useForm } from '../hooks/auth';
import { validateLoginForm } from '../api/validation';

function LoginForm() {
  const { login } = useAuth();

  const { values, errors, isLoading, handleChange, handleSubmit } = useForm(
    { email: '', password: '' },
    async (data) => {
      const validationErrors = validateLoginForm(data);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors[0].message);
      }
      await login(data);
    }
  );

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={values.email}
        onChange={(e) => handleChange('email', e.target.value)}
        placeholder="Email"
      />
      {errors.email && <span className="error">{errors.email}</span>}
      
      <input
        type="password"
        value={values.password}
        onChange={(e) => handleChange('password', e.target.value)}
        placeholder="Password"
      />
      {errors.password && <span className="error">{errors.password}</span>}
      
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

### Address Management

```tsx
import { useAddresses } from '../hooks/auth';

function AddressManager() {
  const { 
    addresses, 
    isLoading, 
    addAddress, 
    updateAddress, 
    deleteAddress, 
    setDefaultAddress 
  } = useAddresses();

  const handleAddAddress = async (addressData) => {
    try {
      await addAddress(addressData);
      alert('Address added successfully!');
    } catch (error) {
      alert('Failed to add address');
    }
  };

  if (isLoading) return <div>Loading addresses...</div>;

  return (
    <div>
      <h3>Your Addresses</h3>
      {addresses?.map((address) => (
        <div key={address._id} className="address-card">
          <p>{address.street}, {address.city}</p>
          <p>{address.state} {address.zipCode}, {address.country}</p>
          {address.isDefault && <span className="badge">Default</span>}
          
          <button onClick={() => setDefaultAddress(address._id!)}>
            Set as Default
          </button>
          <button onClick={() => deleteAddress(address._id!)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
```

## 🔐 Authentication Flow

### 1. Login Process
```tsx
const { login } = useAuth();

// User submits login form
await login({ email: 'user@example.com', password: 'password' });

// Automatically:
// - Stores JWT token in localStorage
// - Sets user in context
// - Redirects to authenticated area
```

### 2. Token Management
```tsx
// Token is automatically included in all API requests
// Refresh token is handled automatically on expiration

// Manual token operations
api.setToken('your-jwt-token');
const currentToken = api.getToken();
```

### 3. Protected Routes
```tsx
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  
  return children;
}
```

## 🎨 Styling

The examples use Tailwind CSS classes. You can:

1. **Use Tailwind CSS**: Install and configure Tailwind
2. **Use CSS Modules**: Replace classes with your CSS modules
3. **Use Styled Components**: Convert to styled-components
4. **Use Material-UI**: Replace with MUI components

## 🔧 Configuration

### Environment Variables
```env
REACT_APP_API_URL=http://localhost:8081/api/v1
REACT_APP_APP_NAME=Your App Name
```

### API Client Configuration
```tsx
// In api-client.ts
const apiClient = new ApiClient(process.env.REACT_APP_API_URL);
```

## 🧪 Testing

### Unit Tests
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthProvider } from '../hooks/auth';
import LoginForm from '../components/LoginForm';

test('login form submission', async () => {
  render(
    <AuthProvider>
      <LoginForm />
    </AuthProvider>
  );

  fireEvent.change(screen.getByPlaceholderText('Email'), {
    target: { value: 'test@example.com' }
  });
  
  fireEvent.change(screen.getByPlaceholderText('Password'), {
    target: { value: 'password123' }
  });

  fireEvent.click(screen.getByText('Login'));

  // Assert login behavior
});
```

## 🚀 Production Deployment

### Build Optimization
```bash
npm run build
```

### Environment Setup
```env
REACT_APP_API_URL=https://your-api-domain.com/api/v1
```

### Security Considerations
- Use HTTPS in production
- Implement proper CORS settings
- Set secure token storage
- Add rate limiting on frontend

## 📚 Additional Resources

- [React Documentation](https://reactjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Hook Form](https://react-hook-form.com/) (alternative form library)

## 🆘 Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure backend CORS is configured for your frontend domain
2. **Token Expiration**: Implement automatic token refresh
3. **Network Errors**: Add proper error handling and retry logic
4. **Type Errors**: Ensure all types are properly imported

### Debug Mode
```tsx
// Enable debug logging
localStorage.setItem('debug', 'api:*');
```
