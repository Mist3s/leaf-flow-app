import React, { useMemo, useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { CartProvider, useCart } from './context/CartContext';
import { Layout } from './components/Layout';
import { CatalogPage } from './pages/CatalogPage';
import { ProductPage } from './pages/ProductPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { ConfirmationPage } from './pages/ConfirmationPage';
import type { CategoryFilterValue, OrderSummary, Page } from './types';

const AppContent: React.FC = () => {
  const { totalCount } = useCart();
  const [page, setPage] = useState<Page>('catalog');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryFilterValue>('all');
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);

  const layoutTitle = useMemo(() => {
    switch (page) {
      case 'catalog':
        return 'Каталог';
      case 'product':
        return 'Товар';
      case 'cart':
        return 'Корзина';
      case 'checkout':
        return 'Оформление';
      case 'confirmation':
        return 'Готово';
      default:
        return 'TeaGram';
    }
  }, [page]);

  const handleBack = () => {
    switch (page) {
      case 'product':
        setSelectedProductId(null);
        setPage('catalog');
        break;
      case 'cart':
        if (selectedProductId) {
          setPage('product');
        } else {
          setSelectedProductId(null);
          setPage('catalog');
        }
        break;
      case 'checkout':
        setPage('cart');
        break;
      case 'confirmation':
        setSelectedProductId(null);
        setOrderSummary(null);
        setPage('catalog');
        break;
      default:
        break;
    }
  };

  const headerVariant =
    page === 'confirmation' ? 'none' : page === 'cart' || page === 'checkout' ? 'minimal' : 'default';
  const showBackButton = headerVariant === 'default' && page !== 'catalog';
  const showHeaderTitle = headerVariant === 'minimal';

  return (
    <Layout
      title={layoutTitle}
      cartCount={totalCount}
      showBackButton={showBackButton}
      onBack={handleBack}
      onClose={headerVariant === 'minimal' ? handleBack : undefined}
      onCartClick={() => setPage('cart')}
      headerVariant={headerVariant}
      showTitle={showHeaderTitle}
    >
      {page === 'catalog' && (
        <CatalogPage
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          onSelectProduct={(productId) => {
            setSelectedProductId(productId);
            setPage('product');
          }}
        />
      )}

      {page === 'product' && selectedProductId && (
        <ProductPage
          productId={selectedProductId}
          onGoToCart={() => {
            setPage('cart');
          }}
        />
      )}

      {page === 'cart' && (
        <CartPage
          onContinueShopping={() => {
            setSelectedProductId(null);
            setPage('catalog');
          }}
          onCheckout={() => setPage('checkout')}
          onSelectProduct={(productId) => {
            setSelectedProductId(productId);
            setPage('product');
          }}
        />
      )}

      {page === 'checkout' && (
        <CheckoutPage
          onBackToCart={() => setPage('cart')}
          onOrderComplete={(summary) => {
            setOrderSummary(summary);
            setPage('confirmation');
          }}
        />
      )}

      {page === 'confirmation' && orderSummary && (
        <ConfirmationPage
          summary={orderSummary}
          onGoToCatalog={() => {
            setPage('catalog');
            setOrderSummary(null);
            setSelectedProductId(null);
          }}
        />
      )}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <CartProvider>
        <AppContent />
      </CartProvider>
    </ThemeProvider>
  );
};

export default App;
