"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="az">
      <body>
        <main className="error-page">
          <h1>Sistem müvəqqəti əlçatan deyil</h1>
          <p>Bir qədər sonra yenidən yoxlayın.</p>
          <button onClick={reset}>Yenidən yoxla</button>
        </main>
      </body>
    </html>
  );
}
