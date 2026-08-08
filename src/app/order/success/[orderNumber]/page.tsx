import Link from "next/link";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { db } from "@/lib/db";
import { resolveWhatsappNumber } from "@/lib/settings";

export const dynamic = "force-dynamic";
export default async function Success({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params,
    settings = await db?.siteSetting.findUnique({
      where: { id: "default" },
      select: { whatsapp: true },
    }),
    phone = resolveWhatsappNumber(settings?.whatsapp),
    message = encodeURIComponent(
      `Salam, ${orderNumber} nömrəli sifarişimlə bağlı məlumat almaq istəyirəm.`,
    );
  return (
    <>
      <Header />
      <main className="order-success container">
        <CheckCircle2 />
        <span>SİFARİŞ QƏBUL EDİLDİ</span>
        <h1>Sifarişiniz qəbul edildi</h1>
        <p>Sifariş nömrəsi</p>
        <strong>{orderNumber}</strong>
        <p>Müştəri ilə tezliklə əlaqə saxlanılacaq.</p>
        <div>
          <Link href={`/order/track?number=${orderNumber}`}>Sifarişi izlə</Link>
          <a
            href={
              phone
                ? `https://wa.me/${phone}?text=${message}`
                : `https://wa.me/?text=${message}`
            }
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle /> WhatsApp ilə əlaqə
          </a>
        </div>
      </main>
      <MobileNav />
    </>
  );
}
