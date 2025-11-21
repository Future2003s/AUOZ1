// ===== API CLIENT FOR FRONTEND =====

import { 
  ApiResponse, 
  ApiError, 
  AuthResponse, 
  LoginRequest, 
  RegisterRequest,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  RefreshTokenRequest,
  RefreshTokenResponse,
  UpdateProfileRequest,
  AddAddressRequest,
  UpdateAddressRequest,
  UpdatePreferencesRequest,
  User,
  Address,
  API_ENDPOINTS,
  HTTP_STATUS
} from './frontend-types';

// ===== BASE API CLIENT =====

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = 'http://localhost:8081/api/v1') {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('authToken');
  }

  // Set authentication token
  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  // Get authentication token
  getToken(): string | null {
    return this.token || localStorage.getItem('authToken');
  }

  // Make HTTP request
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getToken();

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // GET request
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  // POST request
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT request
  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// ===== AUTH API =====

export class AuthAPI {
  constructor(private client: ApiClient) {}

  // Register new user
  async register(userData: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    const response = await this.client.post<AuthResponse>(
      API_ENDPOINTS.AUTH.REGISTER,
      userData
    );
    
    if (response.data?.token) {
      this.client.setToken(response.data.token);
    }
    
    return response;
  }

  // Login user
  async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    const response = await this.client.post<AuthResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials
    );
    
    if (response.data?.token) {
      this.client.setToken(response.data.token);
    }
    
    return response;
  }

  // Logout user
  async logout(): Promise<ApiResponse<null>> {
    const response = await this.client.post<null>(API_ENDPOINTS.AUTH.LOGOUT);
    this.client.setToken(null);
    return response;
  }

  // Get current user
  async getMe(): Promise<ApiResponse<User>> {
    return this.client.get<User>(API_ENDPOINTS.AUTH.ME);
  }

  // Change password
  async changePassword(data: ChangePasswordRequest): Promise<ApiResponse<null>> {
    return this.client.put<null>(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, data);
  }

  // Forgot password
  async forgotPassword(data: ForgotPasswordRequest): Promise<ApiResponse<null>> {
    return this.client.post<null>(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, data);
  }

  // Reset password
  async resetPassword(token: string, data: ResetPasswordRequest): Promise<ApiResponse<AuthResponse>> {
    const response = await this.client.put<AuthResponse>(
      `${API_ENDPOINTS.AUTH.RESET_PASSWORD}/${token}`,
      data
    );
    
    if (response.data?.token) {
      this.client.setToken(response.data.token);
    }
    
    return response;
  }

  // Verify email
  async verifyEmail(token: string): Promise<ApiResponse<null>> {
    return this.client.get<null>(`${API_ENDPOINTS.AUTH.VERIFY_EMAIL}/${token}`);
  }

  // Resend verification email
  async resendVerification(email: string): Promise<ApiResponse<null>> {
    return this.client.post<null>(API_ENDPOINTS.AUTH.RESEND_VERIFICATION, { email });
  }

  // Refresh token
  async refreshToken(refreshToken: string): Promise<ApiResponse<RefreshTokenResponse>> {
    const response = await this.client.post<RefreshTokenResponse>(
      API_ENDPOINTS.AUTH.REFRESH_TOKEN,
      { refreshToken }
    );
    
    if (response.data?.token) {
      this.client.setToken(response.data.token);
    }
    
    return response;
  }
}

// ===== USER API =====

export class UserAPI {
  constructor(private client: ApiClient) {}

  // Get user profile
  async getProfile(): Promise<ApiResponse<User>> {
    return this.client.get<User>(API_ENDPOINTS.USERS.PROFILE);
  }

  // Update user profile
  async updateProfile(data: UpdateProfileRequest): Promise<ApiResponse<User>> {
    return this.client.put<User>(API_ENDPOINTS.USERS.PROFILE, data);
  }

  // Get user addresses
  async getAddresses(): Promise<ApiResponse<Address[]>> {
    return this.client.get<Address[]>(API_ENDPOINTS.USERS.ADDRESSES);
  }

  // Add new address
  async addAddress(data: AddAddressRequest): Promise<ApiResponse<Address[]>> {
    return this.client.post<Address[]>(API_ENDPOINTS.USERS.ADDRESSES, data);
  }

  // Update address
  async updateAddress(addressId: string, data: UpdateAddressRequest): Promise<ApiResponse<Address[]>> {
    return this.client.put<Address[]>(
      `${API_ENDPOINTS.USERS.ADDRESS_BY_ID}/${addressId}`,
      data
    );
  }

  // Delete address
  async deleteAddress(addressId: string): Promise<ApiResponse<null>> {
    return this.client.delete<null>(`${API_ENDPOINTS.USERS.ADDRESS_BY_ID}/${addressId}`);
  }

  // Set default address
  async setDefaultAddress(addressId: string): Promise<ApiResponse<Address[]>> {
    return this.client.put<Address[]>(
      `${API_ENDPOINTS.USERS.SET_DEFAULT_ADDRESS}/${addressId}/default`
    );
  }

  // Update preferences
  async updatePreferences(data: UpdatePreferencesRequest): Promise<ApiResponse<any>> {
    return this.client.put<any>(API_ENDPOINTS.USERS.PREFERENCES, data);
  }

  // Delete account
  async deleteAccount(): Promise<ApiResponse<null>> {
    return this.client.delete<null>(API_ENDPOINTS.USERS.DELETE_ACCOUNT);
  }
}

// ===== MAIN API INSTANCE =====

const apiClient = new ApiClient();

export const api = {
  auth: new AuthAPI(apiClient),
  user: new UserAPI(apiClient),
  
  // Utility methods
  setToken: (token: string | null) => apiClient.setToken(token),
  getToken: () => apiClient.getToken(),
  
  // Health check
  healthCheck: () => apiClient.get('/health'),
  test: () => apiClient.get('/test'),
};

export default api;
