const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3000';
    } else {
      return window.location.origin;
    }
  }
  
  return process.env.VITE_API_URL || process.env.REACT_APP_API_URL || 'http://localhost:3000';
};

export const API_BASE_URL = getApiBaseUrl();

class ApiService {
  constructor() {
    this.API_BASE_URL = API_BASE_URL;
  }

  // Products
  async fetchProductById(productId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/products/${productId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch product');
      }
      const product = await response.json();
      product.sizes = this.parseSizes(product.sizes);
      return product;
    } catch (error) {
      throw error;
    }
  }

  async fetchProducts() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/products`);
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      const products = await response.json();
      
      return products.map(product => ({
        ...product,
        sizes: this.parseSizes(product.sizes)
      }));
    } catch (error) {
      throw error;
    }
  }

  async fetchBestSellers() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/products/bestsellers`);
      if (!response.ok) {
        throw new Error('Failed to fetch bestsellers');
      }
      const products = await response.json();
      
      return products.map(product => ({
        ...product,
        sizes: this.parseSizes(product.sizes)
      }));
    } catch (error) {
      throw error;
    }
  }

  async fetchFilteredProducts(filters) {
    try {
      const params = new URLSearchParams();

      if (filters.brands?.length > 0) {
        params.append('brands', filters.brands.join(','));
      }
      if (filters.genders?.length > 0) {
        params.append('genders', filters.genders.join(','));
      }
      if (filters.types?.length > 0) {
        params.append('types', filters.types.join(','));
      }
      if (filters.sizes?.length > 0) {
        params.append('sizes', filters.sizes.join(','));
      }

      const response = await fetch(`${API_BASE_URL}/api/products/filter?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch filtered products');
      }
      const products = await response.json();
      
      return products.map(product => ({
        ...product,
        sizes: this.parseSizes(product.sizes)
      }));
    } catch (error) {
      throw error;
    }
  }

  // Utilities
  parseSizes(sizes) {
    if (!sizes) {
      return [];
    }
    
    try {
      let parsedSizes = [];

      if (typeof sizes === 'string') {
        try {
          parsedSizes = JSON.parse(sizes);
        } catch (jsonError) {
          parsedSizes = sizes.split(',').map(size => size.trim()).filter(size => size);
        }
      } else if (Array.isArray(sizes)) {
        parsedSizes = sizes;
      } else {
        return [];
      }

      if (!Array.isArray(parsedSizes)) {
        return [];
      }

      const sortedSizes = parsedSizes
        .filter(size => size !== null && size !== undefined && size !== '')
        .sort((a, b) => {
          const numA = parseFloat(a);
          const numB = parseFloat(b);
          
          if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
          }
          
          return String(a).localeCompare(String(b));
        });

      return sortedSizes;

    } catch (error) {
      return [];
    }
  }

  async fetchAvailableSizes() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/products/available-sizes`);
      if (!response.ok) {
        throw new Error('Failed to fetch available sizes');
      }
      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  // Images
  async fetchProductImages() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/product-images`);
      if (!response.ok) {
        throw new Error('Failed to fetch product images');
      }
      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async fetchProductImagesByProductId(productId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/product-images/${productId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch product images');
      }
      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async getProductById(productId) {
    return this.fetchProductById(productId);
  }

  async fetchOfferImages() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/offer-images`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${responseText.substring(0, 100)}`);
      }

      if (responseText.trim().startsWith('<!doctype') || responseText.trim().startsWith('<html')) {
        throw new Error('Server returned HTML instead of JSON. Check if the API endpoint exists.');
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error('Invalid JSON response from server');
      }
      return data;
      
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error - please check your connection and API URL');
      }
      
      throw error;
    }
  }

  // Filters
  async fetchFilterOptions() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/filters/options`);
      if (!response.ok) {
        throw new Error('Failed to fetch filter options');
      }
      const result = await response.json();
      return result.data;
    } catch (error) {
      throw error;
    }
  }

  // Authentication
  async signup(userData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  async login(email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      if (data.session) {
        this.setAuthSession(data.session, data.user);
      }

      return data.user;
    } catch (error) {
      throw error;
    }
  }

  async logout() {
    try {
      const token = this.getAuthToken();
      
      if (token) {
        const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          console.warn('Logout API call failed, but clearing local session anyway');
        }
      }

      this.clearAuthData();
      
      return true;
    } catch (error) {
      this.clearAuthData();
      return true;
    }
  }

  async getCurrentUser() {
    try {
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/user`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          this.clearAuthData();
        }
        throw new Error(data.error || 'Failed to get user');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  async getProfile() {
    try {
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          this.clearAuthData();
        }
        throw new Error(data.error || 'Failed to get profile');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  async updateProfile(profileData) {
    try {
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/update-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      if (data.user) {
        const session = this.getAuthSession();
        if (session) {
          session.user = data.user;
          this.setAuthSessionData(session);
        }
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Profile Management
  async getProfileData() {
    try {
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/api/profiles/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          this.clearAuthData();
        }
        throw new Error(data.error || 'Failed to get profile data');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  async updateProfileData(profileData) {
    try {
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/api/profiles/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile data');
      }

      if (data.user) {
        const session = this.getAuthSession();
        if (session) {
          session.user = data.user;
          this.setAuthSessionData(session);
        }
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  async refreshUserData() {
    try {
      const userData = await this.getCurrentUser();
      
      const session = this.getAuthSession();
      if (session) {
        session.user = userData;
        this.setAuthSessionData(session);
      }
      
      return userData;
    } catch (error) {
      throw error;
    }
  }

  isProfileCompleteForReviews() {
    const user = this.getCurrentUserFromSession();
    if (!user) return false;
    
    const hasFirstName = !!(user.firstName && user.firstName.trim());
    const hasLastName = !!(user.lastName && user.lastName.trim());
    
    return hasFirstName && hasLastName;
  }

  canUserLeaveReviews() {
    if (!this.isAuthenticated()) {
      return { 
        canReview: false, 
        reason: 'not_authenticated',
        message: 'ავტორიზაცია გაიარეთ'
      };
    }

    if (!this.isProfileCompleteForReviews()) {
      return { 
        canReview: false, 
        reason: 'incomplete_profile',
        message: 'შეავსეთ სახელი და გვარი პროფილში'
      };
    }

    return { canReview: true };
  }

  // OAuth
  initiateGoogleAuth() {
    window.location.href = `${this.API_BASE_URL}/api/auth/google`;
  }

  initiateFacebookAuth() {
    window.location.href = `${this.API_BASE_URL}/api/auth/facebook`;
  }

  // Session Management
  getAuthSession() {
    try {
      const session = localStorage.getItem('auth_session');
      return session ? JSON.parse(session) : null;
    } catch (error) {
      localStorage.removeItem('auth_session');
      return null;
    }
  }

  setAuthSession(sessionData, userData) {
    try {
      const authSession = {
        access_token: sessionData.access_token,
        refresh_token: sessionData.refresh_token,
        expires_at: sessionData.expires_at,
        user: userData
      };
      localStorage.setItem('auth_session', JSON.stringify(authSession));
    } catch (error) {
      // Silent fail
    }
  }

  setAuthSessionData(sessionData) {
    try {
      localStorage.setItem('auth_session', JSON.stringify(sessionData));
    } catch (error) {
      // Silent fail
    }
  }

  getAuthToken() {
    const session = this.getAuthSession();
    return session?.access_token || null;
  }

  isAuthenticated() {
    const session = this.getAuthSession();
    if (!session || !session.access_token) {
      return false;
    }
    
    if (session.expires_at) {
      const expiryTime = new Date(session.expires_at * 1000);
      const now = new Date();
      
      if (expiryTime <= now) {
        this.clearAuthData();
        return false;
      }
    }
    
    return true;
  }

  getCurrentUserFromSession() {
    const session = this.getAuthSession();
    return session?.user || null;
  }

  clearAuthData() {
    localStorage.removeItem('auth_session');
  }

  async refreshAuthToken() {
    const session = this.getAuthSession();
    if (!session?.refresh_token) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: session.refresh_token
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Token refresh failed');
      }

      this.setAuthSession(data.session, data.user);
      return data.session;

    } catch (error) {
      this.clearAuthData();
      throw error;
    }
  }

  async requestPasswordReset(email) {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Password reset request failed');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  async resetPassword(access_token, newPassword) {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/auth/update-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          access_token: access_token, 
          new_password: newPassword 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Password reset failed');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Reviews
  async fetchProductReviews(productId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/products/${productId}/reviews`);
      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }
      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async createReview(reviewData) {
    try {
      const token = this.getAuthToken();
      if (!token) {
        this.showLoginRequiredMessage('შეფასების დასატოვებლად გთხოვთ ავტორიზაცია გაიაროთ');
        this.redirectToLogin();
        return null;
      }

      const response = await fetch(`${API_BASE_URL}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(reviewData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'PROFILE_INCOMPLETE') {
          this.handleProfileIncomplete(data.currentProfile);
          return null;
        }
        
        if (data.code === 'PROFILE_NOT_FOUND' || data.requiresLogin) {
          this.handleProfileNotFound();
          return null;
        }
        
        throw new Error(data.error || 'Failed to create review');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  handleProfileIncomplete(currentProfile = null) {
    let message = 'თქვენი პროფილი არ არის დასრულებული. გთხოვთ შეავსოთ სახელი და გვარი';
    
    if (currentProfile) {
      if (!currentProfile.firstName) {
        message += '\n- სახელი არ არის შევსებული';
      }
      if (!currentProfile.lastName) {
        message += '\n- გვარი არ არის შევსებული';  
      }
    }
    
    if (window.confirm(`${message}\n\nგსურთ პროფილის გვერდზე გადასვლა?`)) {
      window.location.href = '/profile';
    }
  }

  showLoginRequiredMessage(message) {
    if (window.showToast) {
      window.showToast(message, 'warning');
    } else {
      alert(message);
    }
  }

  redirectToLogin() {
    window.location.href = '/login';
  }

  handleProfileNotFound() {
    this.clearAuthData();
    this.showLoginRequiredMessage('თქვენი პროფილი არ არის დასრულებული. გთხოვთ ავტორიზაცია გაიაროთ');
    setTimeout(() => {
      this.redirectToLogin();
    }, 2000);
  }

  async markReviewHelpful(reviewId) {
    try {
      const token = this.getAuthToken();
      if (!token) {
        this.showLoginRequiredMessage('შეფასების სასარგებლოდ აღნიშვნისთვის გთხოვთ ავტორიზაცია გაიაროთ');
        this.redirectToLogin();
        return null;
      }

      const response = await fetch(`${API_BASE_URL}/api/reviews/${reviewId}/helpful`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'PROFILE_NOT_FOUND' || data.requiresLogin) {
          this.handleProfileNotFound();
          return null;
        }
        
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  async getUserVoteStatus(productId) {
    try {
      const token = this.getAuthToken();
      if (!token) {
        return {};
      }

      const response = await fetch(`${API_BASE_URL}/api/products/${productId}/user-votes`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return {};
      }

      const data = await response.json();
      return data.votes || {};
    } catch (error) {
      return {};
    }
  }

  showReviewPrompt(productId, onReviewSubmitted) {
    const reviewStatus = this.canUserLeaveReviews();
    
    if (!reviewStatus.canReview) {
      if (reviewStatus.reason === 'not_authenticated') {
        this.showLoginRequiredMessage('შეფასების დასატოვებლად გთხოვთ ავტორიზაცია გაიაროთ');
        this.redirectToLogin();
      } else {
        this.showLoginRequiredMessage(reviewStatus.message);
      }
      return false;
    }
    
    if (window.showReviewForm) {
      window.showReviewForm(productId, onReviewSubmitted);
    }
    
    return true;
  }

  // User Helpers
  getUserDisplayName(user = null) {
    const userData = user || this.getCurrentUserFromSession();
    if (!userData) return 'მომხმარებელი';
    
    if (userData.firstName && userData.lastName) {
      return `${userData.firstName} ${userData.lastName}`;
    } else if (userData.firstName) {
      return userData.firstName;
    } else if (userData.email) {
      return userData.email.split('@')[0];
    }
    return 'მომხმარებელი';
  }

  hasCompleteProfile(user = null) {
    const userData = user || this.getCurrentUserFromSession();
    if (!userData) return false;
    
    return !!(
      userData.firstName && 
      userData.lastName && 
      userData.email && 
      userData.gender && 
      userData.dateOfBirth
    );
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidPhoneNumber(phone) {
    if (!phone) return true;
    const phoneRegex = /^(\+995|995)?[0-9]{9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  formatPhoneNumber(phone) {
    if (!phone) return '';
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.startsWith('995')) {
      const number = cleanPhone.substring(3);
      return `+995 ${number.substring(0, 3)} ${number.substring(3, 6)} ${number.substring(6)}`;
    } else if (cleanPhone.length === 9) {
      return `${cleanPhone.substring(0, 3)} ${cleanPhone.substring(3, 6)} ${cleanPhone.substring(6)}`;
    }
    
    return phone;
  }

  formatDate(dateString) {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ka-GE');
    } catch (error) {
      return dateString;
    }
  }

  getUserAge(dateOfBirth) {
    if (!dateOfBirth) return null;
    try {
      const today = new Date();
      const birthDate = new Date(dateOfBirth);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age;
    } catch (error) {
      return null;
    }
  }
}

export const apiService = new ApiService();