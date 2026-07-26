import { useEffect, useRef, useState, type TouchEvent } from "react";

type ImageLightboxProps = {
  images: string[];
  initialIndex: number;
  itemName: string;
  onClose: () => void;
};

export function ImageLightbox({ images, initialIndex, itemName, onClose }: ImageLightboxProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const touchStart = useRef<{ x: number; y: number }>();
  const hasMultipleImages = images.length > 1;

  function showImage(offset: number) {
    setActiveIndex((current) => (current + offset + images.length) % images.length);
  }

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && hasMultipleImages) showImage(-1);
      if (event.key === "ArrowRight" && hasMultipleImages) showImage(1);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [hasMultipleImages, images.length, onClose]);

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    const touch = event.changedTouches[0];
    if (touch) touchStart.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const touch = event.changedTouches[0];
    if (!touch || !touchStart.current || !hasMultipleImages) return;
    const distanceX = touch.clientX - touchStart.current.x;
    const distanceY = touch.clientY - touchStart.current.y;
    touchStart.current = undefined;
    if (Math.abs(distanceX) < 40 || Math.abs(distanceX) <= Math.abs(distanceY)) return;
    showImage(distanceX > 0 ? -1 : 1);
  }

  return (
    <div
      className="image-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`${itemName}图片预览`}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="image-lightbox__panel">
        <button type="button" className="image-lightbox__close" aria-label="关闭图片预览" onClick={onClose}>
          ×
        </button>

        <div
          className="image-lightbox__stage"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {hasMultipleImages ? (
            <button
              type="button"
              className="image-lightbox__arrow image-lightbox__arrow--previous"
              aria-label="查看上一张图片"
              onClick={() => showImage(-1)}
            >
              ‹
            </button>
          ) : null}
          <img src={images[activeIndex]} alt={`${itemName}图片 ${activeIndex + 1}`} />
          {hasMultipleImages ? (
            <button
              type="button"
              className="image-lightbox__arrow image-lightbox__arrow--next"
              aria-label="查看下一张图片"
              onClick={() => showImage(1)}
            >
              ›
            </button>
          ) : null}
        </div>

        {hasMultipleImages ? (
          <div className="image-lightbox__dots" aria-label={`第 ${activeIndex + 1} 张，共 ${images.length} 张`}>
            {images.map((_, index) => (
              <button
                type="button"
                key={index}
                className={index === activeIndex ? "is-active" : ""}
                aria-label={`查看第 ${index + 1} 张图片`}
                aria-current={index === activeIndex ? "true" : undefined}
                onClick={() => setActiveIndex(index)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
