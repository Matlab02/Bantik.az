"use client";

export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <div className="admin-state" role="alert">
      <h2>Admin məlumatı yüklənmədi</h2>
      <p>Əməliyyatı təkrar yoxlayın və ya yenidən daxil olun.</p>
      <button onClick={reset}>Yenidən yoxla</button>
    </div>
  );
}
