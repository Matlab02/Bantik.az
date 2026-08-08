export function CatalogSkeleton({ title }: { title: string }) {
  return (
    <main className="catalog-page gratis-catalog catalog-skeleton container" aria-busy="true">
      <div className="breadcrumbs">Ana səhifə / {title}</div>
      <section className="catalog-hero gratis-catalog-hero">
        <div><span>BANTİK KATALOQU</span><h1>{title}</h1><p>Məhsullar hazırlanır…</p></div>
      </section>
      <div className="skeleton-category-row">
        {Array.from({ length: 7 }, (_, index) => <i key={index} />)}
      </div>
      <div className="skeleton-toolbar" />
      <div className="skeleton-catalog-layout">
        <aside />
        <section>
          {Array.from({ length: 8 }, (_, index) => (
            <article key={index}><i /><b /><span /><small /></article>
          ))}
        </section>
      </div>
    </main>
  );
}
