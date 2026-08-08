import Image from "next/image";

export function ResponsiveCmsImage({
  desktop,
  mobile,
  alt,
  priority = false,
}: {
  desktop: string;
  mobile: string;
  alt: string;
  priority?: boolean;
}) {
  return (
    <span className="cms-responsive-image">
      <Image
        className="cms-image-desktop"
        src={desktop}
        alt={alt}
        fill
        priority={priority}
        sizes="100vw"
      />
      <Image
        className="cms-image-mobile"
        src={mobile}
        alt={alt}
        fill
        priority={priority}
        sizes="100vw"
      />
    </span>
  );
}
