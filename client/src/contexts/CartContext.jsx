// CartContext.jsx - Enhanced with API integration
import { createContext, useContext, useReducer, useEffect } from 'react';
import { apiService } from '../services/api'; // Your API service

// Cart action types
const CART_ACTIONS = {
  ADD_ITEM: 'ADD_ITEM',
  REMOVE_ITEM: 'REMOVE_ITEM',
  UPDATE_QUANTITY: 'UPDATE_QUANTITY',
  CLEAR_CART: 'CLEAR_CART',
  LOAD_CART: 'LOAD_CART',
  SET_LOADING: 'SET_LOADING',
  SYNC_PRODUCT_DATA: 'SYNC_PRODUCT_DATA'
};

// Initial cart state
const initialState = {
  items: [],
  cartItemCount: 0,
  cartTotal: 0,
  loading: false
};

// Cart reducer
const cartReducer = (state, action) => {
  console.log('🛒 Cart Action:', action.type, action.payload);
  
  switch (action.type) {
    case CART_ACTIONS.LOAD_CART: {
      const items = action.payload || [];
      const cartItemCount = items.reduce((total, item) => total + item.quantity, 0);
      const cartTotal = items.reduce((total, item) => total + (item.price * item.quantity), 0);
      
      return {
        ...state,
        items,
        cartItemCount,
        cartTotal
      };
    }

    case CART_ACTIONS.SYNC_PRODUCT_DATA: {
      const updatedItems = action.payload;
      const cartItemCount = updatedItems.reduce((total, item) => total + item.quantity, 0);
      const cartTotal = updatedItems.reduce((total, item) => total + (item.price * item.quantity), 0);
      
      return {
        ...state,
        items: updatedItems,
        cartItemCount,
        cartTotal
      };
    }

    case CART_ACTIONS.ADD_ITEM: {
      const { product, quantity = 1, selectedSize } = action.payload;
      
      // Check if item already exists (same product and size)
      const existingItemIndex = state.items.findIndex(
        item => item.id === product.id && item.selectedSize === selectedSize
      );

      let newItems;
      if (existingItemIndex >= 0) {
        // Update existing item quantity
        newItems = state.items.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        // Add new item
        const newItem = {
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image || product.imageUrl,
          selectedSize: selectedSize,
          quantity: quantity,
          brand: product.brand,
          addedAt: new Date().toISOString(),
          // Store minimal data, will be synced later
          needsSync: true
        };
        newItems = [...state.items, newItem];
      }

      const cartItemCount = newItems.reduce((total, item) => total + item.quantity, 0);
      const cartTotal = newItems.reduce((total, item) => total + (item.price * item.quantity), 0);

      return {
        ...state,
        items: newItems,
        cartItemCount,
        cartTotal
      };
    }

    case CART_ACTIONS.REMOVE_ITEM: {
      const itemId = action.payload;
      const newItems = state.items.filter(item => item.id !== itemId);
      const cartItemCount = newItems.reduce((total, item) => total + item.quantity, 0);
      const cartTotal = newItems.reduce((total, item) => total + (item.price * item.quantity), 0);

      return {
        ...state,
        items: newItems,
        cartItemCount,
        cartTotal
      };
    }

    case CART_ACTIONS.UPDATE_QUANTITY: {
      const { itemId, quantity } = action.payload;
      
      if (quantity <= 0) {
        // Remove item if quantity is 0 or less
        const newItems = state.items.filter(item => item.id !== itemId);
        const cartItemCount = newItems.reduce((total, item) => total + item.quantity, 0);
        const cartTotal = newItems.reduce((total, item) => total + (item.price * item.quantity), 0);

        return {
          ...state,
          items: newItems,
          cartItemCount,
          cartTotal
        };
      }

      const newItems = state.items.map(item =>
        item.id === itemId
          ? { ...item, quantity: Math.max(1, quantity) }
          : item
      );

      const cartItemCount = newItems.reduce((total, item) => total + item.quantity, 0);
      const cartTotal = newItems.reduce((total, item) => total + (item.price * item.quantity), 0);

      return {
        ...state,
        items: newItems,
        cartItemCount,
        cartTotal
      };
    }

    case CART_ACTIONS.CLEAR_CART: {
      return {
        ...state,
        items: [],
        cartItemCount: 0,
        cartTotal: 0
      };
    }

    case CART_ACTIONS.SET_LOADING: {
      return {
        ...state,
        loading: action.payload
      };
    }

    default:
      return state;
  }
};

// Create context
const CartContext = createContext();

// Local storage key
const CART_STORAGE_KEY = 'elclasico_cart';

// Helper functions for cookies
const getCookieValue = (name) => {
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [cookieName, cookieValue] = cookie.trim().split('=');
    if (cookieName === name) {
      try {
        return JSON.parse(decodeURIComponent(cookieValue));
      } catch {
        return decodeURIComponent(cookieValue);
      }
    }
  }
  return null;
};

// Cart provider component
export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        console.log('🛒 Loading cart from localStorage:', parsedCart);
        dispatch({ type: CART_ACTIONS.LOAD_CART, payload: parsedCart });
      }
    } catch (error) {
      console.error('🛒 Error loading cart from localStorage:', error);
      localStorage.removeItem(CART_STORAGE_KEY);
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.items));
      console.log('🛒 Cart saved to localStorage:', state.items);
    } catch (error) {
      console.error('🛒 Error saving cart to localStorage:', error);
    }
  }, [state.items]);

  // Sync product data from API when cart loads or changes
  useEffect(() => {
    const syncProductData = async () => {
      if (state.items.length === 0) return;
      
      try {
        // Get product IDs that need syncing
        const productIds = state.items
          .filter(item => item.needsSync || !item.updatedAt)
          .map(item => item.id);
        
        if (productIds.length === 0) return;

        console.log('🛒 Syncing product data for IDs:', productIds);
        
        // Fetch fresh product data from API
        const freshProducts = await Promise.all(
          productIds.map(id => apiService.getProductById(id).catch(() => null))
        );

        // Update cart items with fresh data
        const updatedItems = state.items.map(cartItem => {
          const freshProduct = freshProducts.find(p => p && p.id === cartItem.id);
          
          if (freshProduct) {
            return {
              ...cartItem,
              name: freshProduct.name,
              price: freshProduct.price,
              image: freshProduct.image || freshProduct.imageUrl,
              brand: freshProduct.brand,
              // Check if product is still available
              available: freshProduct.available !== false,
              // Update timestamp
              updatedAt: new Date().toISOString(),
              needsSync: false
            };
          }
          
          return cartItem;
        });

        dispatch({ type: CART_ACTIONS.SYNC_PRODUCT_DATA, payload: updatedItems });
        
      } catch (error) {
        console.error('🛒 Error syncing product data:', error);
      }
    };

    // Debounce sync to avoid too many API calls
    const timeoutId = setTimeout(syncProductData, 500);
    return () => clearTimeout(timeoutId);
  }, [state.items.length]); // Only trigger when item count changes

  // Show notification helper
  const showNotification = (message, type = 'success') => {
    // Try to use existing notification system if available
    const existingNotificationSystem = window.showNotification;
    if (existingNotificationSystem) {
      existingNotificationSystem(message, type);
      return;
    }

    // Fallback: create notification element
    const notification = document.createElement('div');
    notification.className = `cart-notification cart-notification-${type}`;
    notification.innerHTML = `
      <div class="cart-notification-content">
        <span class="cart-notification-message">${message}</span>
        <button class="cart-notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;
    
    // Add styles
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#4CAF50' : '#f44336'};
      color: white;
      padding: 12px 16px;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      z-index: 10000;
      max-width: 300px;
      animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 4 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }
    }, 4000);
  };

  // Enhanced cart actions
  const addToCart = async (product, quantity = 1, selectedSize = null) => {
    try {
      console.log('🛒 Adding to cart:', { product, quantity, selectedSize });
      
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: true });
      
      // Validate product
      if (!product || !product.id || !product.name || !product.price) {
        throw new Error('არასწორი პროდუქტის მონაცემები');
      }

      // Validate quantity
      if (quantity <= 0) {
        throw new Error('რაოდენობა უნდა იყოს დადებითი რიცხვი');
      }

      // Check if size is required but not provided
      if (product.sizes && product.sizes.length > 0 && !selectedSize) {
        throw new Error('გთხოვთ აირჩიოთ ზომა');
      }

      // Try to get fresh product data from API
      try {
        const freshProduct = await apiService.getProductById(product.id);
        if (freshProduct) {
          product = { ...product, ...freshProduct, needsSync: false };
        }
      } catch (apiError) {
        console.warn('🛒 Could not fetch fresh product data:', apiError);
        // Continue with provided product data
      }

      dispatch({
        type: CART_ACTIONS.ADD_ITEM,
        payload: { product, quantity, selectedSize }
      });

      // Show success notification
      const sizeText = selectedSize ? ` (ზომა: ${selectedSize})` : '';
      showNotification(`"${product.name}"${sizeText} დაემატა კალათში`, 'success');
      
      console.log('🛒 Item added successfully');
      return true;

    } catch (error) {
      console.error('🛒 Error adding to cart:', error);
      showNotification(error.message, 'error');
      return false;
    } finally {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: false });
    }
  };

  const removeFromCart = async (itemId) => {
    try {
      console.log('🛒 Removing from cart:', itemId);
      
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: true });
      
      const item = state.items.find(item => item.id === itemId);
      if (item) {
        dispatch({ type: CART_ACTIONS.REMOVE_ITEM, payload: itemId });
        showNotification(`"${item.name}" წაშალდა კალათიდან`, 'success');
      }
      
      return true;

    } catch (error) {
      console.error('🛒 Error removing from cart:', error);
      showNotification('პროდუქტის წაშლა ვერ მოხერხდა', 'error');
      return false;
    } finally {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: false });
    }
  };

  const updateQuantity = async (itemId, quantity) => {
    try {
      console.log('🛒 Updating quantity:', { itemId, quantity });
      
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: true });
      
      dispatch({
        type: CART_ACTIONS.UPDATE_QUANTITY,
        payload: { itemId, quantity }
      });
      
      return true;

    } catch (error) {
      console.error('🛒 Error updating quantity:', error);
      showNotification('რაოდენობის განახლება ვერ მოხერხდა', 'error');
      return false;
    } finally {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: false });
    }
  };

  const clearCart = async () => {
    try {
      console.log('🛒 Clearing cart');
      
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: CART_ACTIONS.CLEAR_CART });
      showNotification('კალათა გაიწმინდა', 'success');
      
      return true;

    } catch (error) {
      console.error('🛒 Error clearing cart:', error);
      showNotification('კალათის გაწმენდა ვერ მოხერხდა', 'error');
      return false;
    } finally {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: false });
    }
  };

  // Helper functions
  const isInCart = (productId, selectedSize = null) => {
    return state.items.some(
      item => item.id === productId && 
      (selectedSize === null || item.selectedSize === selectedSize)
    );
  };

  const getItemQuantity = (productId, selectedSize = null) => {
    const item = state.items.find(
      item => item.id === productId && 
      (selectedSize === null || item.selectedSize === selectedSize)
    );
    return item ? item.quantity : 0;
  };

  const getTotalItems = () => {
    return state.cartItemCount;
  };

  const getTotalPrice = () => {
    return state.cartTotal;
  };

  const getCartSummary = () => {
    return {
      itemCount: state.cartItemCount,
      totalPrice: state.cartTotal,
      items: state.items,
      isEmpty: state.items.length === 0
    };
  };

  // Get product data from cookies if needed
  const getProductFromCookie = (productId) => {
    try {
      const cookieData = getCookieValue(`product_${productId}`);
      return cookieData;
    } catch (error) {
      console.error('Error getting product from cookie:', error);
      return null;
    }
  };

  // Sync with server cart if user is logged in
  const syncWithServerCart = async () => {
    try {
      if (!apiService.isAuthenticated()) return;

      const serverCart = await apiService.getCart();
      if (serverCart && serverCart.items) {
        dispatch({ type: CART_ACTIONS.LOAD_CART, payload: serverCart.items });
        console.log('🛒 Cart synced with server');
      }
    } catch (error) {
      console.error('🛒 Error syncing with server cart:', error);
    }
  };

  // Value to provide to context consumers
  const contextValue = {
    // State
    items: state.items,
    cartItemCount: state.cartItemCount,
    cartTotal: state.cartTotal,
    loading: state.loading,

    // Actions
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    syncWithServerCart,

    // Helpers
    isInCart,
    getItemQuantity,
    getTotalItems,
    getTotalPrice,
    getCartSummary,
    getProductFromCookie
  };

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};

// Custom hook to use cart context
export const useCart = () => {
  const context = useContext(CartContext);
  
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  
  return context;
};

// Export context for advanced usage
export { CartContext };

// Export action types for external use
export { CART_ACTIONS };