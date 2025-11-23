import React, { useMemo, useState } from 'react';
import { useCart } from '../context/CartContext';
import { createOrder } from '../api/orders';
import type { DeliveryMethod, OrderRequest, OrderSummary } from '../types';

interface CheckoutPageProps {
  onBackToCart: () => void;
  onOrderComplete: (summary: OrderSummary) => void;
}

interface FormState {
  name: string;
  phone: string;
  delivery: DeliveryMethod;
  address: string;
  comment: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

const formatPhoneNumber = (value: string) => {
  const digits = value.replace(/\D/g, '');

  if (digits.length === 0) {
    return '';
  }

  let normalized = digits;

  if (normalized.startsWith('8')) {
    normalized = `7${normalized.slice(1)}`;
  }

  if (!normalized.startsWith('7')) {
    normalized = `7${normalized}`;
  }

  normalized = normalized.slice(0, 11);

  const rest = normalized.slice(1);
  let result = '+7';

  if (rest.length > 0) {
    result += ` ${rest.slice(0, 3)}`;
  }
  if (rest.length > 3) {
    result += ` ${rest.slice(3, 6)}`;
  }
  if (rest.length > 6) {
    result += `-${rest.slice(6, 8)}`;
  }
  if (rest.length > 8) {
    result += `-${rest.slice(8, 10)}`;
  }

  return result;
};

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ onBackToCart, onOrderComplete }) => {
  const { items, totalCount, totalPrice, clear, isLoading, error, refresh } = useCart();
  const [form, setForm] = useState<FormState>({
    name: '',
    phone: '',
    delivery: 'pickup',
    address: '',
    comment: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isAddressRequired = form.delivery !== 'pickup';

  const validate = () => {
    const nextErrors: FormErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = 'Укажите имя';
    }

    const phoneDigits = form.phone.replace(/\D/g, '');
    if (phoneDigits.length !== 11) {
      nextErrors.phone = 'Введите номер в формате +7 000 000-00-00';
    }

    if (isAddressRequired && !form.address.trim()) {
      nextErrors.address = 'Укажите адрес доставки';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const clearFieldError = (field: keyof FormState) => {
    setErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleChange = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    clearFieldError(key);

    if (key === 'delivery' && value === 'pickup') {
      clearFieldError('address');
    }
  };

  const handlePhoneChange = (value: string) => {
    if (value === '') {
      handleChange('phone', '');
      return;
    }

    const formatted = formatPhoneNumber(value);
    handleChange('phone', formatted);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    const payload: OrderRequest = {
      customerName: form.name.trim(),
      phone: form.phone,
      delivery: form.delivery,
      address: form.delivery === 'pickup' ? undefined : form.address.trim(),
      comment: form.comment.trim() || undefined,
      expectedTotal: totalPrice,
    };

    try {
      const summary = await createOrder(payload);
      clear();
      onOrderComplete(summary);
    } catch (orderError) {
      console.error(orderError);
      setSubmitError('Не удалось оформить заказ, попробуйте ещё раз');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deliveryOptions: { value: DeliveryMethod; label: string }[] = useMemo(
    () => [
      { value: 'pickup', label: 'Самовывоз' },
      { value: 'courier', label: 'Курьер' },
      { value: 'cdek', label: 'СДЭК' },
    ],
    []
  );

  if (isLoading) {
    return (
      <div className="page checkout-page">
        <div className="empty-state">
          <p>Загрузка корзины...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page checkout-page">
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
      <div className="page checkout-page">
        <div className="empty-state">
          <p>Корзина пуста</p>
          <button className="cta-button" onClick={onBackToCart}>
            Вернуться в каталог
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page checkout-page">
      <form className="checkout-form" onSubmit={handleSubmit}>
        <section>
          <h2 className="section-title">Контактные данные</h2>
          <label className="form-label">
            Имя*
            {errors.name && <span className="field-error">{errors.name}</span>}
            <input
              className={`input ${errors.name ? 'input-error' : ''}`}
              type="text"
              value={form.name}
              onChange={(event) => handleChange('name', event.target.value)}
              placeholder="Как к вам обращаться"
            />
          </label>
          <label className="form-label">
            Телефон*
            {errors.phone && <span className="field-error">{errors.phone}</span>}
            <input
              className={`input ${errors.phone ? 'input-error' : ''}`}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={18}
              value={form.phone}
              onChange={(event) => handlePhoneChange(event.target.value)}
              placeholder="+7 ___ ___-__-__"
            />
          </label>
        </section>

        <section>
          <h2 className="section-title">Доставка</h2>
          <div className="delivery-options">
            {deliveryOptions.map((option) => (
              <button
                type="button"
                key={option.value}
                className={`chip ${form.delivery === option.value ? 'chip-active' : ''}`}
                onClick={() => handleChange('delivery', option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          {form.delivery === 'pickup' ? (
            <div className="pickup-info">
              <div className="pickup-title">Пункт самовывоза</div>
              <div>г. Москва, Китай-город, ул. Чайная, 7</div>
              <div className="pickup-note">Ежедневно с 10:00 до 22:00, дегустационный зал на втором этаже</div>
            </div>
          ) : (
            <label className="form-label">
              Адрес доставки*
              {errors.address && <span className="field-error">{errors.address}</span>}
              <input
                className={`input ${errors.address ? 'input-error' : ''}`}
                type="text"
                value={form.address}
                onChange={(event) => handleChange('address', event.target.value)}
                placeholder={
                  form.delivery === 'courier'
                    ? 'Улица, дом, квартира'
                    : 'Город, пункт выдачи СДЭК'
                }
              />
            </label>
          )}
        </section>

        <section>
          <h2 className="section-title">Комментарий</h2>
          <textarea
            className="textarea"
            value={form.comment}
            onChange={(event) => handleChange('comment', event.target.value)}
            placeholder="Например, позвоните за час до доставки"
            rows={3}
          />
        </section>

        <section>
          <h2 className="section-title">Оплата</h2>
          <div className="payment-info">Оплата при получении</div>
        </section>

        <section className="checkout-summary">
          <div className="summary-row">
            <span>Позиций</span>
            <span>{totalCount}</span>
          </div>
          <div className="summary-row">
            <span>Сумма заказа</span>
            <span>{totalPrice.toLocaleString('ru-RU')} ₽</span>
          </div>
        </section>

        {submitError && <div className="form-errors">{submitError}</div>}

        <div className="checkout-actions">
          <button type="button" className="ghost-button" onClick={onBackToCart} disabled={isSubmitting}>
            Назад в корзину
          </button>
          <button type="submit" className="cta-button" disabled={isSubmitting}>
            {isSubmitting ? 'Отправка...' : 'Подтвердить заказ'}
          </button>
        </div>
      </form>
    </div>
  );
};
