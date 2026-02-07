import React from 'react';
import type { Product } from '../types';
import { getProductImageUrl } from '../utils/image';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => {
  const minPrice = Math.min(...product.variants.map((variant) => variant.price));

  return (
    <button className="product-card" onClick={onClick}>
      <img src={getProductImageUrl(product, 'thumb')} alt={product.name} className="product-image" />
      <div className="product-info">
        <h3 className="product-title">{product.name}</h3>
        <p className="product-price">от {minPrice.toLocaleString('ru-RU')} ₽</p>
      </div>
    </button>
  );
};
