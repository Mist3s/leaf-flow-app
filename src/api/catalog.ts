import type { ProductCategory, Product } from '../types';
import { request } from './client';

export interface CatalogResponse {
  total: number;
  items: Product[];
}

export const fetchCategories = () =>
  request<{ items: { id: ProductCategory; label: string }[] }>('/catalog/categories', {
    method: 'GET',
    skipAuth: true,
  });

export const fetchProducts = (params: { category?: ProductCategory; offset?: number; limit?: number; search?: string }) => {
  const searchParams = new URLSearchParams();
  if (params.category) {
    searchParams.set('category', params.category);
  }
  if (params.search) {
    searchParams.set('search', params.search);
  }
  if (typeof params.limit === 'number') {
    searchParams.set('limit', String(params.limit));
  }
  if (typeof params.offset === 'number') {
    searchParams.set('offset', String(params.offset));
  }

  const query = searchParams.toString();
  const path = `/catalog/products${query ? `?${query}` : ''}`;
  return request<CatalogResponse>(path, { method: 'GET', skipAuth: true });
};

export const fetchProductById = (productId: string) =>
  request<Product>(`/catalog/products/${productId}`, { method: 'GET', skipAuth: true });
