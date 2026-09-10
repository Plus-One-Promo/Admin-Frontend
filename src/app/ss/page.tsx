"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy S&S route — add product now owns this flow. */
export default function SsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/products/new?source=ss");
  }, [router]);

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-sm text-muted">Redirecting to Add product…</p>
    </div>
  );
}
