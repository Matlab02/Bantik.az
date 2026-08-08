import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronRight,
  Gift,
  Headphones,
  PackageCheck,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { ProductCard } from "@/components/commerce/product-card";
import { ResponsiveCmsImage } from "@/components/commerce/responsive-cms-image";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { brands, products } from "@/lib/catalog";
import { db } from "@/lib/db";
import { isScheduledActive } from "@/lib/management";

export const dynamic = "force-dynamic";

const categories = [
  { name: "Makiyaj", slug: "makiyaj", image: "/categories/makeup-v1.png" },
  { name: "Ətir", slug: "etir", image: "/categories/fragrance-v1.png" },
  { name: "Üz baxımı", slug: "uz-qullugu", image: "/categories/skincare-v1.png" },
  { name: "Saç", slug: "sac-baximi", image: "/categories/haircare-v1.png" },
  { name: "Bədən", slug: "beden-baximi", image: "/campaigns/bantik-skincare-v1.png" },
];

export default async function Home() {
  const [heroes, banners] = db
    ? await Promise.all([
        db.heroSlide.findMany({ orderBy: { sortOrder: "asc" } }),
        db.campaignBanner.findMany({
          where: { position: "HOME_CAMPAIGN" },
          orderBy: { sortOrder: "asc" },
        }),
      ])
    : [[], []];

  const hero = heroes.find((item) => isScheduledActive(item));
  const banner = banners.find((item) => isScheduledActive(item));

  return (
    <div className="reference-site">
      <Header />
      <main className="reference-home">
        <section className="ref-hero">
          <ResponsiveCmsImage
            desktop={hero?.desktopImage || "/campaigns/bantik-hero-v1.png"}
            mobile={hero?.mobileImage || "/campaigns/bantik-hero-mobile-v2.png"}
            desktopFallback="/campaigns/bantik-hero-v1.png"
            mobileFallback="/campaigns/bantik-hero-mobile-v2.png"
            alt={hero?.title || "BANTİK gözəllik kolleksiyası"}
            priority
          />
          <div className="ref-hero-shade" />
          <div className="ref-hero-copy">
            <span><Sparkles /> BANTİK BEAUTY</span>
            <h1>{hero?.title || "Sənin gözəlliyin. Sənin ifadən."}</h1>
            <p>
              {hero?.subtitle ||
                "Dünyaca məşhur brendlər, seçilmiş orijinal məhsullar."}
            </p>
            <Link href={hero?.ctaLink || "/products"}>
              {hero?.ctaText || "Kolleksiyanı kəşf et"}
              <ChevronRight />
            </Link>
          </div>
          <div className="ref-hero-rail">
            <Link href="/products?sort=new">
              <small>01 · YENİ</small>
              <b>Yeni gələnləri kəşf et</b>
              <ArrowUpRight />
            </Link>
            <Link href="/category/uz-qullugu">
              <small>02 · RİTUAL</small>
              <b>Dəriyə qulluq seçimi</b>
              <ArrowUpRight />
            </Link>
            <Link href="/category/etir">
              <small>03 · İMZA</small>
              <b>İkonik ətirlər</b>
              <ArrowUpRight />
            </Link>
          </div>
          <div className="ref-hero-count"><b>01</b><i /><span>03</span></div>
        </section>

        <section className="ref-trust" aria-label="BANTİK üstünlükləri">
          <div>
            <PackageCheck />
            <span><b>Pulsuz çatdırılma</b><small>100 AZN və üzəri</small></span>
          </div>
          <div>
            <ShieldCheck />
            <span><b>Orijinal məhsullar</b><small>100% zəmanət</small></span>
          </div>
          <div>
            <Gift />
            <span><b>Rəsmi təchizatçı</b><small>Dünya brendləri</small></span>
          </div>
          <div>
            <Headphones />
            <span><b>Müştəri dəstəyi</b><small>+994 50 123 45 67</small></span>
          </div>
        </section>

        <div className="ref-luxury-ticker" aria-hidden="true">
          <div>
            {[0, 1].map((group) => (
              <span key={group}>
                NEW BEAUTY <i>✦</i> ICONIC BRANDS <i>✦</i> BANTİK EDIT <i>✦</i>
                SKINCARE RITUALS <i>✦</i> YOUR BEAUTY, YOUR EXPRESSION <i>✦</i>
              </span>
            ))}
          </div>
        </div>

        <section className="ref-section ref-categories container">
          <div className="ref-section-head">
            <div className="ref-title">
              <span>GÖZƏLLİK DÜNYANI SEÇ</span>
              <h2>Kateqoriyalar</h2>
              <p>Gündəlik ritualından xüsusi gecələrə qədər hər toxunuş sənin üçün seçilib.</p>
            </div>
            <Link href="/products">Hamısını gör <ChevronRight /></Link>
          </div>
          <div className="ref-category-grid">
            {categories.map((category) => (
              <Link href={`/category/${category.slug}`} key={category.slug}>
                <span>
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    sizes="(max-width: 800px) 84px, 220px"
                  />
                </span>
                <b>{category.name}</b>
              </Link>
            ))}
          </div>
        </section>

        <section className="ref-editorial-modern container" aria-label="BANTİK seçimi">
          <Link className="ref-editorial-large" href="/category/uz-qullugu">
            <Image
              src="/campaigns/bantik-skincare-v1.png"
              alt="BANTİK dəriyə qulluq seçimi"
              fill
              sizes="760px"
            />
            <div>
              <small>BANTİK BEAUTY EDIT</small>
              <h2>Dərinin sevəcəyi<br />qulluq ritualı</h2>
              <span>Kolleksiyanı kəşf et <ArrowUpRight /></span>
            </div>
          </Link>
          <Link className="ref-editorial-small warm" href="/category/makiyaj">
            <Image
              src="/categories/makeup-v1.png"
              alt="Yeni makiyaj kolleksiyası"
              fill
              sizes="380px"
            />
            <div><small>YENİ MAKİYAJ</small><b>İfadəni rənglə</b><ArrowUpRight /></div>
          </Link>
          <Link className="ref-editorial-small dark" href="/category/etir">
            <Image
              src="/categories/fragrance-v1.png"
              alt="İkonik ətir kolleksiyası"
              fill
              sizes="380px"
            />
            <div><small>İKONİK ƏTİRLƏR</small><b>İmzanı seç</b><ArrowUpRight /></div>
          </Link>
        </section>

        <section className="ref-section ref-products container">
          <div className="ref-section-head">
            <div className="ref-title">
              <span>YENİLİKLƏR</span>
              <h2>Yeni gələnlər</h2>
              <p>İlk baxışdan seviləcək yeni formulalar və trend məhsullar.</p>
            </div>
            <Link href="/products?sort=new">Hamısını gör <ChevronRight /></Link>
          </div>
          <div className="ref-product-showcase">
            <div className="ref-product-toolbar">
              <div className="ref-product-tabs" aria-label="Məhsul kateqoriyaları">
                <Link className="active" href="/products">Bütün məhsullar</Link>
                <Link href="/category/makiyaj">Makiyaj</Link>
                <Link href="/category/uz-qullugu">Üz baxımı</Link>
                <Link href="/category/etir">Ətir</Link>
                <Link href="/category/sac-baximi">Saç baxımı</Link>
              </div>
              <div className="ref-product-arrows" aria-hidden="true">
                <button type="button" tabIndex={-1}><ArrowLeft /></button>
                <button type="button" tabIndex={-1}><ChevronRight /></button>
              </div>
            </div>
            <div className="ref-product-grid">
              {products.slice(0, 6).map((product) => (
                <ProductCard product={product} key={product.id} />
              ))}
            </div>
            <div className="ref-product-progress">
              <span><b>01</b> / 04</span>
              <i><b /></i>
              <Link href="/products">Bütün kolleksiya <ArrowUpRight /></Link>
            </div>
          </div>
        </section>

        <section className="ref-fragrance container">
          <Link href={banner?.link || "/category/etir"}>
            <ResponsiveCmsImage
              desktop={banner?.desktopImage || "/campaigns/bantik-fragrance-v1.png"}
              mobile={banner?.mobileImage || "/campaigns/bantik-fragrance-v1.png"}
              desktopFallback="/campaigns/bantik-fragrance-v1.png"
              mobileFallback="/campaigns/bantik-fragrance-v1.png"
              alt={banner?.title || "Yeni ətir kolleksiyası"}
            />
            <div>
              <small>YENİ ƏTİR KOLLEKSİYASI</small>
              <h2>{banner?.title || "İmzanı burax, xatirəni yaşa."}</h2>
              <b>{banner?.ctaText || "Ətirləri kəşf et"} <ChevronRight /></b>
            </div>
          </Link>
        </section>

        <section className="ref-brands container">
          <div className="ref-section-head">
            <div className="ref-title">
              <span>DÜNYA BRENDLƏRİ</span>
              <h2>Seçilmiş brendlər</h2>
            </div>
            <Link href="/products">Hamısını gör <ChevronRight /></Link>
          </div>
          <div className="ref-brand-window">
            <div className="ref-brand-track">
              {[...brands, ...brands].map((brand, index) => (
                <Link
                  href={`/brand/${brand.slug}`}
                  key={`${brand.slug}-${index}`}
                  tabIndex={index >= brands.length ? -1 : 0}
                >
                  {brand.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="ref-footer">
        <Image src="/brand/bantik-wordmark.png" alt="BANTİK" width={132} height={58} />
        <p>Gözəlliyin öz ritmi var.</p>
        <small>© 2026 BANTİK Beauty Shop</small>
      </footer>
      <MobileNav />
    </div>
  );
}
