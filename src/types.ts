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

export type ImageVariantType = 'original' | 'thumb' | 'md' | 'lg';

export interface ProductImageVariant {
  id: number;
  product_image_id: number;
  variant: ImageVariantType;
  format: string;
  storage_key: string;
  width: number;
  height: number;
  byte_size: number;
}

export interface ProductImage {
  id: number;
  product_id: string;
  title: string;
  is_active: boolean;
  sort_order: number;
  variants: ProductImageVariant[];
  image_url: string | null;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  tags: string[];
  image: string;
  images?: ProductImage[];
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

export interface AuthResponse {
  tokens: AuthTokens;
}

export interface UserProfile {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export type Page =
  | 'catalog'
  | 'product'
  | 'cart'
  | 'checkout'
  | 'confirmation';
