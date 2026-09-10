"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

const links = [
  { href: "/", label: "Dashboard", match: "exact" as const },
  { href: "/products", label: "Products", match: "products" as const },
  { href: "/collections", label: "Collections", match: "prefix" as const },
  { href: "/products/new", label: "Add product", match: "exact" as const },
  { href: "/order-requests", label: "Order requests", match: "prefix" as const },
  { href: "/users", label: "Team", match: "prefix" as const },
  { href: "/settings", label: "Settings", match: "prefix" as const },
];

function isActive(pathname: string, link: (typeof links)[number]) {
  if (link.match === "exact") return pathname === link.href;
  if (link.match === "products") {
    return (
      pathname === "/products" ||
      (pathname.startsWith("/products/") &&
        !pathname.startsWith("/products/new"))
    );
  }
  return pathname === link.href || pathname.startsWith(`${link.href}/`);
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-surface">
        <div className="border-b border-border px-4 py-5">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/brand/logo-mark-gold.png"
              alt=""
              width={36}
              height={48}
              className="h-9 w-auto"
              unoptimized
            />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
                Plus One Promo
              </p>
              <p className="text-sm font-semibold text-foreground">Admin</p>
            </div>
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-2">
          {links.map((link) => {
            const active = isActive(pathname, link);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-accent/20 text-foreground"
                    : "text-muted hover:bg-background hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-4">
          <p className="truncate text-sm font-medium text-foreground">
            {user?.name || "Admin"}
          </p>
          <p className="truncate text-xs text-muted">{user?.email}</p>
          <button
            type="button"
            onClick={() => void logout().then(() => (window.location.href = "/login"))}
            className="mt-3 text-xs font-medium text-accent-dark hover:underline"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6 md:p-8">{children}</main>
    </div>
  );
}
