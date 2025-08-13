// Header.jsx - Fixed cart functionality
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaShoppingCart, FaUser, FaPhone, FaSearch, FaTimes, FaGoogle, FaSignOutAlt, FaTrash, FaMinus, FaPlus } from 'react-icons/fa';
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

  // Debug cart state changes
  useEffect(() => {
    console.log('🛒 Cart State Changed:', {
      itemsCount: cartItems?.length || 0,
      cartItemCount,
      cartTotal,
      items: cartItems,
      user: user?.email || 'Not logged in'
    });
  }, [cartItems, cartItemCount, cartTotal, user]);

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

  // Cart dropdown state - SIMPLIFIED
  const [showCart, setShowCart] = useState(false);
  const [cartHoverTimeout, setCartHoverTimeout] = useState(null);

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

  // Cleanup hover timeout on unmount
  useEffect(() => {
    return () => {
      if (cartHoverTimeout) {
        clearTimeout(cartHoverTimeout);
      }
    };
  }, [cartHoverTimeout]);

  // Auth and OAuth functions (keeping existing implementation)
  const handleOAuthCallback = () => {
    console.log('=== OAuth/Password Reset Callback Debug ===');
    
    const urlParams = new URLSearchParams(window.location.search);
    const sessionEncoded = urlParams.get('session');
    const authSuccess = urlParams.get('auth_success');
    const authError = urlParams.get('error');
    
    // Password reset parameters
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');
    const expiresIn = urlParams.get('expires_in');
    const tokenType = urlParams.get('token_type');
    const type = urlParams.get('type');
    const mode = urlParams.get('mode');

    console.log('URL params:', {
      sessionEncoded: sessionEncoded ? 'EXISTS' : 'MISSING',
      authSuccess: authSuccess,
      authError: authError,
      accessToken: accessToken ? `${accessToken.substring(0, 10)}...` : 'MISSING',
      refreshToken: refreshToken ? 'EXISTS' : 'MISSING',
      type: type,
      mode: mode,
      fullURL: window.location.href,
    });

    // Handle password reset from email
    if (mode === 'reset_password' && accessToken) {
      console.log('Password reset mode detected');
      setShowResetPasswordForm(true);
      setResetToken(accessToken);
      navigate('/');
      return;
    }

    // Handle regular OAuth error
    if (authError) {
      console.error('OAuth error from URL:', authError);
      showNotification('ავტორიზაცია ვერ მოხერხდა: ' + authError);
      navigate('/');
      return;
    }

    // Handle regular OAuth success (Google/Facebook login)
    if (sessionEncoded || authSuccess) {
      console.log('Detected query params OAuth callback');

      if (!authSuccess || authSuccess !== 'true') {
        console.log('Auth not successful or missing auth_success=true');
        return;
      }

      if (!sessionEncoded) {
        console.error('No session data in URL');
        showNotification('სესიის მონაცემები არ მოიძებნა');
        return;
      }

      try {
        console.log('Attempting to decode session from query params...');
        const session = JSON.parse(decodeURIComponent(sessionEncoded));
        console.log('Decoded session:', session);

        if (!session.access_token) throw new Error('No access token in session');
        if (!session.user) throw new Error('No user data in session');

        const authSession = {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
          user: session.user,
        };

        console.log('Storing auth session:', authSession);
        localStorage.setItem('auth_session', JSON.stringify(authSession));

        setUser(session.user);
        console.log('User state set successfully');
        showNotification(`კეთილი იყოს მობრძანება, ${session.user.firstName || session.user.email}!`, 'success');

        navigate('/');
      } catch (error) {
        console.error('OAuth session parsing failed:', error);
        console.error('Raw session data:', sessionEncoded);
        showNotification('ავტორიზაცია ვერ მოხერხდა: ' + error.message);
        navigate('/');
      }
      return;
    }

    // Handle direct OAuth tokens in URL hash (fallback)
    const hash = window.location.hash;
    if (hash) {
      console.log('Detected OAuth tokens in URL hash:', hash);

      try {
        const params = new URLSearchParams(hash.slice(1));

        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        const expires_at = params.get('expires_at') ? Number(params.get('expires_at')) : null;

        if (!access_token) {
          console.error('No access_token found in URL hash');
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

        console.log('Storing auth session from hash:', authSession);
        localStorage.setItem('auth_session', JSON.stringify(authSession));

        setUser(authSession.user);
        showNotification('ავტორიზაცია წარმატებულია!', 'success');
        navigate('/');

      } catch (error) {
        console.error('Error parsing OAuth tokens from URL hash:', error);
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
      console.log('No user logged in or session expired');
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

  // FIXED Cart functions with better hover handling
  const handleCartMouseEnter = () => {
    console.log('🛒 Cart mouse enter');
    
    // Clear any existing timeout
    if (cartHoverTimeout) {
      clearTimeout(cartHoverTimeout);
      setCartHoverTimeout(null);
    }
    
    setShowCart(true);
  };

  const handleCartMouseLeave = () => {
    console.log('🛒 Cart mouse leave');
    
    // Set a timeout to close the cart dropdown
    const timeout = setTimeout(() => {
      console.log('🛒 Cart timeout triggered - closing cart');
      setShowCart(false);
    }, 300); // 300ms delay for better UX
    
    setCartHoverTimeout(timeout);
  };

  const handleCartDropdownMouseEnter = () => {
    console.log('🛒 Cart dropdown mouse enter');
    
    // Clear any existing timeout to keep dropdown open
    if (cartHoverTimeout) {
      clearTimeout(cartHoverTimeout);
      setCartHoverTimeout(null);
    }
    
    setShowCart(true);
  };

  const handleCartDropdownMouseLeave = () => {
    console.log('🛒 Cart dropdown mouse leave');
    
    // Set a timeout to close the cart dropdown
    const timeout = setTimeout(() => {
      console.log('🛒 Cart dropdown timeout triggered - closing cart');
      setShowCart(false);
    }, 200); // Shorter delay when leaving dropdown
    
    setCartHoverTimeout(timeout);
  };

  // FIXED: Cart icon click goes to cart page
  const handleCartClick = () => {
    console.log('🛒 Cart icon clicked - going to cart page');
    setShowCart(false);
    
    // Clear any timeout
    if (cartHoverTimeout) {
      clearTimeout(cartHoverTimeout);
      setCartHoverTimeout(null);
    }
    
    navigate('/cart');
  };

  // View cart button in dropdown - also goes to cart
  const handleOpenCart = () => {
    console.log('🛒 View cart button clicked - going to cart page');
    setShowCart(false);
    
    // Clear any timeout
    if (cartHoverTimeout) {
      clearTimeout(cartHoverTimeout);
      setCartHoverTimeout(null);
    }
    
    navigate('/cart');
  };

  const handleQuantityChange = async (itemId, newQuantity) => {
    console.log('🛒 Quantity change:', { itemId, newQuantity });
    
    if (newQuantity <= 0) {
      // Remove item if quantity is 0 or less
      await removeFromCart(itemId);
    } else {
      await updateQuantity(itemId, newQuantity);
    }
  };

  const handleRemoveItem = async (itemId, itemName) => {
    console.log('🛒 Removing item:', { itemId, itemName });
    
    if (window.confirm(`გსურთ "${itemName}" წაშალება კალათიდან?`)) {
      await removeFromCart(itemId);
      showNotification(`"${itemName}" წაშალდა კალათიდან`, 'success');
    }
  };

  const handleClearCart = async () => {
    if (cartItems.length === 0) return;
    
    if (window.confirm('გსურთ კალათის გაწმენდა?')) {
      await clearCart();
      showNotification('კალათა გაიწმინდა', 'success');
    }
  };

  // Format price with currency
  const formatPrice = (price) => {
    if (typeof price !== 'number') {
      price = parseFloat(price) || 0;
    }
    return `₾${price.toLocaleString('ka-GE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  // Search functions (keeping existing implementation)
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

  // Enhanced search function with Georgian letter recognition
  const normalizeGeorgianText = (text) => {
    if (!text) return '';
    
    const normalized = text.toLowerCase().trim();
    
    const georgianVariations = {
      'ა': ['ა', 'a'],
      'ბ': ['ბ', 'b'],
      'გ': ['გ', 'g'],
      'დ': ['დ', 'd'],
      'ე': ['ე', 'e'],
      'ვ': ['ვ', 'v', 'w'],
      'ზ': ['ზ', 'z'],
      'თ': ['თ', 't'],
      'ი': ['ი', 'i'],
      'კ': ['კ', 'k'],
      'ლ': ['ლ', 'l'],
      'მ': ['მ', 'm'],
      'ნ': ['ნ', 'n'],
      'ო': ['ო', 'o'],
      'პ': ['პ', 'p'],
      'ჟ': ['ჟ', 'zh', 'j'],
      'რ': ['რ', 'r'],
      'ს': ['ს', 's'],
      'ტ': ['ტ', 't'],
      'უ': ['უ', 'u'],
      'ფ': ['ფ', 'f', 'ph'],
      'ქ': ['ქ', 'q', 'k'],
      'ღ': ['ღ', 'gh'],
      'ყ': ['ყ', 'y'],
      'შ': ['შ', 'sh'],
      'ჩ': ['ჩ', 'ch'],
      'ც': ['ც', 'ts', 'c'],
      'ძ': ['ძ', 'dz'],
      'წ': ['წ', 'ts'],
      'ჭ': ['ჭ', 'ch'],
      'ხ': ['ხ', 'kh', 'x'],
      'ჯ': ['ჯ', 'j'],
      'ჰ': ['ჰ', 'h']
    };
    
    return { normalized, georgianVariations };
  };

  const searchProducts = (query, products) => {
    if (!query || !query.trim()) return [];
    
    const { normalized: normalizedQuery, georgianVariations } = normalizeGeorgianText(query);
    
    return products.filter(product => {
      if (!product.name) return false;
      
      const { normalized: productName } = normalizeGeorgianText(product.name);
      
      // Direct match
      if (productName.includes(normalizedQuery)) {
        return true;
      }
      
      // Brand match
      if (product.brand) {
        const { normalized: brandName } = normalizeGeorgianText(product.brand);
        if (brandName.includes(normalizedQuery)) {
          return true;
        }
      }
      
      // Character-by-character fuzzy matching for Georgian/Latin mix
      const queryChars = normalizedQuery.split('');
      let productMatches = 0;
      
      queryChars.forEach(queryChar => {
        // Check direct character match
        if (productName.includes(queryChar)) {
          productMatches++;
          return;
        }
        
        // Check Georgian variations
        Object.entries(georgianVariations).forEach(([georgian, variations]) => {
          if (variations.includes(queryChar) && productName.includes(georgian)) {
            productMatches++;
          } else if (queryChar === georgian) {
            variations.forEach(variation => {
              if (productName.includes(variation)) {
                productMatches++;
              }
            });
          }
        });
      });
      
      // Return true if most characters match (adjust threshold as needed)
      return productMatches >= Math.min(3, Math.ceil(queryChars.length * 0.6));
    });
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    console.log('🔍 Header Search input:', value);
    console.log('📦 Header Products available:', allProducts.length);
    setSearchValue(value);
    
    if (value.trim()) {
      const filtered = searchProducts(value, allProducts);
      console.log('Header Filtered results:', filtered.length);
      setSearchResults(filtered.slice(0, 10));
    } else {
      setSearchResults([]);
    }
  };

  const handleResultClick = (result) => {
    console.log('Selected product:', result);
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
    
    navigate(`/results?q=${encodeURIComponent(searchValue.trim())}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearchSubmit(e);
    }
  };

  // Auth functions (keeping existing implementation)
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
      console.log('Attempting login with:', formData.email);
      const userData = await apiService.login(formData.email, formData.password);
      console.log('Login successful:', userData);
      setUser(userData);
      navigate('/');
      showNotification(`კეთილი იყოს მობრძანება, ${userData.firstName || userData.email}!`, 'success');
    } catch (error) {
      console.error('Login error:', error);
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
      console.error('Signup error:', error);
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
      console.error('Logout error:', error);
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
      console.error('Password reset error:', error);
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

              {searchValue ? (
                resultsToShow.length > 0 ? (
                  resultsToShow.map((result, index) => (
                    <div
                      key={result.id}
                      onClick={() => handleResultClick(result)}
                      className={`search-result-item ${index < resultsToShow.length - 1 ? 'has-border' : ''}`}
                    >
                      <img
                        src={result.image}
                        alt={result.name}
                        className="search-result-image"
                      />
                      <div className="search-result-content">
                        <div className="search-result-name">
                          {result.name}
                        </div>
                        <div className="search-result-price">
                          {formatPrice(result.price)}
                        </div>
                        {result.brand && (
                          <div className="search-result-brand">
                            {result.brand}
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
          {/* FIXED Cart with proper click and hover behavior */}
          <div 
            className="icon-wrapper cart-wrapper"
            onMouseEnter={handleCartMouseEnter}
            onMouseLeave={handleCartMouseLeave}
            onClick={handleCartClick}
          >
            <div className="cart-icon-container">
              <FaShoppingCart className="icon" />
              <span className="icon-text">კალათა</span>
              {cartItemCount > 0 && (
                <span className="cart-badge animate-badge">
                  {cartItemCount}
                </span>
              )}
            </div>
            
            {/* Enhanced Cart Dropdown */}
            {showCart && (
              <div 
                className="cart-dropdown enhanced-cart-dropdown"
                onMouseEnter={handleCartDropdownMouseEnter}
                onMouseLeave={handleCartDropdownMouseLeave}
              >
                <div className="cart-dropdown-header">
                  <div className="cart-header-info">
                    <span className="cart-title">შენი კალათა</span>
                    <span className="cart-item-count">
                      {cartItemCount} {cartItemCount === 1 ? 'პროდუქტი' : 'პროდუქტი'}
                    </span>
                  </div>
                  {cartItems.length > 0 && (
                    <button 
                      className="clear-cart-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearCart();
                      }}
                      title="კალათის გაწმენდა"
                    >
                      <FaTrash />
                    </button>
                  )}
                </div>
                
                <div className="cart-dropdown-items">
                  {cartItems.length === 0 ? (
                    <div className="cart-empty">
                      <div className="cart-empty-icon">🛒</div>
                      <div className="cart-empty-text">კალათა ცარიელია</div>
                      <div className="cart-empty-subtext">დაამატე პროდუქტები შესყიდვისთვის</div>
                    </div>
                  ) : (
                    <div className="cart-items-list">
                      {cartItems.slice(0, 4).map((item) => (
                        <div key={`cart-item-${item.id}`} className="cart-item enhanced-cart-item">
                          <div className="cart-item-image-container">
                            <img 
                              src={item.image || item.imageUrl || '/api/placeholder/60/60'} 
                              alt={item.name} 
                              className="cart-item-image"
                              onError={(e) => {
                                e.target.src = '/api/placeholder/60/60';
                              }}
                            />
                          </div>
                          
                          <div className="cart-item-details">
                            <div className="cart-item-name" title={item.name}>
                              {item.name}
                            </div>
                            <div className="cart-item-price">
                              {formatPrice(item.price)}
                            </div>
                            {item.selectedSize && (
                              <div className="cart-item-size">
                                ზომა: {item.selectedSize}
                              </div>
                            )}
                          </div>
                          
                          <div className="cart-item-controls">
                            <div className="quantity-controls">
                              <button 
                                className="quantity-btn quantity-minus"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuantityChange(item.id, item.quantity - 1);
                                }}
                                disabled={item.quantity <= 1}
                              >
                                <FaMinus />
                              </button>
                              <span className="quantity-display">{item.quantity}</span>
                              <button 
                                className="quantity-btn quantity-plus"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuantityChange(item.id, item.quantity + 1);
                                }}
                              >
                                <FaPlus />
                              </button>
                            </div>
                            <button 
                              className="remove-item-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveItem(item.id, item.name);
                              }}
                              title="პროდუქტის წაშლა"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      {cartItems.length > 4 && (
                        <div className="cart-more-items">
                          <span>და კიდევ {cartItems.length - 4} პროდუქტი...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {cartItems.length > 0 && (
                  <>
                    <div className="cart-dropdown-summary">
                      <div className="cart-total-row">
                        <span className="total-label">სულ ღირებულება:</span>
                        <span className="total-amount">{formatPrice(cartTotal)}</span>
                      </div>
                      {cartItems.length > 1 && (
                        <div className="cart-savings">
                          <small>დღეს დაზოგე 15% ყველა პროდუქტზე!</small>
                        </div>
                      )}
                    </div>
                    
                    <div className="cart-dropdown-actions">
                      <button 
                        className="view-cart-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenCart();
                        }}
                      >
                        კალათის ნახვა
                      </button>
                      <button 
                        className="checkout-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowCart(false);
                          navigate('/checkout');
                        }}
                      >
                        შეკვეთა
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
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
              {/* Show forgot password form if in forgot password mode */}
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
                  {/* OAuth Buttons Section - only show in login mode */}
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

                  {/* Email/Password Form */}
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