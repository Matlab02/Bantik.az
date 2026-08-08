"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("ui_error", { digest: error.digest });
  }, [error.digest]);
  return (
    <main className="error-page">
      <span>BANTİK</span>
      <h1>Gözlənilməz xəta baş verdi</h1>
      <p>Məlumatlarınız təhlükəsizdir. Səhifəni yenidən yükləyə bilərsiniz.</p>
      <button onClick={reset}>Yenidən yoxla</button>
    </main>
  );
}
