import { SafeImage } from "./safe-image";

export function ResponsiveCmsImage({
  desktop,
  mobile,
  desktopFallback = "/campaigns/bantik-hero-v1.png",
  mobileFallback = desktopFallback,
  alt,
  priority = false,
}: {
  desktop: string;
  mobile: string;
  desktopFallback?: string;
  mobileFallback?: string;
  alt: string;
  priority?: boolean;
}) {
  return (
    <span className="cms-responsive-image">
      <SafeImage
        className="cms-image-desktop"
        src={desktop}
        fallbackSrc={desktopFallback}
        alt={alt}
        fill
        priority={priority}
        sizes="100vw"
      />
      <SafeImage
        className="cms-image-mobile"
        src={mobile}
        fallbackSrc={mobileFallback}
        alt={alt}
        fill
        priority={priority}
        sizes="100vw"
      />
    </span>
  );
}
