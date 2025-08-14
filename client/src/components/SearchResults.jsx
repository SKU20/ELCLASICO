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

  // Improved search function with better scoring
  const searchProducts = (searchQuery, products) => {
    if (!searchQuery || !searchQuery.trim()) return [];
    
    const normalizedQuery = searchQuery.toLowerCase().trim();
    const queryWords = normalizedQuery.split(/\s+/);
    
    // Georgian to Latin character mapping
    const georgianToLatin = {
      'ა': 'a', 'ბ': 'b', 'გ': 'g', 'დ': 'd', 'ე': 'e', 'ვ': 'v', 'ზ': 'z',
      'თ': 't', 'ი': 'i', 'კ': 'k', 'ლ': 'l', 'მ': 'm', 'ნ': 'n', 'ო': 'o',
      'პ': 'p', 'ჟ': 'zh', 'რ': 'r', 'ს': 's', 'ტ': 't', 'უ': 'u', 'ფ': 'f',
      'ქ': 'q', 'ღ': 'gh', 'ყ': 'y', 'შ': 'sh', 'ჩ': 'ch', 'ც': 'ts', 'ძ': 'dz',
      'წ': 'ts', 'ჭ': 'ch', 'ხ': 'kh', 'ჯ': 'j', 'ჰ': 'h'
    };

    const latinToGeorgian = Object.fromEntries(
      Object.entries(georgianToLatin).map(([k, v]) => [v, k])
    );

    // Function to convert text both ways (Georgian to Latin and vice versa)
    const convertText = (text) => {
      const variations = [text];
      
      // Georgian to Latin
      let latinVersion = text;
      for (const [geo, lat] of Object.entries(georgianToLatin)) {
        latinVersion = latinVersion.replace(new RegExp(geo, 'g'), lat);
      }
      if (latinVersion !== text) variations.push(latinVersion);
      
      // Latin to Georgian
      let georgianVersion = text;
      for (const [lat, geo] of Object.entries(latinToGeorgian)) {
        georgianVersion = georgianVersion.replace(new RegExp(lat, 'g'), geo);
      }
      if (georgianVersion !== text) variations.push(georgianVersion);
      
      return [...new Set(variations)];
    };

    const productsWithScore = products.map(product => {
      if (!product.name) return { ...product, score: 0 };
      
      const productName = product.name.toLowerCase();
      const brandName = (product.brand || '').toLowerCase();
      let score = 0;

      // Generate all variations of query words
      const queryVariations = queryWords.flatMap(word => convertText(word));
      
      queryVariations.forEach(queryWord => {
        // Exact name match (highest score)
        if (productName === queryWord) score += 100;
        
        // Name starts with query (high score)
        if (productName.startsWith(queryWord)) score += 80;
        
        // Name contains query word (medium score)
        if (productName.includes(queryWord)) score += 50;
        
        // Brand exact match
        if (brandName === queryWord) score += 90;
        
        // Brand starts with query
        if (brandName.startsWith(queryWord)) score += 70;
        
        // Brand contains query
        if (brandName.includes(queryWord)) score += 40;
        
        // Word boundaries in name (words that start with query)
        const nameWords = productName.split(/\s+/);
        nameWords.forEach(word => {
          if (word.startsWith(queryWord)) score += 60;
        });
        
        // Fuzzy matching for partial matches
        if (queryWord.length >= 3) {
          const similarity = calculateSimilarity(queryWord, productName);
          if (similarity > 0.6) score += Math.round(similarity * 30);
        }
      });

      return { ...product, score };
    });

    // Filter products with score > 0 and sort by score
    return productsWithScore
      .filter(product => product.score > 0)
      .sort((a, b) => b.score - a.score);
  };

  // Simple similarity calculation
  const calculateSimilarity = (str1, str2) => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  };

  // Levenshtein distance calculation
  const levenshteinDistance = (str1, str2) => {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  };

  // Perform search when query or products change
  useEffect(() => {
    if (query.trim() && allProducts.length > 0) {
      setLoading(true);
      console.log('🔍 Searching for:', query, 'in', allProducts.length, 'products');
      
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
      default: // relevance - keep original order (already sorted by score)
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
        {/* Simple Header */}
        

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
          <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ 
            fontSize: '2rem', 
            marginBottom: '0.5rem', 
            color: '#374151',
            fontWeight: '600'
          }}>
            საძიებო შედეგები: "{query}"
          </h1>
          <p style={{ fontSize: '1rem', color: '#6b7280' }}>
            {loading ? 'იტვირთება...' : `მოიძებნა ${filteredResults.length} პროდუქტი`}
          </p>
        </div>
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