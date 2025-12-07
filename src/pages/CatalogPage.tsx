import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CategoryFilter } from '../components/CategoryFilter';
import { ProductCard } from '../components/ProductCard';
import { fetchCategories, fetchProducts } from '../api/catalog';
import type { CategoryFilterValue, Product } from '../types';

interface CatalogPageProps {
  onSelectProduct: (productId: string) => void;
  activeCategory: CategoryFilterValue;
  onCategoryChange: (category: CategoryFilterValue) => void;
  searchQuery: string;
}

const LOAD_BATCH_SIZE = 3;

export const CatalogPage: React.FC<CatalogPageProps> = ({
  onSelectProduct,
  activeCategory,
  onCategoryChange,
  searchQuery,
}) => {
  const [categories, setCategories] = useState<{ id: CategoryFilterValue; label: string }[]>([
    { id: 'all', label: 'Все' },
  ]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const queryKeyRef = useRef('');
  const requestIdRef = useRef(0);
  const isLoadingRef = useRef(false);
  const pendingLoadRef = useRef(false);
  const productsLengthRef = useRef(0);
  const totalRef = useRef(0);
  const loadProductsRef = useRef<typeof loadProducts | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadProducts = useCallback(
    async (mode: 'reset' | 'append') => {
      if (mode === 'append' && isLoadingRef.current) {
        return;
      }

      const currentQueryKey = queryKeyRef.current;
      const requestId = ++requestIdRef.current;
      isLoadingRef.current = true;
      setIsLoading(true);
      setError(null);

      try {
        const currentOffset = mode === 'append' ? productsLengthRef.current : 0;
        const response = await fetchProducts({
          category: activeCategory === 'all' ? undefined : activeCategory,
          offset: currentOffset,
          limit: LOAD_BATCH_SIZE,
          search: searchQuery || undefined,
        });

        const receivedCount = response.items.length;
        const updatedTotal = response.total ?? totalRef.current;
        const nextLength = mode === 'reset' ? receivedCount : productsLengthRef.current + receivedCount;
        const hasMoreItems = response.total != null ? nextLength < updatedTotal : receivedCount === LOAD_BATCH_SIZE;
        const isStaleRequest = currentQueryKey !== queryKeyRef.current || requestId !== requestIdRef.current;
        if (isStaleRequest) {
          return;
        }

        if (mode === 'reset') {
          setProducts(response.items);
          productsLengthRef.current = response.items.length;
          totalRef.current = updatedTotal;
          setTotal(updatedTotal);
          setHasMore(hasMoreItems);
        } else {
          setProducts((prev) => {
            const newProducts = [...prev, ...response.items];
            productsLengthRef.current = newProducts.length;
            return newProducts;
          });
          totalRef.current = updatedTotal;
          setTotal(updatedTotal);
          setHasMore(hasMoreItems);
        }
      } catch (err) {
        console.error(err);
        const isStaleRequest = currentQueryKey !== queryKeyRef.current || requestId !== requestIdRef.current;
        if (!isStaleRequest) {
          setError('Не удалось загрузить товары');
          if (mode === 'reset') {
            setTotal(0);
            totalRef.current = 0;
            productsLengthRef.current = 0;
          }
          setHasMore(false);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          isLoadingRef.current = false;
          setIsLoading(false);
        }
      }
    },
    [activeCategory, searchQuery]
  );

  // Сохраняем актуальную версию функции в ref
  loadProductsRef.current = loadProducts;

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoriesResponse = await fetchCategories();
        setCategories([
          { id: 'all', label: 'Все' },
          ...categoriesResponse.items.map((item) => ({ id: item.id, label: item.label })),
        ]);
      } catch (err) {
        console.error(err);
        setError('Не удалось загрузить каталог');
      }
    };

    void loadCategories();
  }, []);

  useEffect(() => {
    queryKeyRef.current = `${activeCategory}:${searchQuery}`;
    isLoadingRef.current = false;
    pendingLoadRef.current = false;
    productsLengthRef.current = 0;
    totalRef.current = 0;
    setProducts([]);
    setTotal(0);
    setHasMore(true);
    setError(null);
    void loadProducts('reset');
  }, [activeCategory, loadProducts, searchQuery]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) {
      return;
    }

    if (!observerRef.current) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) {
              return;
            }

            if (isLoadingRef.current) {
              pendingLoadRef.current = true;
              return;
            }

            const scrollY = window.scrollY || window.pageYOffset;
            const isFirstPage = productsLengthRef.current <= LOAD_BATCH_SIZE;
            const hasUserScrolled = scrollY > 100;

            if (isFirstPage && !hasUserScrolled) {
              return;
            }

            if (loadProductsRef.current) {
              pendingLoadRef.current = false;
              void loadProductsRef.current('append');
            }
          });
        },
        {
          rootMargin: '0px',
          threshold: 0.1,
        }
      );

      observerRef.current = observer;
    }

    const observer = observerRef.current;

    if (hasMore) {
      observer.unobserve(sentinel);
      observer.observe(sentinel);
    } else {
      observer.unobserve(sentinel);
    }

    return () => {
      if (observer && sentinel) {
        observer.unobserve(sentinel);
      }
    };
  }, [activeCategory, hasMore, searchQuery]);

  useEffect(() => {
    if (!isLoading && pendingLoadRef.current && hasMore && loadProductsRef.current) {
      pendingLoadRef.current = false;
      void loadProductsRef.current('append');
    }
  }, [hasMore, isLoading]);

  return (
    <div className="page catalog-page">
      <CategoryFilter options={categories} activeCategory={activeCategory} onSelect={onCategoryChange} />
      <div className="product-grid">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} onClick={() => onSelectProduct(product.id)} />
        ))}
      </div>
      {error && (
        <div className="infinite-scroll-status">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => {
              setHasMore(true);
              if (loadProductsRef.current) {
                void loadProductsRef.current('reset');
              }
            }}
            disabled={isLoading}
          >
            Повторить попытку
          </button>
        </div>
      )}
      <div ref={sentinelRef} className="scroll-sentinel" aria-hidden="true" />
      <div className="infinite-scroll-status">
        {!isLoading && products.length === 0 && <span>Товары не найдены</span>}
        {isLoading && <span>Загрузка...</span>}
      </div>
    </div>
  );
};
