import type { ImageVariantType, Product, ProductImage } from '../types';

/**
 * Возвращает URL конкретного варианта из одного объекта ProductImage.
 * Если нужный вариант отсутствует — берётся первый доступный.
 */
function resolveVariantUrl(
  image: ProductImage,
  variant: ImageVariantType,
): string | null {
  const matched = image.variants.find((v) => v.variant === variant);
  if (matched) {
    return matched.storage_key;
  }
  if (image.variants.length > 0) {
    return image.variants[0].storage_key;
  }
  return null;
}

/**
 * Возвращает отсортированный список активных изображений продукта.
 */
function getActiveImages(product: Pick<Product, 'images'>): ProductImage[] {
  return (product.images ?? [])
    .filter((img) => img.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);
}

/**
 * Возвращает URL изображения нужного варианта из массива `images`.
 * Если `images` отсутствует или пуст — фолбэк на поле `image`.
 *
 * @param product  — объект товара
 * @param variant  — требуемый вариант изображения ('thumb' | 'md' | 'lg' | 'original')
 */
export function getProductImageUrl(
  product: Pick<Product, 'image' | 'images'>,
  variant: ImageVariantType = 'thumb',
): string {
  const activeImages = getActiveImages(product);

  if (activeImages.length === 0) {
    return product.image;
  }

  return resolveVariantUrl(activeImages[0], variant) ?? product.image;
}

/**
 * Возвращает массив URL всех активных изображений нужного варианта.
 * Если `images` отсутствует или пуст — возвращает массив с одним элементом `image`.
 */
export function getProductImageUrls(
  product: Pick<Product, 'image' | 'images'>,
  variant: ImageVariantType,
): string[] {
  const activeImages = getActiveImages(product);

  if (activeImages.length === 0) {
    return [product.image];
  }

  return activeImages
    .map((img) => resolveVariantUrl(img, variant))
    .filter((url): url is string => url !== null);
}
