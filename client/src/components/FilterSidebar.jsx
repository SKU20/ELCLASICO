import { useEffect, useState, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { apiService } from "../services/api";
import './FilterSidebar.css'

const HorizontalFilterBar = ({ filters, setFilters }) => {
  const [allFilterOptions, setAllFilterOptions] = useState([]);
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [showArrows, setShowArrows] = useState(false);

  // Translation function for gender values
  const translateGender = (gender) => {
    const translations = {
      'male': 'მამრობითი',
      'female': 'მდედრობითი',
      'men': 'მამაკაცი',
      'women': 'ქალი',
      'unisex': 'უნისექს'
    };
    return translations[gender?.toLowerCase()] || gender;
  };

  // Translation function for type values
  const translateType = (type) => {
    const translations = {
      'running': 'სავარჯიშო',
      'football': 'ფეხბურთი',
      'everyday': 'ყოველდღიური'
    };
    return translations[type?.toLowerCase()] || type;
  };

   useEffect(() => {
    const fetchFilters = async () => {
      try {
        const data = await apiService.fetchFilterOptions();
        
        // Apply translations to the data received from backend
        const translatedOptions = data.map(option => ({
          ...option,
          displayName: option.category === 'genders' 
            ? translateGender(option.name)
            : option.category === 'types'
            ? translateType(option.name)
            : option.name // Don't translate brands
        }));

        setAllFilterOptions(translatedOptions);
      } catch (error) {
        console.error('Failed to fetch filter options:', error);
        // Handle error state here if needed
      }
    };

    fetchFilters();
  }, []);

  const checkScrollability = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth);
      setShowArrows(scrollWidth > clientWidth);
    }
  };

  useEffect(() => {
    checkScrollability();
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', checkScrollability);
      window.addEventListener('resize', checkScrollability);
      return () => {
        scrollElement.removeEventListener('scroll', checkScrollability);
        window.removeEventListener('resize', checkScrollability);
      };
    }
  }, [allFilterOptions]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleFilterToggle = (category, value) => {
    setFilters(prev => {
      const arr = prev[category];
      return {
        ...prev,
        [category]: arr.includes(value)
          ? arr.filter(v => v !== value)
          : [...arr, value]
      };
    });
  };

  const isFilterActive = (category, value) => {
    return filters[category]?.includes(value) || false;
  };

  return (
    <div className="horizontal-filter-bar">
      <div className="filter-container">
        {showArrows && canScrollLeft && (
          <button 
            className="scroll-arrow scroll-arrow-left"
            onClick={() => scroll('left')}
            aria-label="მარცხნივ გადაადგილება"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        
        <div 
          ref={scrollRef}
          className="filter-scroll-container"
        >
          {allFilterOptions.map((option, index) => (
            <button
              key={`${option.category}-${option.name}`}
              className={`filter-button ${isFilterActive(option.category, option.name) ? 'active' : ''}`}
              onClick={() => handleFilterToggle(option.category, option.name)}
            >
              <span className="filter-name">{option.displayName}</span>
              <span className="filter-count">({option.count})</span>
            </button>
          ))}
        </div>

        {showArrows && canScrollRight && (
          <button 
            className="scroll-arrow scroll-arrow-right"
            onClick={() => scroll('right')}
            aria-label="მარჯვნივ გადაადგილება"
          >
            <ChevronRight size={20} />
          </button>
        )}
        
        {/* Blur gradients for edges */}
        {showArrows && (
          <>
            <div className={`blur-gradient blur-left ${canScrollLeft ? 'visible' : ''}`}></div>
            <div className={`blur-gradient blur-right ${canScrollRight ? 'visible' : ''}`}></div>
          </>
        )}
      </div>
    </div>
  );
};

export default HorizontalFilterBar;