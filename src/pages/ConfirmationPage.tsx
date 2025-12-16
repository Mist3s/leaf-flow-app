import React from 'react';
import type { OrderSummary } from '../types';

interface ConfirmationPageProps {
  summary: OrderSummary;
  onGoToCatalog: () => void;
}

const deliveryMethodMapping: Record<string, string> = {
  courier: 'Курьер',
  pickup: 'Самовывоз',
};

export const ConfirmationPage: React.FC<ConfirmationPageProps> = ({ summary, onGoToCatalog }) => {
  const handleClose = () => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.close) {
      window.Telegram.WebApp.close();
    }
  };

  const getDeliveryMethodLabel = (method: string): string => {
    return deliveryMethodMapping[method] || method;
  };

  return (
    <div className="page confirmation-page">
      <div className="confirmation-card">
        <div className="confirmation-icon">✅</div>
        <h1 className="page-title">Заказ оформлен</h1>
        <p className="confirmation-text">Спасибо, ваш заказ принят в обработку.</p>
        <div className="confirmation-details">
          <div className="summary-row">
            <span>Номер заказа</span>
            <span>{summary.orderId}</span>
          </div>
          <div className="summary-row">
            <span>Имя</span>
            <span>{summary.customerName}</span>
          </div>
          <div className="summary-row">
            <span>Доставка</span>
            <span>{getDeliveryMethodLabel(summary.deliveryMethod)}</span>
          </div>
          <div className="summary-row">
            <span>Сумма</span>
            <span>{summary.total.toLocaleString('ru-RU')} ₽</span>
          </div>
          <p className="confirmation-text">Дальнейшая переписка по заказу ведётся с оператором в чат-боте.</p>
        </div>
        <div className="confirmation-actions">
          <button className="cta-button" onClick={onGoToCatalog}>
            Вернуться в каталог
          </button>
          <button className="ghost-button" onClick={handleClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
