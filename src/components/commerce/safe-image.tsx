"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

const fallback = "/brand/product-placeholder.svg";

type SafeImageProps = ImageProps & {
  fallbackSrc?: ImageProps["src"];
};

export function SafeImage({
  src: initialSrc,
  fallbackSrc = fallback,
  alt,
  ...props
}: SafeImageProps) {
  const [failedSrc, setFailedSrc] = useState<ImageProps["src"] | null>(null);
  const src = failedSrc === initialSrc ? fallbackSrc : initialSrc || fallbackSrc;

  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      onError={() => {
        if (src !== fallbackSrc) setFailedSrc(initialSrc);
      }}
    />
  );
}
