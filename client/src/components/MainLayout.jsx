import { useEffect, useState } from "react";
import { apiService } from "../services/api";
import HorizontalFilterBar from "./FilterSidebar";
import OfferCarousel from "./OfferCarousel";
import ProductGrid from "./ProductGrid";
import "./MainLayout.css";

const MainLayout = () => {
  const [allProducts, setAllProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [mostPopular, setMostPopular] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    brands: [],
    genders: [],
    types: [],
  });

 useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const [products, bestSellers] = await Promise.all([
          apiService.fetchProducts(),
          apiService.fetchBestSellers()
        ]);

        setAllProducts(products);
        setMostPopular(bestSellers);
        setFilteredProducts(products); // Initially show all products
      } catch (err) {
        setError('Failed to load products. Please try again later.');
        console.error('Error fetching products:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    const applyFilters = async () => {
      if (filters.brands.length === 0 && 
          filters.genders.length === 0 && 
          filters.types.length === 0) {
        setFilteredProducts(allProducts);
        return;
      }

      try {
        const filtered = await apiService.fetchFilteredProducts(filters);
        setFilteredProducts(filtered);
      } catch (err) {
        console.error('Error filtering products:', err);
        // Fallback to client-side filtering if API fails
        let result = allProducts;
        if (filters.brands.length > 0) {
          result = result.filter((p) => filters.brands.includes(p.brand));
        }
        if (filters.genders.length > 0) {
          result = result.filter((p) => filters.genders.includes(p.gender));
        }
        if (filters.types.length > 0) {
          result = result.filter((p) => filters.types.includes(p.type));
        }
        setFilteredProducts(result);
      }
    };

    applyFilters();
  }, [filters, allProducts]);

  if (error) {
    return (
      <>
        <HorizontalFilterBar filters={filters} setFilters={setFilters} />
        <main className="main-layout-centered">
          <div className="error-container">
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>
              Try Again
            </button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <HorizontalFilterBar filters={filters} setFilters={setFilters} />
      <main className="main-layout-centered">
        {isLoading ? (
          <div className="loading-container">
            <div className="spinner"></div>
          </div>
        ) : (
          <>
            {filters.brands.length === 0 &&
            filters.genders.length === 0 &&
            filters.types.length === 0 ? (
              <>
                <OfferCarousel />
                <section className="all-products-section">
                  <h2>ბესთ სელერი</h2>
                  <ProductGrid
                    products={mostPopular}
                    itemsPerPage={4}
                    showPagination={false}
                  />
                </section>
                <section className="all-products-section">
                  <h2 style={{ marginTop: "2rem" }}>ყველა პროდუქტი</h2>
                  <ProductGrid
                    products={filteredProducts}
                    itemsPerPage={20}
                    showPagination={true}
                  />
                </section>
              </>
            ) : (
              <section className="all-products-section">
                <h2 style={{ marginTop: "2rem" }}>ფილტრის შედეგი</h2>
                <ProductGrid
                  products={filteredProducts}
                  itemsPerPage={20}
                  showPagination={true}
                />
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
};

export default MainLayout;