import type { Cart, CartItemInput } from '../types';
import { request } from './client';

export const fetchCart = () => request<Cart>('/cart', { method: 'GET' });

export const clearCart = () => request<void>('/cart', { method: 'DELETE' });

export const addCartItem = (item: CartItemInput) =>
  request<Cart>('/cart/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });

export const replaceCartItems = (items: CartItemInput[]) =>
  request<Cart>('/cart/items', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });

export const updateCartItem = (productId: string, variantId: string, quantity: number) =>
  request<Cart>(`/cart/items/${productId}/${variantId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity }),
  });

export const removeCartItem = (productId: string, variantId: string) =>
  request<Cart>(`/cart/items/${productId}/${variantId}`, { method: 'DELETE' });
