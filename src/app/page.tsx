"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  fetchCollections,
  fetchOrderRequests,
  fetchProducts,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Product = {
  id: string;
  name: string;
  brand?: string;
  published?: boolean;
  imageThumbUrl?: string;
  imageUrl?: string;
  updatedAt?: string;
  createdAt?: string;
  pricing?: { basePrice?: number };
};

type OrderRequest = {
  id: string;
  status?: string;
  createdAt?: string;
  productName?: string;
  itemCount?: number;
  contact?: { name?: string; email?: string; company?: string };
  customer?: { name?: string; email?: string; company?: string };
  items?: unknown[];
};

type Collection = {
  id: string;
  name: string;
  productIds?: string[];
};

function formatRelative(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function statusTone(status?: string) {
  switch (status) {
    case "new":
      return "bg-accent/25 text-foreground ring-accent/30";
    case "in_progress":
    case "reviewing":
      return "bg-sky-50 text-sky-800 ring-sky-100";
    case "quoted":
    case "completed":
      return "bg-emerald-50 text-emerald-800 ring-emerald-100";
    case "archived":
    case "cancelled":
      return "bg-[#f3f1ed] text-muted ring-border";
    default:
      return "bg-[#f3f1ed] text-muted ring-border";
  }
}

function statusLabel(status?: string) {
  if (!status) return "Unknown";
  return status.replace(/_/g, " ");
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [requests, setRequests] = useState<OrderRequest[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [homepageCollectionId, setHomepageId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchProducts(), fetchOrderRequests(), fetchCollections()])
      .then(([p, r, c]) => {
        if (cancelled) return;
        setProducts(p.products || []);
        setRequests(r.orderRequests || []);
        setCollections(c.collections || []);
        setHomepageId(c.homepageCollectionId || null);
        setError(null);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const published = products.filter((x) => x.published !== false).length;
    const drafts = products.length - published;
    const newRequests = requests.filter((x) => x.status === "new").length;
    return {
      products: products.length,
      published,
      drafts,
      collections: collections.length,
      requests: requests.length,
      newRequests,
    };
  }, [products, requests, collections]);

  const recentProducts = useMemo(() => {
    return [...products]
      .sort((a, b) => {
        const aT = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const bT = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return bT - aT;
      })
      .slice(0, 5);
  }, [products]);

  const recentRequests = useMemo(() => {
    return [...requests]
      .sort((a, b) => {
        const aT = new Date(a.createdAt || 0).getTime();
        const bT = new Date(b.createdAt || 0).getTime();
        return bT - aT;
      })
      .slice(0, 5);
  }, [requests]);

  const homepageCollection = collections.find(
    (c) => c.id === homepageCollectionId,
  );

  const firstName = user?.name?.trim().split(/\s+/)[0];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
            Plus One Promo
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {firstName ? `Welcome back, ${firstName}` : "Home"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {loading
              ? "Loading your store overview…"
              : "Here’s what’s happening across your catalog and order requests."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/products/new"
            className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-white transition hover:bg-foreground/90"
          >
            Add product
          </Link>
          <Link
            href="/order-requests"
            className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-surface"
          >
            View requests
          </Link>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Products",
            value: stats.products,
            detail: `${stats.published} published · ${stats.drafts} draft`,
            href: "/products",
          },
          {
            label: "Collections",
            value: stats.collections,
            detail: homepageCollection
              ? `Homepage: ${homepageCollection.name}`
              : "No homepage collection set",
            href: "/collections",
          },
          {
            label: "Order requests",
            value: stats.requests,
            detail:
              stats.newRequests > 0
                ? `${stats.newRequests} new to review`
                : "All caught up",
            href: "/order-requests",
            highlight: stats.newRequests > 0,
          },
          {
            label: "Drafts",
            value: stats.drafts,
            detail: "Products not yet published",
            href: "/products",
          },
        ].map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-2xl border border-border bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:border-accent"
          >
            <p className="text-sm font-medium text-muted">{card.label}</p>
            <p
              className={`mt-2 text-3xl font-semibold tracking-tight ${
                card.highlight ? "text-accent-dark" : "text-foreground"
              }`}
            >
              {loading ? "—" : card.value}
            </p>
            <p className="mt-1 truncate text-xs text-muted">{card.detail}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Recent products
                </h2>
                <p className="mt-0.5 text-xs text-muted">
                  Latest updates in your catalog
                </p>
              </div>
              <Link
                href="/products"
                className="text-sm font-semibold text-accent-dark hover:underline"
              >
                View all
              </Link>
            </div>
            <ul className="divide-y divide-border">
              {recentProducts.map((p) => {
                const thumb = p.imageThumbUrl || p.imageUrl;
                const published = p.published !== false;
                return (
                  <li key={p.id}>
                    <Link
                      href={`/products/${p.id}`}
                      className="flex items-center gap-3 px-5 py-3 transition hover:bg-[#faf9f7]"
                    >
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-border bg-[#faf9f7]">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumb}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {p.name}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {[p.brand, formatRelative(p.updatedAt || p.createdAt)]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
                          published
                            ? "bg-emerald-50 text-emerald-800 ring-emerald-100"
                            : "bg-[#f3f1ed] text-muted ring-border"
                        }`}
                      >
                        {published ? "Published" : "Draft"}
                      </span>
                    </Link>
                  </li>
                );
              })}
              {!loading && recentProducts.length === 0 && (
                <li className="px-5 py-10 text-center text-sm text-muted">
                  No products yet.{" "}
                  <Link
                    href="/products/new"
                    className="font-semibold text-accent-dark hover:underline"
                  >
                    Add your first product
                  </Link>
                </li>
              )}
              {loading && (
                <li className="px-5 py-10 text-center text-sm text-muted">
                  Loading products…
                </li>
              )}
            </ul>
          </section>

          <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Recent order requests
                </h2>
                <p className="mt-0.5 text-xs text-muted">
                  Incoming quotes from the storefront
                </p>
              </div>
              <Link
                href="/order-requests"
                className="text-sm font-semibold text-accent-dark hover:underline"
              >
                View all
              </Link>
            </div>
            <ul className="divide-y divide-border">
              {recentRequests.map((req) => {
                const contact = req.contact || req.customer || {};
                const title =
                  contact.name ||
                  contact.company ||
                  contact.email ||
                  req.productName ||
                  "Order request";
                const itemCount = Array.isArray(req.items)
                  ? req.items.length
                  : typeof req.itemCount === "number"
                    ? req.itemCount
                    : 0;
                return (
                  <li key={req.id}>
                    <Link
                      href="/order-requests"
                      className="flex items-center gap-3 px-5 py-3 transition hover:bg-[#faf9f7]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {title}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {[
                            contact.company && contact.name
                              ? contact.company
                              : contact.email,
                            itemCount
                              ? `${itemCount} item${itemCount === 1 ? "" : "s"}`
                              : null,
                            formatRelative(req.createdAt),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ring-1 ${statusTone(
                          req.status,
                        )}`}
                      >
                        {statusLabel(req.status)}
                      </span>
                    </Link>
                  </li>
                );
              })}
              {!loading && recentRequests.length === 0 && (
                <li className="px-5 py-10 text-center text-sm text-muted">
                  No order requests yet. They’ll show up here when customers
                  submit from the site.
                </li>
              )}
              {loading && (
                <li className="px-5 py-10 text-center text-sm text-muted">
                  Loading requests…
                </li>
              )}
            </ul>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold text-foreground">
                Quick actions
              </h2>
            </div>
            <div className="divide-y divide-border p-2">
              {[
                {
                  href: "/products/new",
                  title: "Add product",
                  detail: "Import from S&S or create manually",
                },
                {
                  href: "/collections",
                  title: "Manage collections",
                  detail: "Curate homepage & category pages",
                },
                {
                  href: "/settings/decoration",
                  title: "Decoration settings",
                  detail: "Methods and print locations",
                },
                {
                  href: "/settings/navigation",
                  title: "Apparel menu",
                  detail: "Storefront mega-menu links",
                },
                {
                  href: "/users",
                  title: "Invite teammate",
                  detail: "Give access to your team",
                },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-xl px-3 py-3 transition hover:bg-[#faf9f7]"
                >
                  <p className="text-sm font-semibold text-foreground">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">{item.detail}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold text-foreground">
                Storefront
              </h2>
            </div>
            <div className="space-y-3 px-5 py-4 text-sm">
              <div>
                <p className="text-xs font-medium text-muted">Homepage grid</p>
                <p className="mt-1 font-semibold text-foreground">
                  {homepageCollection?.name || "Featured products fallback"}
                </p>
              </div>
              <Link
                href="/collections"
                className="inline-flex text-sm font-semibold text-accent-dark hover:underline"
              >
                {homepageCollection
                  ? "Change homepage collection →"
                  : "Set a homepage collection →"}
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
