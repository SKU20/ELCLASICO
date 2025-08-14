// Header.jsx - Updated with fixed search count and removed cart hover
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaShoppingCart, FaUser, FaPhone, FaSearch, FaTimes, FaGoogle, FaSignOutAlt } from 'react-icons/fa';
import { FaFacebookF } from 'react-icons/fa';
import { apiService } from "../services/api";
import { useCart } from '../contexts/CartContext.jsx';
import './Header.css';
import logoImage from '../assets/logo.png';

const Header = ({ onSearchFocus, onSearchBlur, isSearchActive, allProducts = [] }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  
  // Use cart context
  const { 
    items: cartItems, 
    cartItemCount, 
    cartTotal, 
    updateQuantity, 
    removeFromCart,
    clearCart 
  } = useCart();

  // Search states
  const [searchValue, setSearchValue] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Notification state
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  
  // Password reset states
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showResetPasswordForm, setShowResetPasswordForm] = useState(false);
  const [resetToken, setResetToken] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    gender: '',
    dateOfBirth: ''
  });

  // Check if auth modal should be shown based on URL
  const showAuthModal = location.pathname === '/login' || location.pathname === '/signup';
  const authMode = location.pathname === '/signup' ? 'signup' : 'login';

  // Effects
  useEffect(() => {
    checkAuthStatus();
    handleOAuthCallback();
  }, [navigate]);

  useEffect(() => {
    if (showAuthModal) {
      applyBlurEffect();
    } else {
      removeBlurEffect();
    }

    return () => {
      removeBlurEffect();
    };
  }, [showAuthModal]);

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (window.searchTimeout) {
        clearTimeout(window.searchTimeout);
      }
    };
  }, []);

  // Enhanced search functions
  const removeDiacritics = (str) => {
    const diacriticsMap = {
      'á': 'a', 'à': 'a', 'ä': 'a', 'â': 'a', 'ã': 'a', 'å': 'a',
      'é': 'e', 'è': 'e', 'ë': 'e', 'ê': 'e',
      'í': 'i', 'ì': 'i', 'ï': 'i', 'î': 'i',
      'ó': 'o', 'ò': 'o', 'ö': 'o', 'ô': 'o', 'õ': 'o',
      'ú': 'u', 'ù': 'u', 'ü': 'u', 'û': 'u',
      'ñ': 'n', 'ç': 'c',
      // Georgian to Latin approximations
      'ა': 'a', 'ბ': 'b', 'გ': 'g', 'დ': 'd', 'ე': 'e', 'ვ': 'v', 'ზ': 'z',
      'თ': 't', 'ი': 'i', 'კ': 'k', 'ლ': 'l', 'მ': 'm', 'ნ': 'n', 'ო': 'o',
      'პ': 'p', 'ჟ': 'zh', 'რ': 'r', 'ს': 's', 'ტ': 't', 'უ': 'u', 'ფ': 'f',
      'ქ': 'q', 'ღ': 'gh', 'ყ': 'y', 'შ': 'sh', 'ჩ': 'ch', 'ც': 'ts',
      'ძ': 'dz', 'წ': 'ts', 'ჭ': 'ch', 'ხ': 'kh', 'ჯ': 'j', 'ჰ': 'h'
    };

    return str.split('').map(char => diacriticsMap[char.toLowerCase()] || char).join('');
  };

  const normalizeForSearch = (text) => {
    if (!text) return '';
    
    let normalized = text.toLowerCase().trim();
    normalized = normalized.replace(/\s+/g, ' ');
    normalized = removeDiacritics(normalized);
    
    return normalized;
  };

  const calculateMatchScore = (productText, query) => {
    const product = normalizeForSearch(productText);
    const search = normalizeForSearch(query);
    
    if (!product || !search) return 0;
    
    let score = 0;
    
    // Exact match gets highest score
    if (product === search) {
      score += 100;
    }
    
    // Starts with query gets high score
    if (product.startsWith(search)) {
      score += 80;
    }
    
    // Contains query as whole word gets good score
    if (product.includes(' ' + search + ' ') || product.startsWith(search + ' ') || product.endsWith(' ' + search)) {
      score += 60;
    }
    
    // Contains query anywhere gets moderate score
    if (product.includes(search)) {
      score += 40;
    }
    
    // Only do partial matching for queries longer than 2 characters
    if (search.length > 2) {
      let matchingChars = 0;
      let consecutiveMatches = 0;
      let maxConsecutive = 0;
      
      for (let i = 0; i < search.length; i++) {
        const char = search[i];
        const index = product.indexOf(char, i === 0 ? 0 : product.indexOf(search[i-1]) + 1);
        
        if (index !== -1) {
          matchingChars++;
          consecutiveMatches++;
          maxConsecutive = Math.max(maxConsecutive, consecutiveMatches);
        } else {
          consecutiveMatches = 0;
        }
      }
      
      // Only add partial match bonus if most characters match
      const coverage = matchingChars / search.length;
      if (coverage > 0.7) { // At least 70% of characters must match
        score += coverage * 15;
        score += maxConsecutive * 3;
      }
    }
    
    return score;
  };

  const searchProducts = (query, products) => {
    if (!query || !query.trim() || !products || products.length === 0) {
      return [];
    }
    
    const normalizedQuery = normalizeForSearch(query);
    
    if (normalizedQuery.length < 1) {
      return [];
    }
    
    const results = products.filter(product => {
      // Search in product name
      if (product.name && normalizeForSearch(product.name).includes(normalizedQuery)) {
        return true;
      }
      
      // Search in brand
      if (product.brand && normalizeForSearch(product.brand).includes(normalizedQuery)) {
        return true;
      }
      
      // Search in category
      if (product.category && normalizeForSearch(product.category).includes(normalizedQuery)) {
        return true;
      }
      
      // Search in description
      if (product.description && normalizeForSearch(product.description).includes(normalizedQuery)) {
        return true;
      }
      
      return false;
    }).map(product => {
      // Calculate simple relevance score for sorting
      let score = 0;
      
      const productName = normalizeForSearch(product.name || '');
      const productBrand = normalizeForSearch(product.brand || '');
      
      // Exact match gets highest score
      if (productName === normalizedQuery) {
        score = 1000;
      }
      // Starts with query
      else if (productName.startsWith(normalizedQuery)) {
        score = 800;
      }
      // Contains query in name
      else if (productName.includes(normalizedQuery)) {
        score = 600;
      }
      // Brand match
      else if (productBrand.includes(normalizedQuery)) {
        score = 400;
      }
      // Category or description match
      else {
        score = 200;
      }
      
      return {
        ...product,
        searchScore: score
      };
    }).sort((a, b) => b.searchScore - a.searchScore);
    
    return results;
  };

  const highlightMatch = (text, query) => {
    if (!text || !query) return text;
    
    const normalizedText = normalizeForSearch(text);
    const normalizedQuery = normalizeForSearch(query);
    
    const index = normalizedText.indexOf(normalizedQuery);
    if (index === -1) return text;
    
    const before = text.substring(0, index);
    const match = text.substring(index, index + query.length);
    const after = text.substring(index + query.length);
    
    return (
      <>
        {before}
        <mark className="search-highlight">{match}</mark>
        {after}
      </>
    );
  };

  // Auth and OAuth functions
  const handleOAuthCallback = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionEncoded = urlParams.get('session');
    const authSuccess = urlParams.get('auth_success');
    const authError = urlParams.get('error');
    
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');
    const expiresIn = urlParams.get('expires_in');
    const tokenType = urlParams.get('token_type');
    const type = urlParams.get('type');
    const mode = urlParams.get('mode');

    // Handle password reset from email
    if (mode === 'reset_password' && accessToken) {
      setShowResetPasswordForm(true);
      setResetToken(accessToken);
      navigate('/');
      return;
    }

    // Handle regular OAuth error
    if (authError) {
      showNotification('ავტორიზაცია ვერ მოხერხდა: ' + authError);
      navigate('/');
      return;
    }

    // Handle regular OAuth success
    if (sessionEncoded || authSuccess) {
      if (!authSuccess || authSuccess !== 'true') {
        return;
      }

      if (!sessionEncoded) {
        showNotification('სესიის მონაცემები არ მოიძებნა');
        return;
      }

      try {
        const session = JSON.parse(decodeURIComponent(sessionEncoded));

        if (!session.access_token) throw new Error('No access token in session');
        if (!session.user) throw new Error('No user data in session');

        const authSession = {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
          user: session.user,
        };

        localStorage.setItem('auth_session', JSON.stringify(authSession));
        setUser(session.user);
        showNotification(`კეთილი იყოს მობრძანება, ${session.user.firstName || session.user.email}!`, 'success');
        navigate('/');
      } catch (error) {
        showNotification('ავტორიზაცია ვერ მოხერხდა: ' + error.message);
        navigate('/');
      }
      return;
    }

    // Handle direct OAuth tokens in URL hash
    const hash = window.location.hash;
    if (hash) {
      try {
        const params = new URLSearchParams(hash.slice(1));
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        const expires_at = params.get('expires_at') ? Number(params.get('expires_at')) : null;

        if (!access_token) {
          return;
        }

        const authSession = {
          access_token,
          refresh_token,
          expires_at,
          user: {
            email: null,
            firstName: null,
            lastName: null,
          }
        };

        localStorage.setItem('auth_session', JSON.stringify(authSession));
        setUser(authSession.user);
        showNotification('ავტორიზაცია წარმატებულია!', 'success');
        navigate('/');

      } catch (error) {
        showNotification('ავტორიზაცია ვერ მოხერხდა: ' + error.message);
        navigate('/');
      }
    }
  };

  const checkAuthStatus = async () => {
    try {
      if (apiService.isAuthenticated()) {
        const userData = await apiService.getCurrentUser();
        setUser(userData);
      }
    } catch (error) {
      apiService.clearAuthData();
    }
  };

  const showNotification = (message, type = 'error') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 5000);
  };

  const applyBlurEffect = () => {
    document.body.style.filter = 'blur(0px)';
    const mainContent = document.querySelector('.main-content');
    const footer = document.querySelector('.footer');

    if (mainContent) {
      mainContent.classList.add('blurred');
    }

    if (footer) {
      footer.classList.add('blurred');
    }

    let overlay = document.getElementById('blur-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'blur-overlay';
      overlay.className = 'blur-overlay';
      document.body.appendChild(overlay);
    }
  };

  const removeBlurEffect = () => {
    const mainContent = document.querySelector('.main-content');
    const footer = document.querySelector('.footer');

    if (mainContent) {
      mainContent.classList.remove('blurred');
    }

    if (footer) {
      footer.classList.remove('blurred');
    }

    const overlay = document.getElementById('blur-overlay');
    if (overlay) {
      overlay.remove();
    }
  };

  // Cart functions (simplified - removed hover functionality)
  const handleCartClick = () => {
    navigate('/cart');
  };

  // Format price with currency
  const formatPrice = (price) => {
    if (typeof price !== 'number') {
      price = parseFloat(price) || 0;
    }
    return `₾${price.toLocaleString('ka-GE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  // Search functions
  const handleSearchFocus = () => {
    if (onSearchFocus) {
      onSearchFocus();
    } else {
      applyBlurEffect();
      setShowResults(true);
    }
  };

  const handleSearchBlur = (e) => {
    if (e.relatedTarget && e.relatedTarget.closest('.search-results')) {
      return;
    }

    if (onSearchBlur) {
      onSearchBlur();
    } else {
      setTimeout(() => {
        removeBlurEffect();
        setShowResults(false);
      }, 150);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchValue(value);
    
    if (value.trim()) {
      setLoading(true);
      
      if (window.searchTimeout) {
        clearTimeout(window.searchTimeout);
      }
      
      window.searchTimeout = setTimeout(() => {
        const filtered = searchProducts(value.trim(), allProducts);
        // Show all matching results, no limit for dropdown suggestions
        setSearchResults(filtered);
        setLoading(false);
      }, 150);
    } else {
      setSearchResults([]);
      setLoading(false);
      
      if (window.searchTimeout) {
        clearTimeout(window.searchTimeout);
      }
    }
  };

  const handleResultClick = (result) => {
    setSearchValue('');
    setSearchResults([]);
    setShowResults(false);
    removeBlurEffect();
    
    if (onSearchBlur) {
      onSearchBlur();
    }
    
    navigate(`/product/${result.id}`);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    
    if (!searchValue.trim()) return;
    
    setShowResults(false);
    removeBlurEffect();
    
    if (onSearchBlur) {
      onSearchBlur();
    }
    
    const searchTerm = searchValue.trim();
    navigate(`/results?q=${encodeURIComponent(searchTerm)}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearchSubmit(e);
    }
  };

  // Auth functions
  const handleAuthClick = () => {
    if (user) {
      handleLogout();
    } else {
      navigate('/login');
    }
  };

  const handleCloseAuth = () => {
    navigate('/');
    setForgotPasswordMode(false);
    setResetEmail('');
    setResetEmailSent(false);
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phoneNumber: '',
      gender: '',
      dateOfBirth: ''
    });
  };

  const handleFormChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const userData = await apiService.login(formData.email, formData.password);
      setUser(userData);
      navigate('/');
      showNotification(`კეთილი იყოს მობრძანება, ${userData.firstName || userData.email}!`, 'success');
    } catch (error) {
      showNotification('შესვლის შეცდომა: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await apiService.signup({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth
      });
      
      showNotification('რეგისტრაცია წარმატებული! გთხოვთ შეამოწმოთ თქვენი ელ-ფოსტა.', 'success');
      navigate('/login');
      setFormData({
        email: formData.email,
        password: '',
        firstName: '',
        lastName: '',
        phoneNumber: '',
        gender: '',
        dateOfBirth: ''
      });
    } catch (error) {
      showNotification('რეგისტრაციის შეცდომა: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiService.logout();
      setUser(null);
      navigate('/');
    } catch (error) {
      setUser(null);
      navigate('/');
    }
  };

  const handleGoogleAuth = () => {
    apiService.initiateGoogleAuth();
  };

  const handleFacebookAuth = () => {
    apiService.initiateFacebookAuth();
  };

  const handleForgotPasswordClick = (e) => {
    e.preventDefault();
    setForgotPasswordMode(true);
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await apiService.requestPasswordReset(resetEmail);
      setResetEmailSent(true);
      showNotification('პაროლის აღდგენის ინსტრუქცია გამოგზავნილია თქვენს ელ-ფოსტაზე', 'success');
    } catch (error) {
      showNotification('პაროლის აღდგენის შეცდომა: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setForgotPasswordMode(false);
    setResetEmail('');
    setResetEmailSent(false);
  };

  const switchAuthMode = () => {
    const newMode = authMode === 'login' ? 'signup' : 'login';
    navigate(`/${newMode}`);
    setForgotPasswordMode(false);
    setResetEmail('');
    setResetEmailSent(false);
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phoneNumber: '',
      gender: '',
      dateOfBirth: ''
    });
  };

  const shouldShowResults = isSearchActive !== undefined ? isSearchActive && showResults : showResults;
  const resultsToShow = searchResults;

  return (
    <>
      {/* Notification Component */}
      {notification.show && (
        <div className="notification-overlay">
          <div className={`notification ${notification.type}`}>
            <div className="notification-content">
              <span className="notification-message">{notification.message}</span>
              <button 
                className="notification-close" 
                onClick={() => setNotification({ show: false, message: '', type: '' })}
              >
                <FaTimes />
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="header">
        <div className="logo" onClick={() => navigate('/')}>
          <img src={logoImage} alt="ელ კლასიკო ლოგო" className="logo-image" />
        </div>

        <form className="search" onSubmit={handleSearchSubmit}>
          <input
            type="text"
            placeholder="მოძებნე ფეხსაცმელები..."
            value={searchValue}
            onChange={handleInputChange}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            onKeyDown={handleKeyDown}
            className={`search-input ${shouldShowResults ? 'search-input-focused' : ''}`}
          />

          {shouldShowResults && (
            <div className="search-results">
              <div className="search-results-header">
                <div className="search-results-header-content">
                  <FaSearch className="search-icon" />
                  <span>საძიებო შედეგები</span>
                  <span className="search-results-count">
                    {resultsToShow.length}
                  </span>
                </div>
              </div>

              {loading ? (
                <div className="search-loading">
                  <span>ძიება...</span>
                </div>
              ) : searchValue ? (
                resultsToShow.length > 0 ? (
                  resultsToShow.map((result, index) => (
                    <div
                      key={result.id}
                      onClick={() => handleResultClick(result)}
                      className={`search-result-item ${index < resultsToShow.length - 1 ? 'has-border' : ''}`}
                    >
                      <img
                        src={result.image || result.imageUrl}
                        alt={result.name}
                        className="search-result-image"
                        onError={(e) => {
                          e.target.src = '/api/placeholder/60/60';
                        }}
                      />
                      <div className="search-result-content">
                        <div className="search-result-name">
                          {highlightMatch(result.name, searchValue)}
                        </div>
                        <div className="search-result-price">
                          {formatPrice(result.price)}
                        </div>
                        {result.brand && (
                          <div className="search-result-brand">
                            {highlightMatch(result.brand, searchValue)}
                          </div>
                        )}
                        {result.matchedField && result.matchedField !== 'name' && (
                          <div className="search-result-matched">
                            ნაპოვნია: {result.matchedField}
                          </div>
                        )}
                      </div>
                      <div className="search-result-indicator" />
                    </div>
                  ))
                ) : (
                  <div className="search-no-results">
                    <div className="search-no-results-icon">🔍</div>
                    <div className="search-no-results-title">
                      შედეგი ვერ მოიძებნა
                    </div>
                    <div className="search-no-results-subtitle">სცადეთ სხვა საძიებო სიტყვები</div>
                  </div>
                )
              ) : (
                <div className="search-empty-state">
                  <div className="search-empty-icon">⌨️</div>
                  <div className="search-empty-title">
                    დაიწყეთ ძიება
                  </div>
                  <div className="search-empty-subtitle">ჩაწერეთ პროდუქტის სახელი ან ბრენდი</div>
                </div>
              )}
            </div>
          )}
        </form>

        <div className="icons">
          <div className="icon-wrapper" onClick={handleCartClick}>
            <div className="cart-icon-container">
              <FaShoppingCart className="icon" />
              <span className="icon-text">კალათა</span>
              {cartItemCount > 0 && (
                <span className="cart-badge animate-badge">
                  {cartItemCount}
                </span>
              )}
            </div>
          </div>

          <div 
            className={`icon-wrapper ${user ? 'logout-button' : ''}`} 
            onClick={handleAuthClick}
          >
            {user ? (
              <>
                <FaSignOutAlt className="icon" />
                <span className="icon-text">გასვლა</span>
              </>
            ) : (
              <>
                <FaUser className="icon" />
                <span className="icon-text">შესვლა</span>
              </>
            )}
          </div>
          <div className="icon-wrapper">
            <FaPhone className="icon" />
            <span className="icon-text">კონტაქტი</span>
          </div>
        </div>
      </header>

      {showAuthModal && (
        <div className="auth-modal-overlay">
          <div className="auth-modal">
            <div className="auth-modal-header">
              <h2 className="auth-modal-title">
                {forgotPasswordMode ? 'პაროლის აღდგენა' : (authMode === 'login' ? 'შესვლა' : 'რეგისტრაცია')}
              </h2>
              <button 
                className="auth-modal-close"
                onClick={handleCloseAuth}
              >
                <FaTimes />
              </button>
            </div>

            <div className="auth-modal-content">
              {forgotPasswordMode ? (
                <form onSubmit={handleForgotPasswordSubmit} className="auth-form">
                  <div className="form-group">
                    <label htmlFor="resetEmail" className="form-label">
                      ელ-ფოსტა *
                    </label>
                    <input
                      type="email"
                      id="resetEmail"
                      name="resetEmail"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="form-input"
                      placeholder="თქვენი ელ-ფოსტა"
                      required
                    />
                  </div>

                  <button type="submit" className="auth-button" disabled={loading || resetEmailSent}>
                    {loading ? 'იტვირთება...' : 'პაროლის აღდგენა'}
                  </button>

                  {resetEmailSent && (
                    <div className="success-message">
                      პაროლის აღდგენის ინსტრუქცია გამოგზავნილია თქვენს ელ-ფოსტაზე
                    </div>
                  )}

                  <div className="auth-footer">
                    <button 
                      type="button" 
                      onClick={handleBackToLogin} 
                      className="auth-switch-button"
                      disabled={loading}
                    >
                      უკან შესვლაზე
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {authMode === 'login' && (
                    <div className="oauth-section">
                      <button 
                        type="button" 
                        onClick={handleGoogleAuth}
                        className="oauth-button google-button"
                        disabled={loading}
                      >
                        <FaGoogle className="oauth-icon" />
                        <span>Google-ით შესვლა</span>
                      </button>
                      <button 
                        type="button" 
                        onClick={handleFacebookAuth}
                        className="oauth-button facebook-button"
                        disabled={loading}
                      >
                        <FaFacebookF className="oauth-icon" />
                        <span>Facebook-ით შესვლა</span>
                      </button>
                    </div>
                  )}

                  <form onSubmit={authMode === 'login' ? handleLogin : handleSignup} className="auth-form">
                    {authMode === 'signup' && (
                      <>
                        <div className="form-row">
                          <div className="form-group">
                            <label htmlFor="firstName" className="form-label">
                              სახელი *
                            </label>
                            <input
                              type="text"
                              id="firstName"
                              name="firstName"
                              value={formData.firstName}
                              onChange={handleFormChange}
                              className="form-input"
                              placeholder="თქვენი სახელი"
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label htmlFor="lastName" className="form-label">
                              გვარი *
                            </label>
                            <input
                              type="text"
                              id="lastName"
                              name="lastName"
                              value={formData.lastName}
                              onChange={handleFormChange}
                              className="form-input"
                              placeholder="თქვენი გვარი"
                              required
                            />
                          </div>
                        </div>

                        <div className="form-row">
                          <div className="form-group">
                            <label htmlFor="gender" className="form-label">
                              სქესი *
                            </label>
                            <select
                              id="gender"
                              name="gender"
                              value={formData.gender}
                              onChange={handleFormChange}
                              className="form-input"
                              required
                            >
                              <option value="">აირჩიეთ სქესი</option>
                              <option value="მამრობითი">მამრობითი</option>
                              <option value="მდედრობითი">მდედრობითი</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label htmlFor="dateOfBirth" className="form-label">
                              დაბადების თარიღი *
                            </label>
                            <input
                              type="date"
                              id="dateOfBirth"
                              name="dateOfBirth"
                              value={formData.dateOfBirth}
                              onChange={handleFormChange}
                              className="form-input"
                              required
                            />
                          </div>
                        </div>

                        <div className="form-group">
                          <label htmlFor="phoneNumber" className="form-label">
                            ტელეფონის ნომერი  
                          </label>
                          <input
                            type="tel"
                            id="phoneNumber"
                            name="phoneNumber"
                            value={formData.phoneNumber}
                            onChange={handleFormChange}
                            className="form-input"
                            placeholder="+995 XXX XXX XXX"
                          />
                        </div>
                      </>
                    )}

                    <div className="form-group">
                      <label htmlFor="email" className="form-label">
                        ელ-ფოსტა *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleFormChange}
                        className="form-input"
                        placeholder="თქვენი ელ-ფოსტა"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="password" className="form-label">
                        პაროლი *
                      </label>
                      <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleFormChange}
                        className="form-input"
                        placeholder="თქვენი პაროლი"
                        required
                        minLength="6"
                      />
                    </div>

                    {authMode === 'login' && (
                      <div className="form-options">
                        <label className="checkbox-wrapper">
                          <input type="checkbox" />
                          <span className="checkbox-text">დამიმახსოვრე</span>
                        </label>
                        <a href="#" className="forgot-password" onClick={handleForgotPasswordClick}>
                          პაროლი დაგავიწყდათ?
                        </a>
                      </div>
                    )}

                    <button type="submit" className="auth-button" disabled={loading}>
                      {loading ? 'იტვირთება...' : (authMode === 'login' ? 'შესვლა' : 'რეგისტრაცია')}
                    </button>

                    <div className="auth-footer">
                      <span>
                        {authMode === 'login' ? 'არ გაქვთ ანგარიში? ' : 'უკვე გაქვთ ანგარიში? '}
                      </span>
                      <button 
                        type="button" 
                        onClick={switchAuthMode} 
                        className="auth-switch-button"
                        disabled={loading}
                      >
                        {authMode === 'login' ? 'რეგისტრაცია' : 'შესვლა'}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;