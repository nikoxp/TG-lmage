import { useState, useRef, useEffect, memo } from 'react';

/**
 * LazyImage - 使用 Intersection Observer 实现懒加载
 * 图片进入视口时才开始加载，带淡入动画
 */
const LazyImage = memo(({
  src,
  alt = '',
  className = '',
  placeholderClass = '',
  rootMargin = '200px',
  threshold = 0.01,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;

    // 如果浏览器不支持 IntersectionObserver，直接加载
    if (!('IntersectionObserver' in window)) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(el);
        }
      },
      { rootMargin, threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin, threshold]);

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${placeholderClass}`}>
      {/* Placeholder shimmer */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-100 dark:bg-gray-700 animate-pulse" />
      )}

      {isInView && !hasError && (
        <img
          src={src}
          alt={alt}
          className={`transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          {...props}
        />
      )}

      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600 font-hand text-sm">
          加载失败
        </div>
      )}
    </div>
  );
});

LazyImage.displayName = 'LazyImage';

export default LazyImage;
