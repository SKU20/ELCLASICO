import React, { useState, useEffect, useRef } from 'react';
import { apiService } from "../services/api";
import './OfferCarousel.css';
const OfferCarousel = () => {
  const [offers, setOffers] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [itemsPerView, setItemsPerView] = useState(4);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const carouselRef = useRef(null);

  // Calculate items per view based on screen size
  useEffect(() => {
    const calculateItemsPerView = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setItemsPerView(1); // Mobile
      } else if (width < 1200) {
        setItemsPerView(2); // Tablet
      } else if (width < 1600) {
        setItemsPerView(3); // Small desktop
      } else {
        setItemsPerView(4); // Large desktop
      }
    };

    calculateItemsPerView();
    window.addEventListener('resize', calculateItemsPerView);
    return () => window.removeEventListener('resize', calculateItemsPerView);
  }, []);

  // Fetch offers from API
  useEffect(() => {
    const loadImages = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log('Fetching offer images...');
        
        const data = await apiService.fetchOfferImages();
        console.log('Received data:', data);
        
        // Handle different response formats
        const imageArray = Array.isArray(data) ? data : data.images || data.data || [];
        console.log('Processed images:', imageArray);
        
        setOffers(imageArray);
      } catch (err) {
        console.error('Failed to load offer images:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    loadImages();
  }, []);

  const totalSlides = Math.max(0, offers.length - itemsPerView + 1);
  const maxIndex = totalSlides - 1;

  const goToNext = () => {
    setCurrentIndex(prev => prev >= maxIndex ? 0 : prev + 1);
  };

  const goToPrev = () => {
    setCurrentIndex(prev => prev <= 0 ? maxIndex : prev - 1);
  };

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  const handleOfferClick = (offer) => {
    // Handle offer click - you can add your navigation logic here
    console.log('Offer clicked:', offer);
    // Example: navigate to offer details page
    // window.location.href = `/offers/${offer.id}`;
    // or use React Router: navigate(`/offers/${offer.id}`);
  };

  if (isLoading) {
    return (
      <section className="offer-carousel-section">
        <div className="carousel-loading">
          <div className="spinner"></div>
        </div>
      </section>
    );
  }

  if (error || offers.length === 0) {
    return null; // Don't render if no offers or error
  }

  return (
    <section className="offer-carousel-section">
      <div className="carousel-container" ref={carouselRef}>
        {totalSlides > 0 && (
          <button 
            className="carousel-btn carousel-btn-prev" 
            onClick={goToPrev}
            aria-label="Previous offers"
          >
            <span className="arrow-left"></span>
          </button>
        )}

        <div className="carousel-viewport">
          <div 
            className="carousel-track"
            style={{
              transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)`,
            }}
          >
            {offers.map((offer) => (
              <div key={offer.id} className="carousel-item">
                <div className="offer-card" onClick={() => handleOfferClick(offer)}>
                  <div className="offer-image-container">
                    <img 
                      src={offer.image_url} 
                      alt={offer.alt_text || `Offer ${offer.id}`}
                      className="offer-image"
                      loading="lazy"
                    />
                    <div className="offer-overlay">
                      <h3 className="offer-title">{offer.alt_text || `Offer ${offer.id}`}</h3>
                      <p className="offer-description">Click to view offer</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {totalSlides > 0 && (
          <button 
            className="carousel-btn carousel-btn-next" 
            onClick={goToNext}
            aria-label="Next offers"
          >
            <span className="arrow-right"></span>
          </button>
        )}
      </div>

      {totalSlides > 0 && (
        <div className="carousel-indicators">
          {Array.from({ length: totalSlides }, (_, index) => (
            <button
              key={index}
              className={`indicator ${currentIndex === index ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default OfferCarousel;