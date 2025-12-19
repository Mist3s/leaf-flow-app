import React, { useCallback, useMemo } from 'react';
import { Copy, Send } from 'lucide-react';
import { buildProductDeepLink } from '../utils/telegram';

interface ProductShareActionsProps {
  productId: string;
}

const notify = (message: string) => {
  if (window.Telegram?.WebApp?.showAlert) {
    window.Telegram.WebApp.showAlert(message);
    return;
  }

  if (window.Telegram?.WebApp?.showPopup) {
    window.Telegram.WebApp.showPopup({ message });
    return;
  }

  alert(message);
};

const fallbackCopy = (text: string) => {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
};

export const ProductShareActions: React.FC<ProductShareActionsProps> = ({ productId }) => {
  const shareLink = useMemo(() => buildProductDeepLink(productId), [productId]);

  const handleCopy = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareLink);
      } else {
        fallbackCopy(shareLink);
      }
      notify('Ссылка на товар скопирована');
    } catch (error) {
      console.error('Failed to copy link', error);
      try {
        fallbackCopy(shareLink);
        notify('Ссылка на товар скопирована');
      } catch (fallbackError) {
        console.error('Fallback copy failed', fallbackError);
        notify('Не удалось скопировать ссылку');
      }
    }
  }, [shareLink]);

  const handleShare = useCallback(async () => {
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(shareLink);
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({ url: shareLink });
        return;
      } catch (error) {
        console.error('System share failed', error);
      }
    }

    window.open(shareLink, '_blank');
  }, [shareLink]);

  return (
    <>
      <button className="icon-button" onClick={handleCopy} aria-label="Скопировать ссылку на товар" type="button">
        <Copy size={24} strokeWidth={2.4} />
      </button>
      <button className="icon-button" onClick={handleShare} aria-label="Отправить ссылку на товар" type="button">
        <Send size={24} strokeWidth={2.4} />
      </button>
    </>
  );
};
