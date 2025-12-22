import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { CartProvider, useCart } from './context/CartContext';
import { Layout } from './components/Layout';
import { CatalogPage } from './pages/CatalogPage';
import { ProductPage } from './pages/ProductPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { ConfirmationPage } from './pages/ConfirmationPage';
import type { CategoryFilterValue, OrderSummary, Page } from './types';
import { ProductShareActions } from './components/ProductShareActions';
import {
  buildMainDeepLink,
  buildProductDeepLink,
  extractStartParam,
  hasTelegramInitData,
  parseProductIdFromStartParam,
} from './utils/telegram';

const getStartContext = () => {
  if (typeof window === 'undefined') {
    return { startParam: null, productId: null };
  }

  const startParam = extractStartParam();
  return {
    startParam,
    productId: parseProductIdFromStartParam(startParam),
  };
};

const AppContent: React.FC = () => {
  const { totalCount } = useCart();
  const startContext = getStartContext();
  const [page, setPage] = useState<Page>(startContext.productId ? 'product' : 'catalog');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(startContext.productId);
  const [activeCategory, setActiveCategory] = useState<CategoryFilterValue>('all');
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [startParam, setStartParam] = useState<string | null>(startContext.startParam);
  const startParamRef = useRef<string | null>(startContext.startParam);
  const [isTelegramEnvironment, setIsTelegramEnvironment] = useState<boolean>(() => hasTelegramInitData());
  const catalogScrollPositionRef = useRef(0);

  const activeSearchQuery = useMemo(() => {
    const normalized = searchValue.trim();
    return normalized.length >= 2 ? normalized : '';
  }, [searchValue]);

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

  useEffect(() => {
    let checksLeft = 15;
    let intervalId: number | undefined;

    const checkEnvironment = () => {
      const hasInitData = hasTelegramInitData();
      if (hasInitData) {
        setIsTelegramEnvironment(true);
      }

      const paramFromEnvironment = extractStartParam();
      if (paramFromEnvironment && paramFromEnvironment !== startParamRef.current) {
        startParamRef.current = paramFromEnvironment;
        setStartParam(paramFromEnvironment);
      }

      checksLeft -= 1;

      if (checksLeft <= 0 && intervalId) {
        clearInterval(intervalId);
      }
    };

    checkEnvironment();
    intervalId = window.setInterval(checkEnvironment, 400);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  useEffect(() => {
    const productIdFromStart = parseProductIdFromStartParam(startParam);
    if (productIdFromStart) {
      setSelectedProductId(productIdFromStart);
      setPage('product');
    }
  }, [startParam]);

  useEffect(() => {
    startParamRef.current = startParam;
  }, [startParam]);

  useEffect(() => {
    if (page === 'product') {
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    if (page === 'catalog') {
      requestAnimationFrame(() => {
        window.scrollTo({ top: catalogScrollPositionRef.current, behavior: 'auto' });
      });
    }
  }, [page]);

  const navigateToPage = (nextPage: Page) => {
    if (page === 'catalog' && nextPage !== 'catalog') {
      catalogScrollPositionRef.current = window.scrollY;
    }

    setPage(nextPage);
  };

  const handleBack = () => {
    switch (page) {
      case 'product':
        setSelectedProductId(null);
        navigateToPage('catalog');
        break;
      case 'cart':
        if (selectedProductId) {
          navigateToPage('product');
        } else {
          setSelectedProductId(null);
          navigateToPage('catalog');
        }
        break;
      case 'checkout':
        navigateToPage('cart');
        break;
      case 'confirmation':
        setSelectedProductId(null);
        setOrderSummary(null);
        navigateToPage('catalog');
        break;
      default:
        break;
    }
  };

  const headerVariant =
    page === 'confirmation' ? 'none' : page === 'cart' || page === 'checkout' ? 'minimal' : 'default';
  const showBackButton = headerVariant === 'default' && page !== 'catalog';
  const showHeaderTitle = headerVariant === 'minimal';

  if (!isTelegramEnvironment) {
    const deepLink = selectedProductId
      ? buildProductDeepLink(selectedProductId)
      : buildMainDeepLink();

    return (
      <Layout title="TeaGram" cartCount={0} headerVariant="none">
        <div className="telegram-fallback">
          <h1>Это приложение работает только через Telegram.</h1>
          <p>Откройте Mini App через Telegram, чтобы продолжить покупки.</p>
          <button className="cta-button" onClick={() => window.open(deepLink, '_blank')}>
            Открыть в Telegram
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title={layoutTitle}
      cartCount={totalCount}
      showBackButton={showBackButton}
      onBack={handleBack}
      onClose={headerVariant === 'minimal' ? handleBack : undefined}
      onCartClick={() => navigateToPage('cart')}
      headerVariant={headerVariant}
      showTitle={showHeaderTitle}
      showSearch={page === 'catalog'}
      searchValue={searchValue}
      onSearchChange={(value) => setSearchValue(value)}
      headerActions={
        page === 'product' && selectedProductId ? (
          <ProductShareActions productId={selectedProductId} />
        ) : undefined
      }
    >
      <div style={{ display: page === 'catalog' ? 'block' : 'none' }}>
        <CatalogPage
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          searchQuery={activeSearchQuery}
          onSelectProduct={(productId) => {
            catalogScrollPositionRef.current = window.scrollY;
            setSelectedProductId(productId);
            navigateToPage('product');
          }}
        />
      </div>

      {page === 'product' && selectedProductId && (
        <ProductPage
          productId={selectedProductId}
          onGoToCart={() => {
            navigateToPage('cart');
          }}
        />
      )}

      {page === 'cart' && (
        <CartPage
          onContinueShopping={() => {
            setSelectedProductId(null);
            navigateToPage('catalog');
          }}
          onCheckout={() => navigateToPage('checkout')}
          onSelectProduct={(productId) => {
            setSelectedProductId(productId);
            navigateToPage('product');
          }}
        />
      )}

      {page === 'checkout' && (
        <CheckoutPage
          onBackToCart={() => navigateToPage('cart')}
          onOrderComplete={(summary) => {
            setOrderSummary(summary);
            navigateToPage('confirmation');
          }}
        />
      )}

      {page === 'confirmation' && orderSummary && (
        <ConfirmationPage
          summary={orderSummary}
          onGoToCatalog={() => {
            navigateToPage('catalog');
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
