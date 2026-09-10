"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

const settingsNav = [
  {
    href: "/settings/pricing",
    label: "Pricing",
    description: "Default markup",
  },
  {
    href: "/settings/decoration",
    label: "Decoration",
    description: "Methods & locations",
  },
  {
    href: "/settings/navigation",
    label: "Apparel menu",
    description: "Storefront dropdown",
  },
  {
    href: "/settings/suppliers",
    label: "Suppliers",
    description: "S&S Activewear",
  },
  {
    href: "/settings/advanced",
    label: "Advanced",
    description: "API & connection",
  },
];

export function SettingsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted">
          Manage how Plus One Promo works for your team
          {user?.email ? (
            <>
              {" "}
              · <span className="font-medium text-foreground">{user.email}</span>
            </>
          ) : null}
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        {/* Secondary settings nav — Shopify-style */}
        <aside className="lg:w-56 lg:shrink-0">
          <nav className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {settingsNav.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`min-w-[9.5rem] rounded-xl px-3 py-2.5 transition lg:min-w-0 ${
                    active
                      ? "bg-white shadow-sm ring-1 ring-border"
                      : "hover:bg-white/70"
                  }`}
                >
                  <p
                    className={`text-sm font-semibold ${
                      active ? "text-foreground" : "text-muted"
                    }`}
                  >
                    {item.label}
                  </p>
                  <p className="mt-0.5 hidden text-xs text-muted lg:block">
                    {item.description}
                  </p>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

/** Shared Shopify-like settings card */
export function SettingsCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="border-b border-border px-5 py-4 sm:px-6">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>
      <div className="px-5 py-5 sm:px-6">{children}</div>
      {footer ? (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-[#faf9f7] px-5 py-3 sm:px-6">
          {footer}
        </div>
      ) : null}
    </section>
  );
}

export const settingsInputClass =
  "mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/25";

export const settingsLabelClass = "block text-sm font-medium text-foreground";

export const settingsBtnPrimaryClass =
  "rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-white transition hover:bg-foreground/90 disabled:opacity-50";

export const settingsBtnSecondaryClass =
  "rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface disabled:opacity-50";
