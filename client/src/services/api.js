const getApiBaseUrl = () => {
  // If we're in production (deployed), use relative URLs or the deployed URL
  if (typeof window !== 'undefined') {
    // In browser
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // Development - use localhost
      return 'http://localhost:3000';
    } else {
      // Production - use the same origin (your Render URL)
      return window.location.origin;
    }
  }
  
  // Fallback for server-side or other contexts
  return process.env.VITE_API_URL || process.env.REACT_APP_API_URL || 'http://localhost:3000';
};

export const API_BASE_URL = getApiBaseUrl();

class ApiService {
  constructor() {
    this.API_BASE_URL = API_BASE_URL;
    console.log('API Service initialized with URL:', this.API_BASE_URL);
  }


  // =======================
  // PRODUCT METHODS
  // =======================

  async fetchProductById(productId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/products/${productId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch product');
      }
      const product = await response.json();
      
      // Parse sizes with improved handling
      product.sizes = this.parseSizes(product.sizes);
      
      return product;
    } catch (error) {
      console.error('Error fetching product by ID:', error);
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
      
      // Parse sizes for all products
      return products.map(product => ({
        ...product,
        sizes: this.parseSizes(product.sizes)
      }));
    } catch (error) {
      console.error('Error fetching products:', error);
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
      
      // Parse sizes for bestsellers
      return products.map(product => ({
        ...product,
        sizes: this.parseSizes(product.sizes)
      }));
    } catch (error) {
      console.error('Error fetching bestsellers:', error);
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
      // Add size filter support
      if (filters.sizes?.length > 0) {
        params.append('sizes', filters.sizes.join(','));
      }

      const response = await fetch(`${API_BASE_URL}/api/products/filter?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch filtered products');
      }
      const products = await response.json();
      
      // Parse sizes for all products
      return products.map(product => ({
        ...product,
        sizes: this.parseSizes(product.sizes)
      }));
    } catch (error) {
      console.error('Error fetching filtered products:', error);
      throw error;
    }
  }

  // =======================
  // HELPER METHODS
  // =======================

  parseSizes(sizes) {
    if (!sizes) {
      console.log('No sizes data provided');
      return [];
    }
    
    try {
      let parsedSizes = [];

      // Handle different formats
      if (typeof sizes === 'string') {
        // First try to parse as JSON
        try {
          parsedSizes = JSON.parse(sizes);
        } catch (jsonError) {
          console.log('Not valid JSON, trying comma-separated parsing');
          // If JSON parsing fails, treat as comma-separated string
          parsedSizes = sizes.split(',').map(size => size.trim()).filter(size => size);
        }
      } else if (Array.isArray(sizes)) {
        parsedSizes = sizes;
      } else {
        console.warn('Unexpected sizes format:', typeof sizes, sizes);
        return [];
      }

      // Ensure we have an array
      if (!Array.isArray(parsedSizes)) {
        console.warn('parsedSizes is not an array:', parsedSizes);
        return [];
      }

      // Sort sizes numerically
      const sortedSizes = parsedSizes
        .filter(size => size !== null && size !== undefined && size !== '')
        .sort((a, b) => {
          const numA = parseFloat(a);
          const numB = parseFloat(b);
          
          // If both are valid numbers, sort numerically
          if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
          }
          
          // If one or both are not numbers, sort alphabetically
          return String(a).localeCompare(String(b));
        });

      console.log('Parsed sizes:', sortedSizes);
      return sortedSizes;

    } catch (error) {
      console.error('Error parsing sizes:', error, 'Original sizes:', sizes);
      return [];
    }
  }

  // Get available sizes across all products (for filters)
  async fetchAvailableSizes() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/products/available-sizes`);
      if (!response.ok) {
        throw new Error('Failed to fetch available sizes');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching available sizes:', error);
      throw error;
    }
  }

  // =======================
  // IMAGE METHODS
  // =======================

  async fetchProductImages() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/product-images`);
      if (!response.ok) {
        throw new Error('Failed to fetch product images');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching product images:', error);
      throw error;
    }
  }

  // Add this method to your ApiService class
async fetchProductImagesByProductId(productId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/product-images/${productId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch product images');
    }
    // The server now returns an array of URLs, so just return it directly
    return await response.json();
  } catch (error) {
    console.error(`Error fetching product images for product ID ${productId}:`, error);
    throw error;
  }
}

async getProductById(productId) {
  return this.fetchProductById(productId);
}


  async fetchOfferImages() {
    try {
      console.log('Making request to:', `${API_BASE_URL}/api/offer-images`);
      
      const response = await fetch(`${API_BASE_URL}/api/offer-images`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const responseText = await response.text();

      if (!response.ok) {
        console.error('Server error response:', responseText);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${responseText.substring(0, 100)}`);
      }

      // Check if response is HTML (error page)
      if (responseText.trim().startsWith('<!doctype') || responseText.trim().startsWith('<html')) {
        console.error('Received HTML instead of JSON:', responseText.substring(0, 200));
        throw new Error('Server returned HTML instead of JSON. Check if the API endpoint exists.');
      }

      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Response was:', responseText.substring(0, 200));
        throw new Error('Invalid JSON response from server');
      }
      return data;
      
    } catch (error) {
      console.error('Error in fetchOfferImages:', error);
      
      // Network error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error - please check your connection and API URL');
      }
      
      throw error;
    }
  }

  // =======================
  // FILTER METHODS
  // =======================

  async fetchFilterOptions() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/filters/options`);
      if (!response.ok) {
        throw new Error('Failed to fetch filter options');
      }
      const result = await response.json();
      return result.data; // Return just the data array
    } catch (error) {
      console.error('Error fetching filter options:', error);
      throw error;
    }
  }

  // =======================
  // AUTHENTICATION METHODS
  // =======================

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
      console.error('Error during signup:', error);
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

      // Store session info
      if (data.session) {
        this.setAuthSession(data.session, data.user);
      }

      return data.user;
    } catch (error) {
      console.error('Error during login:', error);
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

      // Always clear local session regardless of API response
      this.clearAuthData();
      
      return true;
    } catch (error) {
      console.error('Error during logout:', error);
      // Still clear local session even if request fails
      this.clearAuthData();
      return true; // Don't throw error, as logout should always succeed locally
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
        // If token is invalid, clear it
        if (response.status === 401) {
          this.clearAuthData();
        }
        throw new Error(data.error || 'Failed to get user');
      }

      return data;
    } catch (error) {
      console.error('Error getting current user:', error);
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
      console.error('Error getting profile:', error);
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

      // Update local user data if successful
      if (data.user) {
        const session = this.getAuthSession();
        if (session) {
          session.user = data.user;
          this.setAuthSessionData(session);
        }
      }

      return data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  // =======================
  // PROFILE METHODS
  // =======================

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
      console.error('Error getting profile data:', error);
      throw error;
    }
  }

  async updateProfileData(profileData) {
  try {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    console.log('Updating profile with data:', profileData);

    const response = await fetch(`${API_BASE_URL}/api/profiles/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(profileData),
    });

    const data = await response.json();

    console.log('Profile update response:', { status: response.status, data });

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update profile data');
    }

    // Update local session with new user data
    if (data.user) {
      const session = this.getAuthSession();
      if (session) {
        session.user = data.user;
        this.setAuthSessionData(session);
        console.log('Updated local session with new user data:', data.user);
      }
    }

    return data;
  } catch (error) {
    console.error('Error updating profile data:', error);
    throw error;
  }
}

async refreshUserData() {
  try {
    const userData = await this.getCurrentUser();
    
    // Update local session
    const session = this.getAuthSession();
    if (session) {
      session.user = userData;
      this.setAuthSessionData(session);
    }
    
    return userData;
  } catch (error) {
    console.error('Error refreshing user data:', error);
    throw error;
  }
}

isProfileCompleteForReviews() {
  const user = this.getCurrentUserFromSession();
  if (!user) return false;
  
  const hasFirstName = !!(user.firstName && user.firstName.trim());
  const hasLastName = !!(user.lastName && user.lastName.trim());
  
  console.log('Profile completeness check:', {
    user: user,
    hasFirstName,
    hasLastName,
    complete: hasFirstName && hasLastName
  });
  
  return hasFirstName && hasLastName;
}

// Enhanced method to check if user can leave reviews
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

  // =======================
  // OAUTH METHODS
  // =======================

  initiateGoogleAuth() {
    // Redirect to your backend OAuth endpoint, not directly to Supabase
    window.location.href = `${this.API_BASE_URL}/api/auth/google`;
  }

  initiateFacebookAuth() {
    // Redirect to your backend OAuth endpoint, not directly to Supabase
    window.location.href = `${this.API_BASE_URL}/api/auth/facebook`;
  }

  // =======================
  // HELPER METHODS
  // =======================

  getAuthSession() {
    try {
      const session = localStorage.getItem('auth_session');
      return session ? JSON.parse(session) : null;
    } catch (error) {
      console.error('Error parsing auth session:', error);
      // Clear corrupted session
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
      console.error('Error setting auth session:', error);
    }
  }

  setAuthSessionData(sessionData) {
    try {
      localStorage.setItem('auth_session', JSON.stringify(sessionData));
    } catch (error) {
      console.error('Error setting auth session data:', error);
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
    
    // Check if token is expired
    if (session.expires_at) {
      const expiryTime = new Date(session.expires_at * 1000); // Convert to milliseconds
      const now = new Date();
      
      if (expiryTime <= now) {
        console.log('Token expired, clearing session');
        this.clearAuthData();
        return false;
      }
    }
    
    return true;
  }

  // Get user info from stored session (without API call)
  getCurrentUserFromSession() {
    const session = this.getAuthSession();
    return session?.user || null;
  }

  // Clear all stored authentication data
  clearAuthData() {
    localStorage.removeItem('auth_session');
  }

  // Refresh token if needed
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

      // Update stored session
      this.setAuthSession(data.session, data.user);
      return data.session;

    } catch (error) {
      console.error('Error refreshing token:', error);
      // Clear session on refresh failure
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
      console.error('Error requesting password reset:', error);
      throw error;
    }
  }

  async resetPassword(access_token, newPassword) {
    try {
      console.log('Attempting password reset with token:', access_token ? access_token.substring(0, 10) + '...' : 'MISSING');
      
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
        console.error('Password reset error response:', data);
        throw new Error(data.error || 'Password reset failed');
      }

      console.log('Password reset successful:', data);
      return data;
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  }

  async fetchProductReviews(productId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/products/${productId}/reviews`);
    if (!response.ok) {
      throw new Error('Failed to fetch reviews');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching reviews:', error);
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

    console.log('Creating review with data:', reviewData);

    const response = await fetch(`${API_BASE_URL}/api/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(reviewData),
    });

    const data = await response.json();

    console.log('Review creation response:', { status: response.status, data });

    if (!response.ok) {
      // Handle profile incomplete
      if (data.code === 'PROFILE_INCOMPLETE') {
        this.handleProfileIncomplete(data.currentProfile);
        return null;
      }
      
      // Handle profile not found - redirect to login
      if (data.code === 'PROFILE_NOT_FOUND' || data.requiresLogin) {
        this.handleProfileNotFound();
        return null;
      }
      
      throw new Error(data.error || 'Failed to create review');
    }

    return data;
  } catch (error) {
    console.error('Error creating review:', error);
    throw error;
  }
}

handleProfileIncomplete(currentProfile = null) {
  let message = 'თქვენი პროფილი არ არის დასრულებული. გთხოვთ შეავსოთ სახელი და გვარი';
  
  if (currentProfile) {
    console.log('Current profile data:', currentProfile);
    
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

// Update the showLoginRequiredMessage method
showLoginRequiredMessage(message) {
  if (window.showToast) {
    window.showToast(message, 'warning');
  } else {
    alert(message);
  }
}

// Update redirectToLogin method  
redirectToLogin() {
  window.location.href = '/login';
}

// Helper method to handle profile not found
handleProfileNotFound() {
  // Clear any invalid session data
  this.clearAuthData();
  
  // Show user-friendly message
  this.showLoginRequiredMessage('თქვენი პროფილი არ არის დასრულებული. გთხოვთ ავტორიზაცია გაიაროთ');
  
  // Redirect to login after a short delay
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

    console.log('Sending helpful request for review:', reviewId);

    const response = await fetch(`${API_BASE_URL}/api/reviews/${reviewId}/helpful`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    console.log('Helpful response:', { status: response.status, data });

    if (!response.ok) {
      // Handle profile not found for helpful marking too
      if (data.code === 'PROFILE_NOT_FOUND' || data.requiresLogin) {
        this.handleProfileNotFound();
        return null;
      }
      
      // Throw error with server message
      throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return data;
  } catch (error) {
    console.error('Error marking review as helpful:', error);
    throw error;
  }
}

// New method to get user's vote status for reviews
async getUserVoteStatus(productId) {
  try {
    const token = this.getAuthToken();
    if (!token) {
      return {}; // Return empty object if not authenticated
    }

    const response = await fetch(`${API_BASE_URL}/api/products/${productId}/user-votes`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.warn('Failed to fetch user vote status');
      return {};
    }

    const data = await response.json();
    return data.votes || {};
  } catch (error) {
    console.error('Error fetching user vote status:', error);
    return {};
  }
}

// Method to check if user should be able to leave reviews
canUserLeaveReviews() {
  if (!this.isAuthenticated()) {
    return { 
      canReview: false, 
      reason: 'not_authenticated',
      message: 'ავტორიზაცია გაიარეთ'
    };
  }

  const user = this.getCurrentUserFromSession();
  if (!this.hasCompleteProfile(user)) {
    return { 
      canReview: false, 
      reason: 'incomplete_profile',
      message: 'შეავსეთ პროფილი'
    };
  }

  return { canReview: true };
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
  
  // If user can review, show the review form
  // This would trigger your review modal/form
  if (window.showReviewForm) {
    window.showReviewForm(productId, onReviewSubmitted);
  }
  
  return true;
}

  // Get user display name helper
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

  // Check if user has complete profile
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

  // Validate email format
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate phone number format (Georgian)
  isValidPhoneNumber(phone) {
    if (!phone) return true; // Phone is optional
    const phoneRegex = /^(\+995|995)?[0-9]{9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  // Format phone number for display
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

  // Format date for display
  formatDate(dateString) {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ka-GE');
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  }

  // Get user age from date of birth
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
      console.error('Error calculating age:', error);
      return null;
    }
  }
}



// Create and export singleton instance
export const apiService = new ApiService();