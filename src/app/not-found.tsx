import Link from "next/link";

export default function NotFound() {
  return (
    <main className="error-page">
      <span>404</span>
      <h1>Səhifə tapılmadı</h1>
      <p>Axtardığınız səhifə silinmiş və ya köçürülmüş ola bilər.</p>
      <Link href="/">Ana səhifəyə qayıt</Link>
    </main>
  );
}
