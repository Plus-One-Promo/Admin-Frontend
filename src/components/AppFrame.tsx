"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useAuth } from "@/lib/auth";

const PUBLIC_PATHS = ["/login"];

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated && !isPublic) {
      router.replace(`/login?next=${encodeURIComponent(pathname || "/")}`);
    }
    if (isAuthenticated && isPublic) {
      router.replace("/");
    }
  }, [loading, isAuthenticated, isPublic, pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Plus One Promo
          </p>
          <p className="mt-3 text-sm text-muted">Loading admin…</p>
        </div>
      </div>
    );
  }

  if (isPublic) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted">Redirecting to sign in…</p>
      </div>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
