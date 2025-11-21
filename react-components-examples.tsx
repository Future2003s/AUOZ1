// ===== REACT COMPONENTS EXAMPLES =====
// Các component React mẫu để kết nối với backend API

import React, { useState, useEffect } from 'react';
import { useAuth, useForm } from './react-hooks';
import { LoginRequest, RegisterRequest } from './frontend-types';

// ===== LOGIN COMPONENT =====

export const LoginForm: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [error, setError] = useState<string>('');

  const { values, errors, handleChange, handleSubmit } = useForm<LoginRequest>(
    { email: '', password: '' },
    async (formData) => {
      try {
        setError('');
        await login(formData);
        // Redirect sau khi login thành công
        window.location.href = '/dashboard';
      } catch (err: any) {
        setError(err.message || 'Đăng nhập thất bại');
      }
    }
  );

  return (
    <div className="login-form">
      <h2>Đăng Nhập</h2>
      
      {error && (
        <div className="error-message" style={{ color: 'red', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={values.email}
            onChange={(e) => handleChange('email', e.target.value)}
            required
            disabled={isLoading}
          />
          {errors.email && <span className="error">{errors.email}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="password">Mật khẩu:</label>
          <input
            type="password"
            id="password"
            value={values.password}
            onChange={(e) => handleChange('password', e.target.value)}
            required
            disabled={isLoading}
          />
          {errors.password && <span className="error">{errors.password}</span>}
        </div>

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Đang đăng nhập...' : 'Đăng Nhập'}
        </button>
      </form>
    </div>
  );
};

// ===== REGISTER COMPONENT =====

export const RegisterForm: React.FC = () => {
  const { register, isLoading } = useAuth();
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const { values, errors, handleChange, handleSubmit } = useForm<RegisterRequest>(
    {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      phone: ''
    },
    async (formData) => {
      try {
        setError('');
        setSuccess('');
        await register(formData);
        setSuccess('Đăng ký thành công! Chuyển hướng...');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2000);
      } catch (err: any) {
        setError(err.message || 'Đăng ký thất bại');
      }
    }
  );

  return (
    <div className="register-form">
      <h2>Đăng Ký Tài Khoản</h2>
      
      {error && (
        <div className="error-message" style={{ color: 'red', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {success && (
        <div className="success-message" style={{ color: 'green', marginBottom: '1rem' }}>
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="firstName">Họ:</label>
            <input
              type="text"
              id="firstName"
              value={values.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              required
              disabled={isLoading}
            />
            {errors.firstName && <span className="error">{errors.firstName}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="lastName">Tên:</label>
            <input
              type="text"
              id="lastName"
              value={values.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              required
              disabled={isLoading}
            />
            {errors.lastName && <span className="error">{errors.lastName}</span>}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={values.email}
            onChange={(e) => handleChange('email', e.target.value)}
            required
            disabled={isLoading}
          />
          {errors.email && <span className="error">{errors.email}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="phone">Số điện thoại:</label>
          <input
            type="tel"
            id="phone"
            value={values.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="+84987654321"
            disabled={isLoading}
          />
          {errors.phone && <span className="error">{errors.phone}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="password">Mật khẩu:</label>
          <input
            type="password"
            id="password"
            value={values.password}
            onChange={(e) => handleChange('password', e.target.value)}
            required
            disabled={isLoading}
            placeholder="Ít nhất 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt"
          />
          {errors.password && <span className="error">{errors.password}</span>}
        </div>

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Đang đăng ký...' : 'Đăng Ký'}
        </button>
      </form>
    </div>
  );
};

// ===== USER PROFILE COMPONENT =====

export const UserProfile: React.FC = () => {
  const { user, logout, updateProfile, isLoading } = useAuth();
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<string>('');

  const { values, errors, handleChange, handleSubmit, reset } = useForm(
    {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || ''
    },
    async (formData) => {
      try {
        await updateProfile(formData);
        setMessage('Cập nhật thông tin thành công!');
        setEditing(false);
      } catch (err: any) {
        setMessage(`Lỗi: ${err.message}`);
      }
    }
  );

  useEffect(() => {
    if (user) {
      reset();
    }
  }, [user, reset]);

  if (!user) {
    return <div>Vui lòng đăng nhập để xem thông tin cá nhân</div>;
  }

  return (
    <div className="user-profile">
      <h2>Thông Tin Cá Nhân</h2>
      
      {message && (
        <div className={`message ${message.includes('Lỗi') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      {!editing ? (
        <div className="profile-view">
          <div className="profile-info">
            <p><strong>Họ tên:</strong> {user.firstName} {user.lastName}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Số điện thoại:</strong> {user.phone || 'Chưa cập nhật'}</p>
            <p><strong>Vai trò:</strong> {user.role}</p>
            <p><strong>Trạng thái:</strong> {user.isActive ? 'Hoạt động' : 'Không hoạt động'}</p>
            <p><strong>Email đã xác thực:</strong> {user.isEmailVerified ? 'Có' : 'Không'}</p>
          </div>
          
          <div className="profile-actions">
            <button onClick={() => setEditing(true)}>Chỉnh Sửa</button>
            <button onClick={logout} className="logout-btn">Đăng Xuất</button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="profile-edit">
          <div className="form-group">
            <label htmlFor="firstName">Họ:</label>
            <input
              type="text"
              id="firstName"
              value={values.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              required
              disabled={isLoading}
            />
            {errors.firstName && <span className="error">{errors.firstName}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="lastName">Tên:</label>
            <input
              type="text"
              id="lastName"
              value={values.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              required
              disabled={isLoading}
            />
            {errors.lastName && <span className="error">{errors.lastName}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="phone">Số điện thoại:</label>
            <input
              type="tel"
              id="phone"
              value={values.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              disabled={isLoading}
            />
            {errors.phone && <span className="error">{errors.phone}</span>}
          </div>

          <div className="form-actions">
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Đang lưu...' : 'Lưu Thay Đổi'}
            </button>
            <button type="button" onClick={() => setEditing(false)}>
              Hủy
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

// ===== PROTECTED ROUTE COMPONENT =====

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  redirectTo = '/login' 
}) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Đang tải...</div>;
  }

  if (!isAuthenticated) {
    window.location.href = redirectTo;
    return null;
  }

  return <>{children}</>;
};

export default {
  LoginForm,
  RegisterForm,
  UserProfile,
  ProtectedRoute
};
