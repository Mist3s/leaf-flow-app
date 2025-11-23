export type ProductCategory = 'green' | 'black' | 'oolong' | 'puer' | 'sets';
export type CategoryFilterValue = 'all' | ProductCategory;

export interface Category {
  id: ProductCategory;
  label: string;
}

export interface ProductVariant {
  id: string;
  weight: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  tags: string[];
  image: string;
  variants: ProductVariant[];
}

export interface CartItemInput {
  productId: string;
  variantId: string;
  quantity: number;
}

export interface CartItem extends CartItemInput {
  price?: number;
  total?: number;
}

export interface Cart {
  items: CartItem[];
  totalCount: number;
  totalPrice: number;
  updatedAt?: string;
}

export interface OrderSummary {
  orderId: string;
  customerName: string;
  deliveryMethod: string;
  total: number;
}

export type DeliveryMethod = 'pickup' | 'courier' | 'cdek';

export interface OrderRequest {
  customerName: string;
  phone: string;
  delivery: DeliveryMethod;
  address?: string;
  comment?: string;
  expectedTotal?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

export type Page =
  | 'catalog'
  | 'product'
  | 'cart'
  | 'checkout'
  | 'confirmation';
