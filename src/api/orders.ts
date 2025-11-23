import type { OrderRequest, OrderSummary } from '../types';
import { request } from './client';

export const createOrder = (payload: OrderRequest) =>
  request<OrderSummary>('/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
