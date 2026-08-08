import { Suspense } from "react";
import { ExecutiveDashboard } from "@/components/admin/executive-dashboard";

export default function Page() {
  return (
    <Suspense fallback={<p>Dashboard yüklənir…</p>}>
      <ExecutiveDashboard />
    </Suspense>
  );
}
