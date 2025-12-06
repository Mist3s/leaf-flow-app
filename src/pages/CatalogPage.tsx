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

const LOAD_BATCH_SIZE = 5;

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
  const isLoadingRef = useRef(false);
  const pendingLoadRef = useRef(false);

  const refreshPageData = useCallback(async () => {
    if (isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;
    setIsLoading(true);
    setError(null);
    try {
      const [categoriesResponse, productsResponse] = await Promise.all([
        fetchCategories(),
        fetchProducts({
          category: activeCategory === 'all' ? undefined : activeCategory,
          offset: 0,
          limit: LOAD_BATCH_SIZE,
          search: searchQuery || undefined,
        }),
      ]);

      setCategories([
        { id: 'all', label: 'Все' },
        ...categoriesResponse.items.map((item) => ({ id: item.id, label: item.label })),
      ]);
      setProducts(productsResponse.items);
      setTotal(productsResponse.total);
      setHasMore(productsResponse.items.length < productsResponse.total);
    } catch (err) {
      console.error(err);
      setError('Не удалось загрузить каталог');
      setProducts([]);
      setTotal(0);
      setHasMore(false);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [activeCategory, searchQuery]);

  const loadProducts = useCallback(
    async (mode: 'reset' | 'append') => {
      if (isLoadingRef.current) {
        return;
      }

      isLoadingRef.current = true;
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetchProducts({
          category: activeCategory === 'all' ? undefined : activeCategory,
          offset: mode === 'append' ? products.length : 0,
          limit: LOAD_BATCH_SIZE,
          search: searchQuery || undefined,
        });

        if (mode === 'reset') {
          setProducts(response.items);
        } else {
          setProducts((prev) => [...prev, ...response.items]);
        }

        setTotal(response.total);
        setHasMore(response.items.length + (mode === 'append' ? products.length : 0) < response.total);
      } catch (err) {
        console.error(err);
        setError('Не удалось загрузить товары');
        if (mode === 'reset') {
          setTotal(0);
        }
        setHasMore(false);
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [activeCategory, products.length, searchQuery]
  );

  useEffect(() => {
    void refreshPageData();
  }, [activeCategory, refreshPageData, searchQuery]);

  useEffect(() => {
    if (!hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (isLoadingRef.current) {
              pendingLoadRef.current = true;
              return;
            }

            pendingLoadRef.current = false;
            void loadProducts('append');
          }
        });
      },
      { rootMargin: '200px' }
    );

    const sentinel = sentinelRef.current;
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => {
      if (sentinel) {
        observer.unobserve(sentinel);
      }
      observer.disconnect();
    };
  }, [hasMore, loadProducts]);

  useEffect(() => {
    if (!isLoading && pendingLoadRef.current && hasMore) {
      pendingLoadRef.current = false;
      void loadProducts('append');
    }
  }, [hasMore, isLoading, loadProducts]);

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
              void refreshPageData();
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
        {!isLoading && products.length > 0 && !hasMore && total > LOAD_BATCH_SIZE && (
          <span>Вы просмотрели все товары</span>
        )}
      </div>
    </div>
  );
};
