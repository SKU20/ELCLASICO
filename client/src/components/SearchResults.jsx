import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaSearch, FaFilter, FaSort, FaTimes, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import ProductGrid from './ProductGrid';
import HorizontalFilterBar from './FilterSidebar';

const SearchResults = ({ allProducts = [] }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get search query from URL
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('q') || '';
  
  // State
  const [searchResults, setSearchResults] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Horizontal filter state
  const [filters, setFilters] = useState({
    brands: [],
    genders: [],
    types: []
  });

  // Get unique brands from search results
  const availableBrands = [...new Set(searchResults.filter(p => p.brand).map(p => p.brand))].sort();

  // Enhanced search functions (copied from Header component)
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

  // Main search function (same logic as Header)
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

  // Perform search when query or products change (using same logic as Header)
  useEffect(() => {
    if (query.trim() && allProducts.length > 0) {
      setLoading(true);
      console.log('🔍 Searching for:', query, 'in', allProducts.length, 'products');
      
      // Use the same search function as Header component
      const results = searchProducts(query, allProducts);
      console.log('🔍 Found', results.length, 'results');
      
      setSearchResults(results);
      setFilteredResults(results);
      setLoading(false);
    } else {
      setSearchResults([]);
      setFilteredResults([]);
    }
  }, [query, allProducts]);

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...searchResults];

    // Apply horizontal filter bar filters
    if (filters.brands.length > 0) {
      filtered = filtered.filter(product => 
        filters.brands.includes(product.brand)
      );
    }

    if (filters.genders.length > 0) {
      filtered = filtered.filter(product => 
        filters.genders.some(gender => {
          // Handle different gender formats
          const productGender = product.gender?.toLowerCase();
          const filterGender = gender.toLowerCase();
          return productGender === filterGender || 
                 (filterGender === 'მამრობითი' && (productGender === 'male' || productGender === 'men')) ||
                 (filterGender === 'მდედრობითი' && (productGender === 'female' || productGender === 'women')) ||
                 (filterGender === 'უნისექს' && productGender === 'unisex');
        })
      );
    }

    if (filters.types.length > 0) {
      filtered = filtered.filter(product => 
        filters.types.some(type => {
          const productType = product.type?.toLowerCase();
          const filterType = type.toLowerCase();
          return productType === filterType ||
                 (filterType === 'სავარჯიშო' && productType === 'running') ||
                 (filterType === 'ფეხბურთი' && productType === 'football') ||
                 (filterType === 'ყოველდღიური' && productType === 'everyday');
        })
      );
    }

    // Apply brand filter from collapsible section
    if (selectedBrands.length > 0) {
      filtered = filtered.filter(product => 
        selectedBrands.includes(product.brand)
      );
    }

    // Apply price range filter
    if (priceRange.min || priceRange.max) {
      filtered = filtered.filter(product => {
        const price = parseFloat(product.price) || 0;
        const min = parseFloat(priceRange.min) || 0;
        const max = parseFloat(priceRange.max) || Infinity;
        return price >= min && price <= max;
      });
    }

    // Apply sorting
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0));
        break;
      case 'price-high':
        filtered.sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0));
        break;
      case 'name':
        filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'brand':
        filtered.sort((a, b) => (a.brand || '').localeCompare(b.brand || ''));
        break;
      default: // relevance - keep original order (already sorted by searchScore)
        break;
    }

    setFilteredResults(filtered);
  }, [searchResults, filters, selectedBrands, priceRange, sortBy]);

  const handleBrandChange = (brand) => {
    setSelectedBrands(prev => 
      prev.includes(brand) 
        ? prev.filter(b => b !== brand)
        : [...prev, brand]
    );
  };

  const clearFilters = () => {
    setSelectedBrands([]);
    setPriceRange({ min: '', max: '' });
    setSortBy('relevance');
    setFilters({
      brands: [],
      genders: [],
      types: []
    });
  };

  if (!query.trim()) {
    return (
      <div style={{ 
        minHeight: '60vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column',
        textAlign: 'center',
        padding: '2rem'
      }}>
        <FaSearch style={{ fontSize: '4rem', color: '#d1d5db', marginBottom: '1rem' }} />
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#374151' }}>ძიება</h1>
        <p style={{ color: '#6b7280' }}>შეიყვანეთ საძიებო სიტყვები პროდუქტების მოსაძებნად</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ 
            fontSize: '2rem', 
            marginBottom: '0.5rem', 
            fontWeight: '700',
            color: '#111827',
            textAlign: 'center',
            letterSpacing: '-0.025em',
            position: 'relative',
          }}>
            ძიების შედეგი:
          </h2>
        </div>

        {/* Horizontal Filter Bar */}
        {searchResults.length > 0 && (
          <HorizontalFilterBar 
            filters={filters} 
            setFilters={setFilters}
          />
        )}

        {loading ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '4rem',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              border: '4px solid #f3f4f6',
              borderTop: '4px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }} />
            <p style={{ fontSize: '1.1rem', color: '#6b7280' }}>იტვირთება...</p>
          </div>
        ) : (
          <>
            {searchResults.length > 0 && (
              <>
                {filteredResults.length > 0 ? (
                  <ProductGrid 
                    products={filteredResults}
                    itemsPerPage={20}
                    showPagination={true}
                  />
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '4rem 2rem',
                    background: 'white',
                    borderRadius: '16px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔍</div>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#374151' }}>
                      ფილტრებით შედეგი ვერ მოიძებნა
                    </h2>
                    <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
                      არჩეული ფილტრებით პროდუქტები ვერ მოიძებნა
                    </p>
                    <button
                      onClick={clearFilters}
                      style={{
                        padding: '0.875rem 1.5rem',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: '600'
                      }}
                    >
                      ფილტრების გაწმენდა
                    </button>
                  </div>
                )}
              </>
            )}

            {/* No Results */}
            {searchResults.length === 0 && !loading && (
              <div style={{ 
                textAlign: 'center', 
                padding: '4rem 2rem',
                background: 'white',
                borderRadius: '16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
              }}>
                <div style={{ fontSize: '6rem', marginBottom: '2rem', opacity: '0.7' }}>🔍</div>
                <h2 style={{ 
                  fontSize: '2rem', 
                  marginBottom: '1rem', 
                  color: '#374151',
                  fontWeight: '700'
                }}>
                  შედეგი ვერ მოიძებნა
                </h2>
                <p style={{ 
                  color: '#6b7280', 
                  marginBottom: '2rem',
                  fontSize: '1.1rem',
                  lineHeight: '1.6'
                }}>
                  ვერ მოიძებნა პროდუქტები მოცემული საძიებო სიტყვებისთვის: <strong>"{query}"</strong>
                </p>
                
                <div style={{ 
                  background: '#f8fafc',
                  padding: '2rem',
                  borderRadius: '12px',
                  marginBottom: '2rem',
                  textAlign: 'left',
                  maxWidth: '600px',
                  margin: '0 auto 2rem'
                }}>
                  <h3 style={{ 
                    color: '#374151', 
                    marginBottom: '1rem',
                    fontSize: '1.2rem'
                  }}>
                    რჩევები უკეთესი ძიებისთვის:
                  </h3>
                  <ul style={{ 
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                    color: '#6b7280'
                  }}>
                    <li style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      marginBottom: '0.75rem',
                      fontSize: '1rem'
                    }}>
                      <span style={{ marginRight: '0.5rem', color: '#3b82f6' }}>✓</span>
                      შეამოწმეთ სიტყვების მართლწერა
                    </li>
                    <li style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      marginBottom: '0.75rem',
                      fontSize: '1rem'
                    }}>
                      <span style={{ marginRight: '0.5rem', color: '#3b82f6' }}>✓</span>
                      სცადეთ უფრო ზოგადი საძიებო სიტყვები
                    </li>
                    <li style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      marginBottom: '0.75rem',
                      fontSize: '1rem'
                    }}>
                      <span style={{ marginRight: '0.5rem', color: '#3b82f6' }}>✓</span>
                      სცადეთ სხვადასხვა ქართული ან ლათინური ასოები
                    </li>
                    <li style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      marginBottom: '0.75rem',
                      fontSize: '1rem'
                    }}>
                      <span style={{ marginRight: '0.5rem', color: '#3b82f6' }}>✓</span>
                      სცადეთ ბრენდის სახელით ძიება
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => navigate('/')}
                  style={{
                    padding: '1rem 2rem',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = '#2563eb';
                    e.target.style.transform = 'translateY(-2px)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = '#3b82f6';
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  მთავარ გვერდზე დაბრუნება
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* CSS keyframes for loading animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
          .search-controls {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          
          .filter-panel {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default SearchResults;