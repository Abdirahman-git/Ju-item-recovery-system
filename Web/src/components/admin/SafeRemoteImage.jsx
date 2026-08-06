'use client';

import { useEffect, useRef } from 'react';

/**
 * Fast display for item photos via native <img>.
 * No opacity gate (that hid photos when onLoad missed / cache hit).
 */
export default function SafeRemoteImage({
  src,
  alt = '',
  fill = false,
  className = '',
  sizes,
  style,
  onError,
  onLoad,
  priority = false,
}) {
  const imgRef = useRef(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img || !src) return;
    // Cached images may already be complete before React attaches onLoad
    if (img.complete && img.naturalWidth > 0) {
      onLoad?.({ currentTarget: img });
    }
  }, [src, onLoad]);

  if (!src) return null;

  const imgClass = fill
    ? `absolute inset-0 h-full w-full ${className}`
    : className;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      className={imgClass}
      style={style}
      sizes={sizes}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      onError={onError}
      onLoad={onLoad}
      draggable={false}
    />
  );
}
