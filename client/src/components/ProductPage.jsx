import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { ArrowLeft, Heart, Share2, ShoppingCart, Star, Minus, Plus, ChevronLeft, ChevronRight, User, ThumbsUp, Send } from "lucide-react";
import './ProductPage.css';
import { useCart } from '../contexts/CartContext.jsx';


const ProductPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [images, setImages] = useState([]); // Corrected state for storing image URLs
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imagesError, setImagesError] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [userVotes, setUserVotes] = useState({});

  const { addToCart, isInCart, getItemQuantity } = useCart();
  
  // Review form states
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(0);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

  // Get current user
  const currentUser = apiService.getCurrentUserFromSession();
  const isAuthenticated = apiService.isAuthenticated();

   useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
  }, [productId]); 

  // Toast function
  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 3000);
  };

  useEffect(() => {
    const fetchUserVotes = async () => {
      if (!productId || !isAuthenticated) return;
      
      try {
        const voteStatus = await apiService.getUserVoteStatus(productId);
        setUserVotes(voteStatus);
      } catch (error) {
        console.error('Error fetching user vote status:', error);
        setUserVotes({});
      }
    };

    if (reviews.length > 0) {
      fetchUserVotes();
    }
  }, [productId, isAuthenticated, reviews.length]);

  // Fetch product data
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const productData = await apiService.fetchProductById(productId);

        let parsedSizes = [];
        if (productData.sizes) {
          try {
            if (typeof productData.sizes === 'string') {
              parsedSizes = JSON.parse(productData.sizes);
            } else if (Array.isArray(productData.sizes)) {
              parsedSizes = productData.sizes;
            }
          } catch (parseError) {
            console.error('Error parsing sizes from database:', parseError);
            if (typeof productData.sizes === 'string') {
              parsedSizes = productData.sizes.split(',').map(size => size.trim());
            }
          }
        }

        const sortedSizes = parsedSizes.sort((a, b) => {
          const numA = parseFloat(a);
          const numB = parseFloat(b);
          return numA - numB;
        });

        const transformedProduct = {
          id: productData.id,
          name: productData.name,
          brand: productData.brand || 'N/A',
          price: productData.price,
          originalPrice: productData.original_price,
          discount: productData.discount || 0,
          rating: productData.rating || 0,
          reviewCount: productData.review_count || 0,
          description: productData.description || 'No description available',
          inStock: productData.in_stock,
          stockCount: productData.stock_count || 0,
          sizes: sortedSizes,
          colors: productData.colors || [],
          features: productData.features || []
        };

        setProduct(transformedProduct);
        if (transformedProduct.colors.length > 0) setSelectedColor(transformedProduct.colors[0]);
      } catch (error) {
        console.error('Error fetching product:', error);
        setError('Failed to load product. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    if (productId) fetchProduct();
  }, [productId]);

  // Fetch product images using the new API method
  useEffect(() => {
    const fetchImages = async () => {
      if (!productId) return;

      try {
        setImagesLoading(true);
        setImagesError(null);
        
        // This is the correct way to fetch images for a single product
        const productImages = await apiService.fetchProductImagesByProductId(productId);
        setImages(productImages); 

      } catch (error) {
        console.error('Error fetching images:', error);
        setImagesError('Failed to load product images.');
        setImages([]);
      } finally {
        setImagesLoading(false);
      }
    };

    fetchImages();
  }, [productId]);

  useEffect(() => {
  const fetchReviews = async () => {
    if (!productId) return;
    
    try {
      setReviewsLoading(true);
      const productReviews = await apiService.fetchProductReviews(productId);
      setReviews(productReviews);
      
      // Update product rating and review count based on fetched reviews
      if (productReviews.length > 0) {
        const avgRating = productReviews.reduce((sum, review) => sum + review.star_count, 0) / productReviews.length;
        setProduct(prev => prev ? { 
          ...prev, 
          rating: avgRating, 
          reviewCount: productReviews.length 
        } : null);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  };

  fetchReviews();
}, [productId]);

  const handleAddToCart = async () => {
    if (!product?.inStock) {
      showToast("სამწუხაროდ, ეს პროდუქტი მარაგში არ არის", 'error');
      return;
    }
    
    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      showToast("გთხოვთ აირჩიოთ ზომა", 'warning');
      return;
    }

    // Prepare product data for cart
    const productForCart = {
      id: product.id,
      name: product.name,
      price: product.price,
      image: images[0] || '/default.jpg', // Use first image or default
      brand: product.brand,
      sizes: product.sizes
    };

    console.log("Adding to cart:", {
      productId: product.id,
      size: selectedSize,
      color: selectedColor,
      quantity
    });

    // Add to cart using cart context
    const success = await addToCart(productForCart, quantity, selectedSize);
    
    if (success) {
      // The cart context will show its own success notification
      // You can remove the showToast call here or keep it for additional feedback
      console.log(`${product.name} successfully added to cart!`);
    } else {
      showToast('პროდუქტის კალათში დამატება ვერ მოხერხდა', 'error');
    }
  };

  // Optional: You can add helper functions to check cart status
  const isProductInCart = () => {
    return isInCart(product?.id, selectedSize);
  };

  const getProductQuantityInCart = () => {
    return getItemQuantity(product?.id, selectedSize);
  };

  const handleGoBack = () => navigate(-1);
  
  // Functions to navigate images
  const nextImage = () => {
    if (images.length > 1) {
      setSelectedImageIndex((prev) => (prev + 1) % images.length);
    }
  };

  const prevImage = () => {
    if (images.length > 1) {
      setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      showToast('შესვლა საჭიროა შეფასების დასატოვებლად', 'warning');
      navigate('/login');
      return;
    }

    if (!reviewText.trim() || reviewRating === 0) {
      showToast('გთხოვთ შეავსოთ ყველა ველი', 'warning');
      return;
    }

    const reviewStatus = apiService.canUserLeaveReviews();
    if (!reviewStatus.canReview) {
      if (reviewStatus.reason === 'incomplete_profile') {
        const shouldGoToProfile = window.confirm(
          'შეფასების დასატოვებლად საჭიროა პროფილის შევსება (სახელი და გვარი).\n\nგსურთ პროფილის გვერდზე გადასვლა?'
        );
        
        if (shouldGoToProfile) {
          navigate('/profile');
        }
      }
      return;
    }

    try {
      setIsSubmittingReview(true);
      
      const reviewData = {
        product_id: productId,
        review_text: reviewText.trim(),
        star_count: reviewRating
      };

      const result = await apiService.createReview(reviewData);
      
      if (result === null) {
        return;
      }
      
      setReviewText('');
      setReviewRating(0);
      setShowReviewForm(false);
      
      const updatedReviews = await apiService.fetchProductReviews(productId);
      setReviews(updatedReviews);
      
      if (updatedReviews.length > 0) {
        const avgRating = updatedReviews.reduce((sum, review) => sum + review.star_count, 0) / updatedReviews.length;
        setProduct(prev => prev ? { ...prev, rating: avgRating, reviewCount: updatedReviews.length } : null);
      }
      
      showToast('შეფასება წარმატებით დაემატა!', 'success');
      
    } catch (error) {
      console.error('Error submitting review:', error);
      
      const errorMessage = error?.message || 'შეფასების დამატება ვერ მოხერხდა';
      
      if (errorMessage.includes('პროფილი არ არის დასრულებული') || errorMessage.includes('შეავსოთ სახელი')) {
        const shouldGoToProfile = window.confirm(
          'შეფასების დასატოვებლად საჭიროა პროფილის შევსება (სახელი და გვარი).\n\nგსურთ პროფილის გვერდზე გადასვლა?'
        );
        
        if (shouldGoToProfile) {
          navigate('/profile');
        }
      } else if (errorMessage.includes('ავტორიზაცია')) {
        const shouldGoToLogin = window.confirm(
          'ავტორიზაციის პრობლემაა.\n\nგსურთ თავიდან შესვლა?'
        );
        
        if (shouldGoToLogin) {
          apiService.clearAuthData();
          navigate('/login');
        }
      } else {
        showToast(errorMessage, 'error');
      }
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleShowReviewForm = async () => {
    if (!isAuthenticated) {
      showToast('შესვლა საჭიროა შეფასების დასატოვებლად', 'warning');
      navigate('/login');
      return;
    }

    try {
      await apiService.refreshUserData();
      
      const reviewStatus = apiService.canUserLeaveReviews();
      if (!reviewStatus.canReview) {
        if (reviewStatus.reason === 'incomplete_profile') {
          const shouldGoToProfile = window.confirm(
            'შეფასების დასატოვებლად საჭიროა პროფილის შევსება (სახელი და გვარი).\n\nგსურთ პროფილის გვერდზე გადასვლა?'
          );
          
          if (shouldGoToProfile) {
            navigate('/profile');
          }
        }
        return;
      }
      
      setShowReviewForm(true);
    } catch (error) {
      console.error('Error checking user profile:', error);
      showToast('შეცდომა მოხდა. სცადეთ ხელახლა', 'error');
    }
  };

  const handleHelpfulReview = async (reviewId) => {
    if (!isAuthenticated) {
      showToast('შეფასების სასარგებლოდ აღნიშვნისთვის გთხოვთ ავტორიზაცია გაიაროთ', 'warning');
      navigate('/login');
      return;
    }

    try {
      const result = await apiService.markReviewHelpful(reviewId);
      
      if (result === null) {
        return;
      }
      
      setUserVotes(prev => ({
        ...prev,
        [reviewId]: result.user_voted
      }));
      
      const updatedReviews = await apiService.fetchProductReviews(productId);
      setReviews(updatedReviews);
      
      showToast('შეფასება განახლდა', 'success');
      
    } catch (error) {
      console.error('Error marking review as helpful:', error);
      const errorMessage = error?.message || 'შეცდომა მოხდა';
      showToast(errorMessage, 'error');
    }
  };

  if (isLoading || imagesLoading) {
    return (
      <div className="product-loading">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>იტვირთება პროდუქტი...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      
      <div className="product-loading">
        <div className="loading-container">
          <div className="error-message">
            <p>{error || 'პროდუქტი ვერ მოიძებნა'}</p>
            <button onClick={handleGoBack} className="back-button">
              <ArrowLeft size={10} />
              უკან დაბრუნება
            </button>
          </div>
        </div>
      </div>
    );
  }

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3);
  
  return (
    
    <div className="product-page">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}

      <div className="product-header">
        <div className="header-actions">
          <button
            className={`wishlist-btn ${isWishlisted ? 'active' : ''}`}
            onClick={() => setIsWishlisted(!isWishlisted)}
          >
            <Heart size={20} fill={isWishlisted ? 'red' : 'none'} />
          </button>
          <button className="share-btn">
            <Share2 size={20} />
          </button>
        </div>
      </div>

      <div className="product-content">
        <div className="product-images">
          {/* Main image and navigation buttons */}
          <div className="main-image">
            <img
              src={images[selectedImageIndex] || '/default.jpg'}
              alt={product.name}
              className="main-product-image"
              onError={e => (e.target.src = '/default.jpg')}
            />
            {product.discount > 0 && (
              <div className="discount-badge">-{product.discount}%</div>
            )}
            
            {images.length > 1 && (
              <>
                <button className="nav-btn prev-btn" onClick={prevImage}>
                  <ChevronLeft size={20} />
                </button>
                <button className="nav-btn next-btn" onClick={nextImage}>
                  <ChevronRight size={20} />
                </button>
              </>
            )}
            
            <div className="image-counter">
              {selectedImageIndex + 1} / {images.length}
            </div>
          </div>

          {/* Thumbnail images */}
          {images.length > 1 && (
            <div className="image-thumbnails">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  className={`thumbnail ${selectedImageIndex === idx ? 'active' : ''}`}
                  onClick={() => setSelectedImageIndex(idx)}
                >
                  <img
                    src={img}
                    alt={`${product.name} ${idx + 1}`}
                    onError={e => (e.target.src = '/default.jpg')}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="product-info">
          <div className="product-header-info">
            <span className="brand">{product.brand}</span>
            <h1 className="product-title">{product.name}</h1>

            <div className="rating">
              <div className="stars">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    fill={i < Math.floor(product.rating) ? '#fbbf24' : 'none'}
                    color="#fbbf24"
                  />
                ))}
                <span className="rating-text"></span>
              </div>
            </div>

            <div className="price-section">
  {product.price === 0 ? (
    // If price is 0, show only original price
    <span className="current-price">{product.originalPrice?.toFixed(2)} ₾</span>
  ) : (
    // Normal price display logic
    <>
      <span className="current-price">{product.price?.toFixed(2)} ₾</span>
      {product.originalPrice && product.originalPrice > product.price && (
        <span className="original-price">{product.originalPrice.toFixed(2)} ₾</span>
      )}
    </>
  )}
</div>
          </div>

          {product.sizes && product.sizes.length > 0 && (
            <div className="selection-group">
              <h3>ზომა (EU)</h3>
              <div className="size-grid">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    className={`size-btn ${selectedSize === size ? 'selected' : ''}`}
                    onClick={() => setSelectedSize(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <p className="size-guide">
                <a href="#" className="size-guide-link">ზომების რეკომენდაცია</a>
              </p>
            </div>
          )}

          {product.colors.length > 0 && (
            <div className="selection-group">
              <h3>ფერი</h3>
              <div className="color-options">
                {product.colors.map((color) => (
                  <button
                    key={color}
                    className={`color-btn ${selectedColor === color ? 'selected' : ''}`}
                    onClick={() => setSelectedColor(color)}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="selection-group">
            <h3>რაოდენობა</h3>
            <div className="quantity-selector">
              <button
                className="qty-btn"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus size={16} />
              </button>
              <span className="quantity">{quantity}</span>
              <button
                className="qty-btn"
                onClick={() => setQuantity(Math.min(product.stockCount || 10, quantity + 1))}
                disabled={quantity >= (product.stockCount || 10)}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div className="stock-status">
            {product.inStock ? (
              <span className="in-stock">
                ✓ მარაგშია {product.stockCount > 0 ? `(${product.stockCount} ცალი)` : ''}
              </span>
            ) : (
              <span className="out-of-stock">❌ არ არის მარაგშია</span>
            )}
          </div>

            <button
    className={`add-to-cart-btn ${isProductInCart() ? 'in-cart' : ''}`}
    onClick={handleAddToCart}
    disabled={!product.inStock}
  >
    <ShoppingCart size={20} />
    {isProductInCart() 
      ? `კალათშია (${getProductQuantityInCart()})` 
      : 'კალათში დამატება'
    }
  </button>
        </div>
      </div>

      <div className="reviews-section">
        <div className="reviews-header">
          <h2>მომხმარებლის შეფასებები</h2>
          <div className="reviews-summary">
            <div className="rating-overview">
              <div className="average-rating">
                <span className="rating-number">{product.rating.toFixed(1)}</span>
                <div className="stars">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={20}
                      fill={i < Math.floor(product.rating) ? '#fbbf24' : 'none'}
                      color="#fbbf24"
                    />
                  ))}
                </div>
                <span className="total-reviews">{reviews.length} შეფასება</span>
              </div>
            </div>
          </div>
        </div>

        <div className="leave-review-section">
          {!showReviewForm ? (
            <button 
              className="leave-review-btn"
              onClick={handleShowReviewForm}
            >
              შეფასების დატოვება
            </button>
          ) : (
            <div className="review-form">
              <h3>თქვენი შეფასება</h3>
              <form onSubmit={handleSubmitReview}>
                <div className="rating-input">
                  <label>შეფასება:</label>
                  <div className="star-rating">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={24}
                        fill={i < reviewRating ? '#fbbf24' : 'none'}
                        color="#fbbf24"
                        className="star-button"
                        onClick={() => setReviewRating(i + 1)}
                      />
                    ))}
                  </div>
                </div>
                
                <div className="review-text-input">
                  <label htmlFor="review-text">კომენტარი:</label>
                  <textarea
                    id="review-text"
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="თქვენი გამოცდილების აღწერა..."
                    rows={4}
                    required
                  />
                </div>
                
                <div className="review-form-actions">
                  <button
                    type="button"
                    className="cancel-review-btn"
                    onClick={() => {
                      setShowReviewForm(false);
                      setReviewText('');
                      setReviewRating(0);
                    }}
                  >
                    გაუქმება
                  </button>
                  <button
                    type="submit"
                    className="submit-review-btn"
                    disabled={isSubmittingReview || !reviewText.trim() || reviewRating === 0}
                  >
                    <Send size={16} />
                    {isSubmittingReview ? 'იგზავნება...' : 'შეფასების გაგზავნა'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {reviewsLoading ? (
          <div className="reviews-loading">
            <div className="spinner"></div>
            <p>იტვირთება შეფასებები...</p>
          </div>
        ) : (
          <>
            <div className="reviews-list">
              {displayedReviews.map((review) => (
                <div key={review.id} className="review-item">
                  <div className="review-header">
                    <div className="reviewer-info">
                      <div className="reviewer-avatar">
                        <User size={20} />
                      </div>
                      <div className="reviewer-details">
                        <span className="reviewer-name">
                          {review.profiles?.first_name && review.profiles?.last_name 
                            ? `${review.profiles.first_name} ${review.profiles.last_name.charAt(0)}.`
                            : 'მომხმარებელი'
                          }
                        </span>
                        <span className="verified-badge">დადასტურებული</span>
                      </div>
                    </div>
                    <div className="review-meta">
                      <div className="review-stars">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            fill={i < review.star_count ? '#fbbf24' : 'none'}
                            color="#fbbf24"
                          />
                        ))}
                      </div>
                      <span className="review-date">
                        {new Date(review.created_at).toLocaleDateString('ka-GE')}
                      </span>
                    </div>
                  </div>
                  <p className="review-comment">{review.review_text}</p>
                  <div className="review-footer">
                    <button 
                      className={`helpful-btn ${userVotes[review.id] ? 'voted' : ''}`}
                      onClick={() => handleHelpfulReview(review.id)}
                    >
                      <ThumbsUp size={14} fill={userVotes[review.id] ? '#3b82f6' : 'none'} />
                      {userVotes[review.id] ? 'მოწონებული' : 'სასარგებლო'} ({review.helpful_count || 0})
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {reviews.length === 0 && !reviewsLoading && (
              <div className="no-reviews">
                <p>ჯერჯერობით შეფასებები არ არის</p>
                <p>იყავით პირველი, ვინც დატოვებს შეფასებას!</p>
              </div>
            )}

            {reviews.length > 3 && (
              <button 
                className="show-more-reviews"
                onClick={() => setShowAllReviews(!showAllReviews)}
              >
                {showAllReviews ? 'ნაკლების ნახვა' : `ყველა შეფასების ნახვა (${reviews.length})`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProductPage;