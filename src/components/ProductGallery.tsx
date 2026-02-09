import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Product } from '../types';
import { getProductImageUrls } from '../utils/image';

interface ProductGalleryProps {
  product: Product;
}

const AUTO_PLAY_INTERVAL = 5000;
const AUTO_PLAY_PAUSE_AFTER_INTERACTION = 8000;

/* ================================================================
   Вспомогательные функции для pinch-to-zoom
   ================================================================ */

function getTouchDistance(t1: React.Touch | Touch, t2: React.Touch | Touch) {
  return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
}

function getTouchCenter(t1: React.Touch | Touch, t2: React.Touch | Touch) {
  return {
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/* ================================================================ */

export const ProductGallery: React.FC<ProductGalleryProps> = ({ product }) => {
  const mdUrls = getProductImageUrls(product, 'md');
  const lgUrls = getProductImageUrls(product, 'lg');

  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);

  const isSingle = mdUrls.length <= 1;

  /* ==========================================================
     Carousel: scroll tracking
     ========================================================== */

  const handleScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container || isScrollingRef.current) return;

    const scrollLeft = container.scrollLeft;
    const width = container.clientWidth;
    const index = Math.round(scrollLeft / width);
    setCurrentIndex(Math.max(0, Math.min(index, mdUrls.length - 1)));
  }, [mdUrls.length]);

  const scrollToIndex = useCallback((index: number) => {
    const container = scrollRef.current;
    if (!container) return;

    isScrollingRef.current = true;
    container.scrollTo({ left: index * container.clientWidth, behavior: 'smooth' });
    setCurrentIndex(index);

    setTimeout(() => {
      isScrollingRef.current = false;
    }, 400);
  }, []);

  /* ==========================================================
     Carousel: autoplay every 5 s, cyclic
     ========================================================== */

  const autoplayPausedUntil = useRef(0);

  const pauseAutoplay = useCallback(() => {
    autoplayPausedUntil.current = Date.now() + AUTO_PLAY_PAUSE_AFTER_INTERACTION;
  }, []);

  useEffect(() => {
    if (isSingle || lightboxIndex !== null) return;

    const timer = setInterval(() => {
      if (Date.now() < autoplayPausedUntil.current) return;

      setCurrentIndex((prev) => {
        const next = prev >= mdUrls.length - 1 ? 0 : prev + 1;
        scrollToIndex(next);
        return next;
      });
    }, AUTO_PLAY_INTERVAL);

    return () => clearInterval(timer);
  }, [isSingle, mdUrls.length, lightboxIndex, scrollToIndex]);

  /* Pause on user touch / mouse interaction with carousel */
  const handleUserInteraction = useCallback(() => {
    pauseAutoplay();
  }, [pauseAutoplay]);

  /* ==========================================================
     Lightbox: open / close / nav
     ========================================================== */

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    document.body.style.overflow = '';
  }, []);

  const lightboxPrev = useCallback(() => {
    setLightboxIndex((prev) => {
      if (prev === null) return null;
      return prev <= 0 ? lgUrls.length - 1 : prev - 1;
    });
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, [lgUrls.length]);

  const lightboxNext = useCallback(() => {
    setLightboxIndex((prev) => {
      if (prev === null) return null;
      return prev >= lgUrls.length - 1 ? 0 : prev + 1;
    });
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, [lgUrls.length]);

  /* ==========================================================
     Lightbox: pinch-to-zoom & pan & double-tap
     ========================================================== */

  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });

  const pinchRef = useRef({
    startDistance: 0,
    startScale: 1,
    isPinching: false,
  });

  const panRef = useRef({
    startX: 0,
    startY: 0,
    startTranslateX: 0,
    startTranslateY: 0,
    isPanning: false,
  });

  const lastTapRef = useRef(0);

  const imageContainerRef = useRef<HTMLDivElement>(null);

  /* Double-tap to toggle zoom */
  const handleDoubleTap = useCallback(() => {
    setScale((prev) => {
      if (prev > 1) {
        setTranslate({ x: 0, y: 0 });
        return 1;
      }
      return 2.5;
    });
  }, []);

  /* Touch start on lightbox image area */
  const handleLightboxTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        // Pinch start
        e.preventDefault();
        pinchRef.current = {
          startDistance: getTouchDistance(e.touches[0], e.touches[1]),
          startScale: scale,
          isPinching: true,
        };
        panRef.current.isPanning = false;
      } else if (e.touches.length === 1) {
        // Check double-tap
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          e.preventDefault();
          handleDoubleTap();
          lastTapRef.current = 0;
          return;
        }
        lastTapRef.current = now;

        // Pan start (only when zoomed)
        if (scale > 1) {
          panRef.current = {
            startX: e.touches[0].clientX,
            startY: e.touches[0].clientY,
            startTranslateX: translate.x,
            startTranslateY: translate.y,
            isPanning: true,
          };
        } else {
          // Swipe tracking for nav (when not zoomed)
          panRef.current = {
            startX: e.touches[0].clientX,
            startY: e.touches[0].clientY,
            startTranslateX: 0,
            startTranslateY: 0,
            isPanning: false,
          };
        }
      }
    },
    [scale, translate, handleDoubleTap],
  );

  const handleLightboxTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2 && pinchRef.current.isPinching) {
        e.preventDefault();
        const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
        const ratio = currentDistance / pinchRef.current.startDistance;
        const newScale = clamp(pinchRef.current.startScale * ratio, 1, 5);
        setScale(newScale);

        if (newScale <= 1) {
          setTranslate({ x: 0, y: 0 });
        }
      } else if (e.touches.length === 1 && panRef.current.isPanning && scale > 1) {
        e.preventDefault();
        const dx = e.touches[0].clientX - panRef.current.startX;
        const dy = e.touches[0].clientY - panRef.current.startY;
        setTranslate({
          x: panRef.current.startTranslateX + dx,
          y: panRef.current.startTranslateY + dy,
        });
      }
    },
    [scale],
  );

  const handleLightboxTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (pinchRef.current.isPinching) {
        pinchRef.current.isPinching = false;
        // Snap to 1 if close
        if (scale < 1.1) {
          setScale(1);
          setTranslate({ x: 0, y: 0 });
        }
        return;
      }

      // Swipe nav (only when not zoomed)
      if (scale <= 1 && !panRef.current.isPanning && e.changedTouches.length === 1) {
        const dx = e.changedTouches[0].clientX - panRef.current.startX;
        if (Math.abs(dx) > 50) {
          if (dx > 0) {
            lightboxPrev();
          } else {
            lightboxNext();
          }
        }
      }

      panRef.current.isPanning = false;
    },
    [scale, lightboxPrev, lightboxNext],
  );

  /* Prevent default on the whole lightbox to block page zoom */
  const lightboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = lightboxRef.current;
    if (!el) return;

    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        e.preventDefault();
      }
    };

    el.addEventListener('touchmove', preventZoom, { passive: false });
    return () => el.removeEventListener('touchmove', preventZoom);
  }, [lightboxIndex]);

  /* Keyboard navigation */
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') lightboxPrev();
      if (e.key === 'ArrowRight') lightboxNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, closeLightbox, lightboxPrev, lightboxNext]);

  /* Cleanup overflow on unmount */
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  /* ==========================================================
     Render
     ========================================================== */

  const imageTransform =
    scale !== 1 || translate.x !== 0 || translate.y !== 0
      ? `translate(${translate.x}px, ${translate.y}px) scale(${scale})`
      : undefined;

  return (
    <>
      {/* Carousel */}
      <div className="gallery">
        <div
          ref={scrollRef}
          className="gallery-scroll"
          onScroll={handleScroll}
          onTouchStart={handleUserInteraction}
          onMouseDown={handleUserInteraction}
        >
          {mdUrls.map((url, index) => (
            <button
              key={index}
              type="button"
              className="gallery-slide"
              onClick={() => openLightbox(index)}
              aria-label={`Изображение ${index + 1} из ${mdUrls.length}`}
            >
              <img
                src={url}
                alt={`${product.name} — ${index + 1}`}
                className="gallery-image"
                draggable={false}
              />
            </button>
          ))}
        </div>

        {!isSingle && (
          <div className="gallery-dots">
            {mdUrls.map((_, index) => (
              <button
                key={index}
                type="button"
                className={`gallery-dot ${index === currentIndex ? 'gallery-dot--active' : ''}`}
                onClick={() => {
                  pauseAutoplay();
                  setCurrentIndex(index);
                  scrollToIndex(index);
                }}
                aria-label={`Перейти к изображению ${index + 1}`}
              />
            ))}
          </div>
        )}

        {!isSingle && (
          <div className="gallery-counter">
            {currentIndex + 1}/{mdUrls.length}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          ref={lightboxRef}
          className="lightbox"
          onClick={scale <= 1 ? closeLightbox : undefined}
        >
          <div className="lightbox-header">
            {lgUrls.length > 1 && (
              <span className="lightbox-counter">
                {lightboxIndex + 1} / {lgUrls.length}
              </span>
            )}
            <button
              type="button"
              className="lightbox-close"
              onClick={(e) => {
                e.stopPropagation();
                closeLightbox();
              }}
              aria-label="Закрыть"
            >
              <X size={24} />
            </button>
          </div>

          <div
            ref={imageContainerRef}
            className="lightbox-body"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleLightboxTouchStart}
            onTouchMove={handleLightboxTouchMove}
            onTouchEnd={handleLightboxTouchEnd}
          >
            {lgUrls.length > 1 && (
              <button
                type="button"
                className="lightbox-arrow lightbox-arrow--left"
                onClick={(e) => {
                  e.stopPropagation();
                  lightboxPrev();
                }}
                aria-label="Предыдущее"
              >
                <ChevronLeft size={28} />
              </button>
            )}

            <img
              src={lgUrls[lightboxIndex]}
              alt={`${product.name} — ${lightboxIndex + 1}`}
              className="lightbox-image"
              draggable={false}
              style={imageTransform ? { transform: imageTransform } : undefined}
            />

            {lgUrls.length > 1 && (
              <button
                type="button"
                className="lightbox-arrow lightbox-arrow--right"
                onClick={(e) => {
                  e.stopPropagation();
                  lightboxNext();
                }}
                aria-label="Следующее"
              >
                <ChevronRight size={28} />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};
