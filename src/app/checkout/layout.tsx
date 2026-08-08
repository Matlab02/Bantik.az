import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sifariş məlumatları",
  robots: { index: false, follow: false, noarchive: true },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
