import { useState, useCallback, memo, useRef, useEffect } from 'react';
import { Film } from 'lucide-react';

interface OptimizedImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackIcon?: React.ReactNode;
  aspectRatio?: string;
  priority?: boolean;
}

export const OptimizedImage = memo(({
  src,
  alt,
  className = '',
  fallbackIcon,
  aspectRatio,
  priority = false,
}: OptimizedImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleLoad = useCallback(() => setLoaded(true), []);
  const handleError = useCallback(() => setError(true), []);

  // Instantly resolve cached images to avoid flash of skeletons
  useEffect(() => {
    if (imgRef.current?.complete) {
      setLoaded(true);
    }
  }, [src]);

  if (!src || error) {
    return (
      <div
        className={`flex items-center justify-center bg-[var(--rf-glass-2)] ${className}`}
        style={aspectRatio ? { aspectRatio } : undefined}
      >
        {fallbackIcon || <Film size={24} className="text-[var(--rf-text-dim)]" />}
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {/* Shimmer placeholder */}
      {!loaded && (
        <div className="absolute inset-0 skeleton" />
      )}

      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        referrerPolicy="no-referrer"
        onLoad={handleLoad}
        onError={handleError}
        className={`w-full h-full object-cover transition-opacity ${
          priority ? 'duration-100' : 'duration-250'
        } ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';
