// ===== REACT HOOKS FOR AUTHENTICATION =====

import { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { 
  User, 
  AuthContextType, 
  LoginRequest, 
  RegisterRequest, 
  UpdateProfileRequest, 
  ChangePasswordRequest 
} from './frontend-types';
import api from './api-client';

// ===== AUTH CONTEXT =====

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// ===== AUTH PROVIDER =====

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!token;

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = api.getToken();
      if (savedToken) {
        try {
          const response = await api.auth.getMe();
          if (response.success && response.data) {
            setUser(response.data);
            setToken(savedToken);
          } else {
            // Invalid token, clear it
            api.setToken(null);
          }
        } catch (error) {
          console.error('Failed to get user info:', error);
          api.setToken(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  // Login function
  const login = async (credentials: LoginRequest): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await api.auth.login(credentials);
      if (response.success && response.data) {
        setUser(response.data.user);
        setToken(response.data.token);
        
        // Store refresh token
        localStorage.setItem('refreshToken', response.data.refreshToken);
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (userData: RegisterRequest): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await api.auth.register(userData);
      if (response.success && response.data) {
        setUser(response.data.user);
        setToken(response.data.token);
        
        // Store refresh token
        localStorage.setItem('refreshToken', response.data.refreshToken);
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      await api.auth.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setToken(null);
      api.setToken(null);
      localStorage.removeItem('refreshToken');
    }
  };

  // Update profile function
  const updateProfile = async (data: UpdateProfileRequest): Promise<void> => {
    try {
      const response = await api.user.updateProfile(data);
      if (response.success && response.data) {
        setUser(response.data);
      } else {
        throw new Error(response.message || 'Profile update failed');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  };

  // Change password function
  const changePassword = async (data: ChangePasswordRequest): Promise<void> => {
    try {
      const response = await api.auth.changePassword(data);
      if (!response.success) {
        throw new Error(response.message || 'Password change failed');
      }
    } catch (error) {
      console.error('Password change error:', error);
      throw error;
    }
  };

  // Refresh token function
  const refreshToken = async (): Promise<void> => {
    const savedRefreshToken = localStorage.getItem('refreshToken');
    if (!savedRefreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await api.auth.refreshToken(savedRefreshToken);
      if (response.success && response.data) {
        setToken(response.data.token);
        localStorage.setItem('refreshToken', response.data.refreshToken);
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      // If refresh fails, logout user
      logout();
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ===== CUSTOM HOOKS =====

// Hook for form handling
export const useForm = <T extends Record<string, any>>(
  initialValues: T,
  onSubmit: (values: T) => Promise<void>
) => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (name: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name as string]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsLoading(true);
    setIsSubmitted(true);
    setErrors({});

    try {
      await onSubmit(values);
    } catch (error: any) {
      console.error('Form submission error:', error);
      
      // Handle validation errors
      if (error.message) {
        setErrors({ general: error.message });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
    setIsLoading(false);
    setIsSubmitted(false);
  };

  return {
    values,
    errors,
    isLoading,
    isSubmitted,
    handleChange,
    handleSubmit,
    reset,
    setErrors,
  };
};

// Hook for API calls
export const useApi = <T,>(
  apiCall: () => Promise<T>,
  dependencies: any[] = []
) => {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const execute = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await apiCall();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    execute();
  }, dependencies);

  return { data, error, isLoading, refetch: execute };
};

// Hook for user addresses
export const useAddresses = () => {
  const { data, error, isLoading, refetch } = useApi(
    () => api.user.getAddresses().then(res => res.data || [])
  );

  const addAddress = async (addressData: any) => {
    await api.user.addAddress(addressData);
    refetch();
  };

  const updateAddress = async (addressId: string, addressData: any) => {
    await api.user.updateAddress(addressId, addressData);
    refetch();
  };

  const deleteAddress = async (addressId: string) => {
    await api.user.deleteAddress(addressId);
    refetch();
  };

  const setDefaultAddress = async (addressId: string) => {
    await api.user.setDefaultAddress(addressId);
    refetch();
  };

  return {
    addresses: data,
    error,
    isLoading,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    refetch,
  };
};
