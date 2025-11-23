import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useCart } from '../context/CartContext';
import { QuantityControl } from '../components/QuantityControl';
import { fetchProductById } from '../api/catalog';
import type { Product } from '../types';

interface ProductPageProps {
  productId: string;
  onGoToCart: () => void;
}

export const ProductPage: React.FC<ProductPageProps> = ({ productId, onGoToCart }) => {
  const { addItem, updateItem, getItemQuantity, items } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProduct = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchProductById(productId);
      setProduct(response);
    } catch (err) {
      console.error(err);
      setError('Не удалось загрузить товар');
      setProduct(null);
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void loadProduct();
  }, [loadProduct]);

  useEffect(() => {
    if (!product) {
      return;
    }

    const variantWithQuantity = product.variants.find(
      (variant) => getItemQuantity(product.id, variant.id) > 0
    );

    setSelectedVariantId((prev) => {
      if (prev && product.variants.some((variant) => variant.id === prev)) {
        return prev;
      }
      return (variantWithQuantity ?? product.variants[0])?.id ?? null;
    });
  }, [product, items, getItemQuantity]);

  const selectedVariant = useMemo(() => {
    if (!product || !selectedVariantId) {
      return null;
    }
    return product.variants.find((variant) => variant.id === selectedVariantId) ?? null;
  }, [product, selectedVariantId]);

  const selectedQuantity = selectedVariant && product
    ? getItemQuantity(product.id, selectedVariant.id)
    : 0;

  const productTotal = product
    ? product.variants.reduce((sum, variant) => {
        const quantity = getItemQuantity(product.id, variant.id);
        return sum + quantity * variant.price;
      }, 0)
    : 0;

  if (isLoading) {
    return <div className="page product-page">Загрузка...</div>;
  }

  if (error || !product) {
    return (
      <div className="page product-page">
        <div className="empty-state">
          <p>{error ?? 'Товар не найден'}</p>
          <button className="cta-button" onClick={() => void loadProduct()} disabled={isLoading}>
            Повторить загрузку
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page product-page">
      <img src={product.image} alt={product.name} className="product-hero" />
      <h1 className="page-title">{product.name}</h1>
      <p className="product-description">{product.description}</p>
      {product.tags.length > 0 && (
        <div className="tag-list">
          {product.tags.map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
      )}

      <section className="variant-section">
        <h2 className="section-title">Выбор упаковки</h2>
        <div className="variant-options">
          {product.variants.map((variant) => {
            const isActive = variant.id === selectedVariantId;
            return (
              <button
                key={variant.id}
                type="button"
                className={`chip variant-chip ${isActive ? 'chip-active' : ''}`}
                onClick={() => setSelectedVariantId(variant.id)}
              >
                <span className="variant-chip-weight">{variant.weight}</span>
                <span className="variant-chip-price">{variant.price.toLocaleString('ru-RU')} ₽</span>
              </button>
            );
          })}
        </div>

        {selectedVariant && (
          <div className="variant-control-card">
            <div className="variant-control-info">
              <div className="variant-control-weight">{selectedVariant.weight}</div>
              <div className="variant-control-price">
                {selectedVariant.price.toLocaleString('ru-RU')} ₽
              </div>
            </div>
            {selectedQuantity > 0 ? (
              <QuantityControl
                value={selectedQuantity}
                onDecrease={() =>
                  updateItem(product.id, selectedVariant.id, selectedQuantity - 1)
                }
                onIncrease={() =>
                  updateItem(product.id, selectedVariant.id, selectedQuantity + 1)
                }
              />
            ) : (
              <button
                className="primary-button"
                onClick={() => addItem(product.id, selectedVariant.id)}
              >
                Добавить
              </button>
            )}
          </div>
        )}
      </section>

      <div className="bottom-bar">
        <div>
          <div className="bottom-bar-label">Сумма по товару</div>
          <div className="bottom-bar-value">{productTotal.toLocaleString('ru-RU')} ₽</div>
        </div>
        <button className="cta-button" onClick={onGoToCart}>
          Перейти в корзину
        </button>
      </div>
    </div>
  );
};
