"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

const fallback = "/brand/product-placeholder.svg";

export function SafeImage({ src: initialSrc, alt, ...props }: ImageProps) {
  const [src, setSrc] = useState(initialSrc || fallback);
  return <Image {...props} src={src} alt={alt} onError={() => setSrc(fallback)} />;
}
