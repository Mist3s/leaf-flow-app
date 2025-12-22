import React, { useRef, useState } from 'react';
import { Sun, Moon, ShoppingCart, ArrowLeft, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface LayoutProps {
  title?: string;
  children: React.ReactNode;
  onBack?: () => void;
  onClose?: () => void;
  onCartClick?: () => void;
  cartCount: number;
  showBackButton?: boolean;
  headerVariant?: 'default' | 'minimal' | 'none';
  showTitle?: boolean;
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  headerActions?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  title,
  children,
  onBack,
  onClose,
  onCartClick,
  cartCount,
  showBackButton = false,
  headerVariant = 'default',
  showTitle = true,
  showSearch = false,
  searchValue = '',
  onSearchChange,
  headerActions,
}) => {
  const { theme, toggleTheme } = useTheme();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const blurSearchInput = () => {
    searchInputRef.current?.blur();
  };

  const renderDefaultHeader = () => (
    <header className="app-header">
      <div className="header-left">
        {showBackButton ? (
          <button className="icon-button" onClick={onBack} aria-label="Назад">
            <ArrowLeft size={24} strokeWidth={2.4} />
          </button>
        ) : showSearch ? (
          <div className="search-wrapper">
            <label className="search-input" aria-label="Поиск по товарам">
              <input
                ref={searchInputRef}
                type="search"
                value={searchValue}
                onChange={(event) => onSearchChange?.(event.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    blurSearchInput();
                  }
                }}
                placeholder="Поиск"
              />
              {searchValue && (
                <button
                  type="button"
                  className="search-clear"
                  onClick={() => {
                    onSearchChange?.('');
                    blurSearchInput();
                  }}
                  aria-label="Очистить поиск"
                >
                  <X size={20} strokeWidth={2.2} />
                </button>
              )}
            </label>
            {isSearchFocused && (
              <button
                type="button"
                className="search-hide"
                onClick={blurSearchInput}
                aria-label="Скрыть клавиатуру"
              >
                Скрыть
              </button>
            )}
          </div>
        ) : (
          <div className="logo">TeaGram</div>
        )}
      </div>
      <div className="header-title">{showTitle ? title : null}</div>
      <div className="header-actions">
        {headerActions}
        <button className="icon-button" onClick={toggleTheme} aria-label="Переключить тему">
          {theme === 'light' ? <Sun size={24} strokeWidth={2.4} /> : <Moon size={24} strokeWidth={2.4} />}
        </button>
        <button className="icon-button cart-button" onClick={onCartClick} aria-label="Корзина">
          <ShoppingCart size={24} strokeWidth={2.4} />
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
        </button>
      </div>
    </header>
  );

  const renderMinimalHeader = () => {
    const handleClose = () => {
      if (onClose) {
        onClose();
        return;
      }

      if (onBack) {
        onBack();
      }
    };

    return (
      <header className="app-header app-header--minimal">
        <button className="icon-button" onClick={handleClose} aria-label="Закрыть" type="button">
          <X size={24} strokeWidth={2.4} />
        </button>
        <div className="header-title header-title--center">{title}</div>
        <div className="header-spacer" />
      </header>
    );
  };

  const renderHeader = () => {
    if (headerVariant === 'none') {
      return null;
    }

    return headerVariant === 'minimal' ? renderMinimalHeader() : renderDefaultHeader();
  };

  const contentClasses = ['app-content'];

  if (headerVariant === 'minimal') {
    contentClasses.push('app-content--flush');
  }

  if (headerVariant === 'none') {
    contentClasses.push('app-content--centered');
  }

  return (
    <div className="app-shell">
      {renderHeader()}
      <main className={contentClasses.join(' ')}>{children}</main>
    </div>
  );
};
