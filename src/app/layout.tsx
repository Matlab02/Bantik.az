import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";

import "./globals.css";
import { StoreProvider } from "@/components/commerce/store-provider";
import { publicSiteUrl } from "@/lib/env";
import { safeJsonLd } from "@/lib/json-ld";

const sans = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});
const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
  variable: "--font-serif",
});

export const metadata: Metadata = {
  metadataBase: new URL(publicSiteUrl),
  title: {
    default: "BANTİK Beauty Shop — Gözəlliyin öz ritmi",
    template: "%s | BANTİK",
  },
  description:
    "Premium kosmetika, dəriyə qulluq və ətirlər. Məhsulu seçin, sifariş göndərin — BANTİK komandası sizinlə əlaqə saxlasın.",
  keywords: ["kosmetika", "ətir", "makiyaj", "Bakı", "BANTİK"],
  openGraph: {
    title: "BANTİK Beauty Shop",
    description: "Gözəlliyin öz ritmi var.",
    type: "website",
    locale: "az_AZ",
    siteName: "BANTİK Beauty Shop",
    url: publicSiteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "BANTİK Beauty Shop",
    description: "Gözəlliyin öz ritmi var.",
  },
  robots: { index: true, follow: true },
};

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "BANTİK Beauty Shop",
    url: publicSiteUrl,
    logo: `${publicSiteUrl}/brand/bantik-wordmark.png`,
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "BANTİK Beauty Shop",
    url: publicSiteUrl,
    inLanguage: "az-AZ",
  },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="az" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }}
        />
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
