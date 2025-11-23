import React from 'react';
import { useCart } from '../context/CartContext';
import { QuantityControl } from '../components/QuantityControl';

interface CartPageProps {
  onContinueShopping: () => void;
  onCheckout: () => void;
  onSelectProduct: (productId: string) => void;
}

export const CartPage: React.FC<CartPageProps> = ({ onContinueShopping, onCheckout, onSelectProduct }) => {
  const { items, updateItem, resolveProduct, resolveVariant, totalCount, totalPrice, isLoading, error, refresh } = useCart();

  if (isLoading) {
    return (
      <div className="page cart-page">
        <div className="empty-state">
          <p>Загрузка корзины...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page cart-page">
        <div className="empty-state">
          <p>{error}</p>
          <button className="cta-button" onClick={refresh}>
            Повторить загрузку
          </button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="page cart-page">
        <div className="empty-state">
          <p>Корзина пуста</p>
          <button className="cta-button" onClick={onContinueShopping}>
            Перейти в каталог
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page cart-page">
      <div className="cart-list">
        {items.map((item) => {
          const product = resolveProduct(item.productId);
          const variant = resolveVariant(item.productId, item.variantId);
          if (!product || !variant) {
            return null;
          }
          const lineTotal = variant.price * item.quantity;
          const variantLabel = `${variant.weight} x ${variant.price.toLocaleString('ru-RU')} ₽`;

          return (
            <div key={`${item.productId}-${item.variantId}`} className="cart-item">
              <button
                className="cart-item-main"
                type="button"
                onClick={() => onSelectProduct(item.productId)}
                aria-label={`Открыть ${product.name}`}
              >
                <img src={product.image} alt={product.name} className="cart-item-image" />
                <div className="cart-item-info">
                  <div className="cart-item-title">{product.name}</div>
                  <div className="cart-item-subtitle">{variantLabel}</div>
                </div>
              </button>
              <div className="cart-item-actions">
                <QuantityControl
                  value={item.quantity}
                  onDecrease={() => updateItem(item.productId, item.variantId, item.quantity - 1)}
                  onIncrease={() => updateItem(item.productId, item.variantId, item.quantity + 1)}
                />
                <div className="cart-item-total">{lineTotal.toLocaleString('ru-RU')} ₽</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="cart-summary">
        <div className="summary-row">
          <span>Товаров</span>
          <span>{totalCount}</span>
        </div>
        <div className="summary-row">
          <span>Сумма</span>
          <span>{totalPrice.toLocaleString('ru-RU')} ₽</span>
        </div>
        <p className="summary-note">Доставка рассчитывается позже</p>
      </div>

      <div className="cart-actions">
        <button className="ghost-button" onClick={onContinueShopping}>
          Продолжить покупки
        </button>
        <button className="cta-button" onClick={onCheckout}>
          Оформить заказ
        </button>
      </div>
    </div>
  );
};
