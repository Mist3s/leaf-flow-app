import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { addCartItem, clearCart as clearCartApi, fetchCart, removeCartItem, updateCartItem } from '../api/cart';
import { fetchProductById } from '../api/catalog';
import type { Cart, CartItem, Product, ProductVariant } from '../types';

interface CartContextValue {
  items: CartItem[];
  addItem: (productId: string, variantId: string) => void;
  updateItem: (productId: string, variantId: string, quantity: number) => void;
  clear: () => void;
  getItemQuantity: (productId: string, variantId: string) => number;
  totalCount: number;
  totalPrice: number;
  resolveProduct: (productId: string) => Product | undefined;
  resolveVariant: (productId: string, variantId: string) => ProductVariant | undefined;
  refresh: () => void;
  isLoading: boolean;
  error: string | null;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [productCache, setProductCache] = useState<Record<string, Product>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hydrateProducts = async (items: CartItem[]) => {
    const missingProductIds = items
      .map((item) => item.productId)
      .filter((productId, index, array) => array.indexOf(productId) === index)
      .filter((productId) => !productCache[productId]);

    if (missingProductIds.length === 0) {
      return;
    }

    const loaded = await Promise.all(
      missingProductIds.map((productId) => fetchProductById(productId).catch(() => null))
    );

    setProductCache((prev) => {
      const next = { ...prev };
      loaded.forEach((product) => {
        if (product) {
          next[product.id] = product;
        }
      });
      return next;
    });
  };

  const loadCart = () => {
    setIsLoading(true);
    setError(null);
    fetchCart()
      .then(async (response) => {
        setCart(response);
        await hydrateProducts(response.items);
      })
      .catch((err) => {
        console.error(err);
        setError('Не удалось загрузить корзину');
        setCart({ items: [], totalCount: 0, totalPrice: 0 });
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadCart();
  }, []);

  const handleCartUpdate = async (action: () => Promise<Cart>) => {
    setIsUpdating(true);
    setError(null);
    try {
      const response = await action();
      setCart(response);
      await hydrateProducts(response.items);
    } catch (err) {
      console.error(err);
      setError('Не удалось обновить корзину');
    } finally {
      setIsUpdating(false);
    }
  };

  const addItem = (productId: string, variantId: string) => {
    void handleCartUpdate(() => addCartItem({ productId, variantId, quantity: 1 }));
  };

  const updateItem = (productId: string, variantId: string, quantity: number) => {
    if (quantity <= 0) {
      void handleCartUpdate(() => removeCartItem(productId, variantId));
      return;
    }

    void handleCartUpdate(() => updateCartItem(productId, variantId, quantity));
  };

  const clear = () => {
    void handleCartUpdate(() => clearCartApi().then(() => ({ items: [], totalCount: 0, totalPrice: 0 })));
  };

  const getItemQuantity = (productId: string, variantId: string) =>
    cart?.items.find((item) => item.productId === productId && item.variantId === variantId)?.quantity ?? 0;

  const resolveProduct = (productId: string) => productCache[productId];

  const resolveVariant = (productId: string, variantId: string) =>
    resolveProduct(productId)?.variants.find((variant) => variant.id === variantId);

  const totals = useMemo(
    () => ({
      totalCount: cart?.totalCount ?? 0,
      totalPrice: cart?.totalPrice ?? 0,
    }),
    [cart]
  );

  const value: CartContextValue = {
    items: cart?.items ?? [],
    addItem,
    updateItem,
    clear,
    getItemQuantity,
    totalCount: totals.totalCount,
    totalPrice: totals.totalPrice,
    resolveProduct,
    resolveVariant,
    refresh: loadCart,
    isLoading: isLoading || isUpdating,
    error,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart должен использоваться внутри CartProvider');
  }
  return context;
};
