import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { apiService } from './services/api';
import { CartProvider } from './contexts/CartContext';

import Header from './components/Header';
import Footer from './components/Footer';
import MainLayout from './components/MainLayout';
import ProductPage from './components/ProductPage';
import UpdatePasswordPage from './components/UpdatePasswordPage';
import CartPage from './components/CartPage';
import SearchResults from './components/SearchResults';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);

  return null;
};

// Page components with their own header/footer
const HomePage = ({ allProducts, productsLoading }) => (
  <>
    <Header allProducts={allProducts} />
    <MainLayout allProducts={allProducts} productsLoading={productsLoading} />
    <Footer />
  </>
);

const LoginPage = () => (
  <>
    <Header />
    <div style={{ padding: '2rem', minHeight: '60vh' }}>
      <h1>ავტორიზაცია</h1>
      <p>მიმდინარეობს მონაცემების შეყვანა...</p>
    </div>
    <Footer />
  </>
);

const SignupPage = () => (
  <>
    <Header />
    <div style={{ padding: '2rem', minHeight: '60vh' }}>
      <h1>ავტორიზაცია</h1>
      <p>მიმდინარეობს მონაცემების შეყვანა...</p>
    </div>
    <Footer />
  </>
);

// FIXED: SearchResults now has Header and Footer
const SearchResultsPage = ({ allProducts }) => (
  <>
    <Header allProducts={allProducts} />
    <SearchResults allProducts={allProducts} />
    <Footer />
  </>
);

const CheckoutPage = () => (
  <>
    <Header />
    <div style={{ padding: '2rem', minHeight: '60vh' }}>
      <h1>Checkout</h1>
      <p>Checkout page coming soon...</p>
    </div>
    <Footer />
  </>
);

const CartPageWithLayout = () => (
  <>
    <Header />
    <CartPage />
    <Footer />
  </>
);

const NotFoundPage = () => (
  <div style={{
    padding: '2rem',
    textAlign: 'center',
    minHeight: '50vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  }}>
    <h2>გვერდი ვერ მოიძებნა</h2>
    <p>მოთხოვნილი გვერდი არ არსებობს.</p>
    <button
      onClick={() => window.location.href = '/'}
      style={{
        padding: '0.75rem 1.5rem',
        background: '#3b82f6',
        color: 'white',
        border: 'none',
        borderRadius: '0.5rem',
        cursor: 'pointer',
        marginTop: '1rem'
      }}
    >
      მთავარ გვერდზე დაბრუნება
    </button>
  </div>
);

const ProductPageWithLayout = ({ allProducts }) => (
  <>
    <Header allProducts={allProducts} />
    <ProductPage />
    <Footer />
  </>
);

const AppContent = () => {
  const [allProducts, setAllProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);

  useEffect(() => {
    const fetchProductsWithImages = async () => {
      setProductsLoading(true);
      try {
        const products = await apiService.fetchProducts();
        setAllProducts(products);

        try {
          const imageMap = await apiService.fetchProductImages();
          const enriched = products.map(prod => ({
            ...prod,
            image: imageMap[prod.id] || '',
          }));
          setAllProducts(enriched);
        } catch (imageError) {
          console.warn('Images failed:', imageError);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        setAllProducts([]);
      } finally {
        setProductsLoading(false);
      }
    };

    fetchProductsWithImages();
  }, []);

  return (
    <Routes>
      <Route path="/" element={<HomePage allProducts={allProducts} productsLoading={productsLoading} />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route 
        path="/product/:productId" 
        element={<ProductPageWithLayout allProducts={allProducts} />} 
      />
      <Route path="/cart" element={<CartPageWithLayout />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      {/* FIXED: Now uses SearchResultsPage wrapper with Header and Footer */}
      <Route 
        path="/results" 
        element={<SearchResultsPage allProducts={allProducts} />} 
      />
      <Route path="/update-password" element={<UpdatePasswordPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

const App = () => (
  <CartProvider>
    <Router>
      <ScrollToTop />
      <AppContent />
    </Router>
  </CartProvider>
);

export default App;