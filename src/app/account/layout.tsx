import type { Metadata } from "next";

import { AccountShell } from "@/components/account/account-shell";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";

export const metadata: Metadata = {
  title: "Hesabım",
  robots: { index: false, follow: false, noarchive: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <AccountShell>{children}</AccountShell>
      <MobileNav />
    </>
  );
}
