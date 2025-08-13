import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from "../services/api";
import './ProductGrid.css';
import { useCart } from '../contexts/CartContext.jsx'; 

// Helper function to get the first image URL
const getFirstImageUrl = (imageUrl) => {
  if (!imageUrl) return '/default.jpg';
  
  // Extract the base URL without the image number
  // Example: "https://...storage/.../product-images/40000001-0001-4000-8000-000000000003-4.jpg"
  // becomes: "https://...storage/.../product-images/40000001-0001-4000-8000-000000000003-1.jpg"
  
  // Find the last dash followed by a number and .jpg
  const lastDashIndex = imageUrl.lastIndexOf('-');
  const dotIndex = imageUrl.lastIndexOf('.');
  
  if (lastDashIndex !== -1 && dotIndex !== -1 && lastDashIndex < dotIndex) {
    // Check if there's a number between the last dash and the dot
    const numberPart = imageUrl.substring(lastDashIndex + 1, dotIndex);
    if (/^\d+$/.test(numberPart)) {
      // Replace the number with 1 to get the first image
      return imageUrl.substring(0, lastDashIndex + 1) + '1' + imageUrl.substring(dotIndex);
    }
  }
  
  // If the URL doesn't match the expected pattern, return as is
  return imageUrl;
};

const ProductGrid = ({ itemsPerPage = 12, showPagination = true, products = [] }) => {
  const navigate = useNavigate();
  const [productImages, setProductImages] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [imagesError, setImagesError] = useState(null);

  const { addToCart, isInCart, getItemQuantity } = useCart();

  // Fetch images using API service
  useEffect(() => {
    const fetchImages = async () => {
      try {
        setImagesLoading(true);
        setImagesError(null);
        
        const imagesMap = await apiService.fetchProductImages();
        
        // Process the images to ensure we get the first image for each product
        const processedImagesMap = {};
        Object.keys(imagesMap).forEach(productId => {
          processedImagesMap[productId] = getFirstImageUrl(imagesMap[productId]);
        });
        
        setProductImages(processedImagesMap);
      } catch (error) {
        console.error('Error fetching images:', error);
        setImagesError('Failed to load images');
        setProductImages({});
      } finally {
        setImagesLoading(false);
      }
    };

    fetchImages();
  }, []);

  // Reset to first page when products change
  useEffect(() => {
    setCurrentPage(1);
  }, [products]);

  // Pagination logic
  const totalPages = Math.ceil(products.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = products.slice(startIndex, endIndex);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      document.querySelector('.product-grid')?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };


  // Updated handleProductClick to use React Router
  const handleProductClick = (productId) => {
    navigate(`/product/${productId}`);
  };

  // Show loading state for images
  if (imagesLoading && products.length > 0) {
    return (
      <section className="product-grid">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>იტვირთება სურათები...</p>
        </div>
      </section>
    );
  }

  // Show message if no products
  if (products.length === 0) {
    return (
      <section className="product-grid">
        <div className="no-products">
          <p>პროდუქტები ვერ მოიძებნა</p>
        </div>
      </section>
    );
  }

  return (
    <section className="product-grid">
      {imagesError && (
        <div className="error-message">
          <p>{imagesError}</p>
        </div>
      )}
      
      <div className="grid">
        {currentProducts.map((product, index) => (
          <div 
            className={`product-card ${!product.in_stock ? 'out-of-stock' : ''}`} 
            key={product.id}
            style={{ 
              animationDelay: `${index * 0.1}s`,
              cursor: 'pointer' 
            }}
            onClick={() => handleProductClick(product.id)}
          >
            <div className="product-image-container">
              <img 
                src={productImages[product.id] || '/default.jpg'} 
                alt={product.name}
                onError={(e) => {
                  e.target.src = '/default.jpg';
                }}
                loading="lazy"
              />
              
             
            </div>

            <div className="product-info">
              <h4>{product.name}</h4>
              <div className="brand">{product.brand}</div>
              
              <div className="price-container">
                {product.discount === 0 || product.original_price === product.price ? (
                  <span className="current-price">₾{product.original_price}</span>
                ) : (
                  <>
                    <span className="current-price">₾{product.price}</span>
                    {product.original_price && (
                      <span className="original-price">₾{product.original_price}</span>
                    )}
                  </>
                )}
              </div>

              {/* Stock status - simplified */}
              <div className="stock-status">
                {product.in_stock ? 'მარაგშია' : 'გაყიდულია'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Only show pagination if showPagination is true and more than one page */}
      {showPagination && totalPages > 1 && (
        <div className="pagination-container">
          <div className="pagination-info">
            <span>
              გვერდი {currentPage} / {totalPages} 
              <span className="total-products">
                ({products.length} პროდუქტი)
              </span>
            </span>
          </div>
          
          <div className="pagination">
            <button 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="pagination-btn prev-btn"
              title="წინა გვერდი"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="15,18 9,12 15,6"></polyline>
              </svg>
            </button>

            {getPageNumbers().map((page, index) => (
              <span key={index}>
                {page === '...' ? (
                  <span className="pagination-dots">...</span>
                ) : (
                  <button
                    onClick={() => handlePageChange(page)}
                    className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                  >
                    {page}
                  </button>
                )}
              </span>
            ))}

            <button 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="pagination-btn next-btn"
              title="შემდეგი გვერდი"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="9,18 15,12 9,6"></polyline>
              </svg>
            </button>
          </div>
          
          <div className="items-per-page-info">
            <span>გვერდზე: {itemsPerPage} პროდუქტი</span>
          </div>
        </div>
      )}
    </section>
  );
};

export default ProductGrid;
