// CartPage.jsx - Fixed image loading and removed price calculations
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTrash, FaMinus, FaPlus, FaShoppingCart, FaArrowLeft, FaExclamationTriangle, FaSync } from 'react-icons/fa';
import { useCart } from '../contexts/CartContext';
import { apiService } from '../services/api';
import Header from '../components/Header';
import Footer from '../components/Footer';
import './CartPage.css';

const CartPage = () => {
  const navigate = useNavigate();
  const { 
    items: cartItems, 
    cartItemCount, 
    cartTotal, 
    updateQuantity, 
    removeFromCart,
    clearCart,
    loading,
    syncWithServerCart
  } = useCart();

  // Local state
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [itemToRemove, setItemToRemove] = useState(null);
  const [unavailableItems, setUnavailableItems] = useState([]);
  const [syncLoading, setSyncLoading] = useState(false);
  const [priceChanges, setPriceChanges] = useState([]);
  const [productImages, setProductImages] = useState({});
  const [imagesLoading, setImagesLoading] = useState(false);

  const getFirstImageUrl = (imageUrl) => {
    if (!imageUrl) return '/default.jpg';
    
    const lastDashIndex = imageUrl.lastIndexOf('-');
    const dotIndex = imageUrl.lastIndexOf('.');
    
    if (lastDashIndex !== -1 && dotIndex !== -1 && lastDashIndex < dotIndex) {
      const numberPart = imageUrl.substring(lastDashIndex + 1, dotIndex);
      if (/^\d+$/.test(numberPart)) {
        return imageUrl.substring(0, lastDashIndex + 1) + '1' + imageUrl.substring(dotIndex);
      }
    }
    
    return imageUrl;
  };

  useEffect(() => {
    const fetchCartItemImages = async () => {
      if (cartItems.length === 0) return;
      
      try {
        setImagesLoading(true);
        const imagesMap = await apiService.fetchProductImages();
        
        // Process the images to ensure we get the first image for each product
        const processedImagesMap = {};
        Object.keys(imagesMap).forEach(productId => {
          processedImagesMap[productId] = getFirstImageUrl(imagesMap[productId]);
        });
        
        setProductImages(processedImagesMap);
      } catch (error) {
        console.error('Error fetching cart item images:', error);
        setProductImages({});
      } finally {
        setImagesLoading(false);
      }
    };

    fetchCartItemImages();
  }, [cartItems]);

  // Check for product availability and price changes on mount and cart changes
  useEffect(() => {
    checkProductAvailability();
  }, [cartItems]);

  // Sync with server cart on mount if user is authenticated
  useEffect(() => {
    if (apiService.isAuthenticated()) {
      syncWithServerCart();
    }
  }, []);

  const checkProductAvailability = async () => {
    if (cartItems.length === 0) return;

    try {
      setSyncLoading(true);
      const unavailable = [];
      const priceUpdates = [];

      console.log('Checking availability for cart items:', cartItems);

      // Check each cart item
      for (const cartItem of cartItems) {
        try {
          console.log(`Checking product ${cartItem.id}...`);
          
          // Use the correct method name
          const currentProduct = await apiService.getProductById(cartItem.id);
          
          console.log('Product data received:', currentProduct);

          // Check if product exists and is available
          if (!currentProduct) {
            console.log(`Product ${cartItem.id} not found`);
            unavailable.push(cartItem);
            continue;
          }

          // Check availability - simple boolean check
          const isAvailable = currentProduct.in_stock === true;

          if (!isAvailable) {
            console.log(`Product ${cartItem.id} is out of stock:`, {
              in_stock: currentProduct.in_stock
            });
            unavailable.push(cartItem);
            continue;
          }

          // Check price changes
          const currentPrice = parseFloat(currentProduct.price) || 0;
          const cartPrice = parseFloat(cartItem.price) || 0;
          
          if (Math.abs(currentPrice - cartPrice) > 0.01) { // Allow for small floating point differences
            console.log(`Price changed for ${cartItem.id}: ${cartPrice} → ${currentPrice}`);
            priceUpdates.push({
              id: cartItem.id,
              name: cartItem.name,
              oldPrice: cartItem.price,
              newPrice: currentProduct.price
            });
          }

        } catch (error) {
          console.error(`Error checking product ${cartItem.id}:`, error);
          // If we can't fetch the product, assume it's unavailable
          unavailable.push(cartItem);
        }
      }

      console.log('Availability check results:', {
        unavailable: unavailable.length,
        priceChanges: priceUpdates.length
      });

      setUnavailableItems(unavailable);
      setPriceChanges(priceUpdates);

    } catch (error) {
      console.error('Error checking product availability:', error);
      // Show user-friendly error message
      if (window.showToast) {
        window.showToast('მონაცემების განახლების შეცდომა', 'error');
      }
    } finally {
      setSyncLoading(false);
    }
  };

  // Format price with currency
  const formatPrice = (price) => {
    if (typeof price !== 'number') {
      price = parseFloat(price) || 0;
    }
    return `₾${price.toLocaleString('ka-GE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  // Handle quantity change
  const handleQuantityChange = async (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      handleRemoveItem(itemId);
      return;
    }
    await updateQuantity(itemId, newQuantity);
  };

  // Handle remove item with confirmation
  const handleRemoveItem = (itemId, itemName = '') => {
    setItemToRemove({ id: itemId, name: itemName });
  };

  const confirmRemoveItem = async () => {
    if (itemToRemove) {
      await removeFromCart(itemToRemove.id);
      setItemToRemove(null);
      
      // Remove from unavailable items list if it was there
      setUnavailableItems(prev => prev.filter(item => item.id !== itemToRemove.id));
    }
  };

  // Handle clear cart
  const handleClearCart = () => {
    setShowClearConfirm(true);
  };

  const confirmClearCart = async () => {
    await clearCart();
    setShowClearConfirm(false);
    setUnavailableItems([]);
    setPriceChanges([]);
  };

  // Remove unavailable items
  const handleRemoveUnavailableItems = async () => {
    for (const item of unavailableItems) {
      await removeFromCart(item.id);
    }
    setUnavailableItems([]);
  };

  // Continue shopping
  const handleContinueShopping = () => {
    navigate('/');
  };

  // Proceed to checkout
  const handleCheckout = () => {
    if (unavailableItems.length > 0) {
      alert('გთხოვთ წაშალოთ მიუწვდომელი პროდუქტები შეკვეთამდე');
      return;
    }
    navigate('/checkout');
  };

  // Refresh cart data
  const handleRefreshCart = async () => {
    setSyncLoading(true);
    await checkProductAvailability();
    if (apiService.isAuthenticated()) {
      await syncWithServerCart();
    }
  };

  // Get cart summary with available items only
  const getAvailableCartSummary = () => {
    const availableItems = cartItems.filter(
      item => !unavailableItems.some(unavailable => unavailable.id === item.id)
    );
    
    const availableItemCount = availableItems.reduce((total, item) => total + item.quantity, 0);
    const availableTotal = availableItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    
    return { availableItems, availableItemCount, availableTotal };
  };

  const { availableItems, availableItemCount, availableTotal } = getAvailableCartSummary();

  return (
    <div className="cart-page">
      <Header />
      
      <div className="cart-container">
        {/* Cart Header */}
        <div className="cart-header">
          <div className="cart-header-content">
            <div className="cart-header-left">
              <button
                onClick={handleContinueShopping}
                className="back-button"
              >
                <FaArrowLeft />
                უკან დაბრუნება
              </button>
              <h1 className="cart-title">
                <FaShoppingCart />
                შენი კალათა
              </h1>
              {syncLoading && (
                <div className="sync-indicator">
                  <FaSync className="spinning" />
                </div>
              )}
            </div>
            
            <div className="cart-header-actions">
              <button
                onClick={handleRefreshCart}
                disabled={syncLoading}
                className="refresh-button"
                title="მონაცემების განახლება"
              >
                <FaSync className={syncLoading ? 'spinning' : ''} />
              </button>
              
              {cartItems.length > 0 && (
                <button
                  onClick={handleClearCart}
                  className="clear-cart-button"
                >
                  <FaTrash />
                  კალათის გაწმენდა
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Notifications */}
        {unavailableItems.length > 0 && (
          <div className="cart-alert unavailable-alert">
            <FaExclamationTriangle />
            <div className="alert-content">
              <strong>მიუწვდომელი პროდუქტები</strong>
              <p>{unavailableItems.length} პროდუქტი აღარ არის მარაგში</p>
              <button 
                onClick={handleRemoveUnavailableItems}
                className="alert-action-btn"
              >
                წაშლა
              </button>
            </div>
          </div>
        )}

        {priceChanges.length > 0 && (
          <div className="cart-alert price-change-alert">
            <FaExclamationTriangle />
            <div className="alert-content">
              <strong>ფასების ცვლილება</strong>
              <p>{priceChanges.length} პროდუქტის ფასი შეიცვალა</p>
              <button 
                onClick={checkProductAvailability}
                className="alert-action-btn"
              >
                განახლება
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="cart-content">
          {cartItems.length === 0 ? (
            // Empty Cart State
            <div className="empty-cart">
              <div className="empty-cart-icon">🛒</div>
              <h2 className="empty-cart-title">კალათა ცარიელია</h2>
              <p className="empty-cart-subtitle">
                დაამატე პროდუქტები შესყიდვისთვის
              </p>
              <button
                onClick={handleContinueShopping}
                className="continue-shopping-btn"
              >
                შოპინგის გაგრძელება
              </button>
            </div>
          ) : (
            // Cart with Items
            <div className="cart-layout">
              {/* Cart Items */}
              <div className="cart-items-section">
                {/* Items Header */}
                <div className="cart-items-header">
                  <div className="items-header-grid">
                    <div>პროდუქტი</div>
                    <div>ფასი</div>
                    <div>რაოდენობა</div>
                    <div>სულ</div>
                    <div></div>
                  </div>
                </div>

                {/* Cart Items List */}
                <div className="cart-items-list">
                  {cartItems.map((item, index) => {
                    const isUnavailable = unavailableItems.some(unavailable => unavailable.id === item.id);
                    const priceChange = priceChanges.find(change => change.id === item.id);
                    
                    // Get the correct image - prioritize productImages from API
                    const itemImage = productImages[item.id] || item.image || item.imageUrl || '/api/placeholder/80/80';
                    
                    return (
                      <div
                        key={`${item.id}-${item.selectedSize || 'no-size'}`}
                        className={`cart-item ${index < cartItems.length - 1 ? 'has-border' : ''} ${isUnavailable ? 'unavailable' : ''}`}
                      >
                        <div className="cart-item-grid">
                          {/* Product Info */}
                          <div className="cart-item-info">
                            <div className="cart-item-image-container">
                              <img
                                src={itemImage}
                                alt={item.name}
                                className="cart-item-image"
                                onError={(e) => {
                                  e.target.src = '/api/placeholder/80/80';
                                }}
                              />
                              {isUnavailable && (
                                <div className="unavailable-overlay">
                                  <span>მიუწვდომელი</span>
                                </div>
                              )}
                            </div>
                            <div className="cart-item-details">
                              <h3 className="cart-item-name">{item.name}</h3>
                              {item.brand && (
                                <p className="cart-item-brand">{item.brand}</p>
                              )}
                              {item.selectedSize && (
                                <p className="cart-item-size">
                                  ზომა: {item.selectedSize}
                                </p>
                              )}
                              {priceChange && (
                                <div className="price-change-notice">
                                  <small>
                                    ფასი შეიცვალა: {formatPrice(priceChange.oldPrice)} → {formatPrice(priceChange.newPrice)}
                                  </small>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Price */}
                          <div className="cart-item-price">
                            {priceChange ? (
                              <div className="price-with-change">
                                <span className="old-price">{formatPrice(priceChange.oldPrice)}</span>
                                <span className="new-price">{formatPrice(priceChange.newPrice)}</span>
                              </div>
                            ) : (
                              formatPrice(item.price)
                            )}
                          </div>

                          {/* Quantity Controls */}
                          <div className="quantity-controls">
                            <button
                              onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                              disabled={loading || item.quantity <= 1 || isUnavailable}
                              className={`quantity-btn quantity-minus ${item.quantity <= 1 || isUnavailable ? 'disabled' : ''}`}
                            >
                              <FaMinus />
                            </button>
                            <span className="quantity-display">{item.quantity}</span>
                            <button
                              onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                              disabled={loading || isUnavailable}
                              className={`quantity-btn quantity-plus ${isUnavailable ? 'disabled' : ''}`}
                            >
                              <FaPlus />
                            </button>
                          </div>

                          {/* Item Total */}
                          <div className="cart-item-total">
                            {formatPrice((priceChange?.newPrice || item.price) * item.quantity)}
                          </div>

                          {/* Remove Button */}
                          <div className="remove-item-container">
                            <button
                              onClick={() => handleRemoveItem(item.id, item.name)}
                              disabled={loading}
                              className="remove-item-btn"
                              title="პროდუქტის წაშლა"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order Summary */}
              <div className="order-summary">
                {/* Summary Header */}
                <div className="summary-header">
                  <h3>შეკვეთის შეჯამება</h3>
                  {unavailableItems.length > 0 && (
                    <small className="summary-note">
                      მიუწვდომელი პროდუქტები არ ითვლება
                    </small>
                  )}
                </div>

                {/* Summary Details */}
                <div className="summary-content">
                  <div className="summary-row">
                    <span>მიუწვდომელი პროდუქტები ({availableItemCount})</span>
                    <span>{formatPrice(availableTotal)}</span>
                  </div>

                  {unavailableItems.length > 0 && (
                    <div className="summary-row unavailable-row">
                      <span>მიუწვდომელი პროდუქტები ({unavailableItems.length})</span>
                      <span className="unavailable-text">-</span>
                    </div>
                  )}

                  <div className="summary-row">
                    <span>მიწოდება</span>
                    <span className="free-shipping">უფასო</span>
                  </div>

                  <div className="summary-divider"></div>

                  <div className="summary-total">
                    <span>სულ ღირებულება</span>
                    <span>{formatPrice(availableTotal)}</span>
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={loading || availableItems.length === 0}
                    className={`checkout-btn ${availableItems.length === 0 ? 'disabled' : ''}`}
                  >
                    {unavailableItems.length > 0 ? 
                      `შეკვეთა (${availableItemCount} პროდუქტი)` : 
                      'შეკვეთის გაფორმება'
                    }
                  </button>

                  <button
                    onClick={handleContinueShopping}
                    className="continue-shopping-btn-secondary"
                  >
                    შოპინგის გაგრძელება
                  </button>

                  {/* Availability Info */}
                  {unavailableItems.length > 0 && (
                    <div className="availability-info">
                      <p className="availability-text">
                        <FaExclamationTriangle />
                        {unavailableItems.length} პროდუქტი მიუწვდომელია
                      </p>
                      <button 
                        onClick={handleRemoveUnavailableItems}
                        className="remove-unavailable-btn"
                      >
                        მიუწვდომელების წაშლა
                      </button>
                    </div>
                  )}

                  {/* Last Updated */}
                  {!syncLoading && (
                    <div className="last-updated">
                      <small>ბოლო განახლება: {new Date().toLocaleString('ka-GE')}</small>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Remove Item Confirmation Modal */}
      {itemToRemove && (
        <div className="modal-overlay">
          <div className="confirmation-modal">
            <h3>პროდუქტის წაშლა</h3>
            <p>
              გსურთ "{itemToRemove.name}" წაშალება კალათიდან?
            </p>
            <div className="modal-actions">
              <button
                onClick={() => setItemToRemove(null)}
                className="cancel-btn"
              >
                გაუქმება
              </button>
              <button
                onClick={confirmRemoveItem}
                className="confirm-btn delete"
              >
                წაშლა
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Cart Confirmation Modal */}
      {showClearConfirm && (
        <div className="modal-overlay">
          <div className="confirmation-modal">
            <h3>კალათის გაწმენდა</h3>
            <p>
              გსურთ კალათის გაწმენდა? ყველა პროდუქტი წაიშლება.
            </p>
            <div className="modal-actions">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="cancel-btn"
              >
                გაუქმება
              </button>
              <button
                onClick={confirmClearCart}
                className="confirm-btn delete"
              >
                გაწმენდა
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {(loading || syncLoading) && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <FaSync className="spinning" />
          </div>
          <div className="loading-text">
            {syncLoading ? 'მონაცემების განახლება...' : 'იტვირთება...'}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default CartPage;