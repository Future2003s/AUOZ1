// ===== MAIN APP COMPONENT =====
// Ứng dụng React chính kết nối với backend API

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './react-hooks';
import { 
  LoginForm, 
  RegisterForm, 
  UserProfile, 
  ProtectedRoute 
} from './react-components-examples';
import './components.css';

// ===== NAVIGATION COMPONENT =====

const Navigation: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <nav style={{ 
      background: '#007bff', 
      padding: '1rem', 
      color: 'white',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <h1 style={{ margin: 0 }}>My App</h1>
      
      {isAuthenticated ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span>Xin chào, {user?.firstName}!</span>
          <button 
            onClick={logout}
            style={{ 
              background: 'transparent', 
              border: '1px solid white',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer',
              width: 'auto',
              margin: 0
            }}
          >
            Đăng xuất
          </button>
        </div>
      ) : (
        <div>Chưa đăng nhập</div>
      )}
    </nav>
  );
};

// ===== MAIN APP CONTENT =====

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<'login' | 'register' | 'profile'>('login');

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>Đang tải...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div>
        <Navigation />
        
        <div style={{ padding: '2rem' }}>
          <div style={{ 
            textAlign: 'center', 
            marginBottom: '2rem',
            display: 'flex',
            justifyContent: 'center',
            gap: '1rem'
          }}>
            <button
              onClick={() => setCurrentView('login')}
              style={{
                background: currentView === 'login' ? '#007bff' : '#6c757d',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                cursor: 'pointer',
                width: 'auto',
                margin: 0
              }}
            >
              Đăng Nhập
            </button>
            
            <button
              onClick={() => setCurrentView('register')}
              style={{
                background: currentView === 'register' ? '#007bff' : '#6c757d',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                cursor: 'pointer',
                width: 'auto',
                margin: 0
              }}
            >
              Đăng Ký
            </button>
          </div>

          {currentView === 'login' && <LoginForm />}
          {currentView === 'register' && <RegisterForm />}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navigation />
      
      <ProtectedRoute>
        <div style={{ padding: '2rem' }}>
          <div style={{ 
            textAlign: 'center', 
            marginBottom: '2rem',
            display: 'flex',
            justifyContent: 'center',
            gap: '1rem'
          }}>
            <button
              onClick={() => setCurrentView('profile')}
              style={{
                background: currentView === 'profile' ? '#007bff' : '#6c757d',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                cursor: 'pointer',
                width: 'auto',
                margin: 0
              }}
            >
              Thông Tin Cá Nhân
            </button>
          </div>

          {currentView === 'profile' && <UserProfile />}
        </div>
      </ProtectedRoute>
    </div>
  );
};

// ===== MAIN APP COMPONENT =====

const App: React.FC = () => {
  return (
    <AuthProvider>
      <div className="App">
        <AppContent />
      </div>
    </AuthProvider>
  );
};

export default App;
