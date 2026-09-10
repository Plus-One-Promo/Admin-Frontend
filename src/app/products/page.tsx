"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { deleteProduct, fetchProducts, updateProduct } from "@/lib/api";

type Product = {
  id: string;
  name: string;
  slug: string;
  brand?: string;
  source?: string;
  published?: boolean;
  featured?: boolean;
  imageUrl?: string;
  imageThumbUrl?: string;
  pricing?: { basePrice?: number; displayMode?: string };
};

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M7.5 3.5h5M4 5.5h12M15.5 5.5l-.7 9.1a1.5 1.5 0 0 1-1.5 1.4H6.7a1.5 1.5 0 0 1-1.5-1.4L4.5 5.5M8.5 8.5v5M11.5 8.5v5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchProducts();
      setProducts(data.products || []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      const hay = [p.name, p.brand, p.slug, p.source]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [products, query]);

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((p) => selected.has(p.id));
  const someVisibleSelected = filtered.some((p) => selected.has(p.id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filtered.forEach((p) => next.delete(p.id));
      } else {
        filtered.forEach((p) => next.add(p.id));
      }
      return next;
    });
  }

  async function removeOne(id: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    if (!confirm("Delete this product?")) return;
    try {
      await deleteProduct(id);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  async function runBulk(
    action: "publish" | "draft" | "delete",
  ) {
    const ids = [...selected];
    if (ids.length === 0) return;

    if (action === "delete") {
      if (
        !confirm(
          `Delete ${ids.length} product${ids.length === 1 ? "" : "s"}? This cannot be undone.`,
        )
      ) {
        return;
      }
    }

    setBulkBusy(true);
    setError(null);
    try {
      if (action === "delete") {
        await Promise.all(ids.map((id) => deleteProduct(id)));
      } else {
        const published = action === "publish";
        await Promise.all(
          ids.map((id) => updateProduct(id, { published })),
        );
      }
      setSelected(new Set());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk action failed");
    } finally {
      setBulkBusy(false);
    }
  }

  function openProduct(id: string) {
    router.push(`/products/${id}`);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Products
          </h1>
          <p className="mt-1 text-sm text-muted">
            {loading
              ? "Loading catalog…"
              : `${products.length} product${products.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <Link
          href="/products/new"
          className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-white transition hover:bg-foreground/90"
        >
          Add product
        </Link>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 sm:px-5">
          <label className="relative min-w-[14rem] flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
              <svg
                viewBox="0 0 20 20"
                className="h-4 w-4"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  cx="9"
                  cy="9"
                  r="5.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M13.5 13.5 17 17"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products"
              className="w-full rounded-lg border border-border bg-[#faf9f7] py-2 pl-9 pr-3 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/25"
            />
          </label>
        </div>

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-[#faf9f7] px-4 py-2.5 sm:px-5">
            <span className="mr-1 text-sm font-medium text-foreground">
              {selected.size} selected
            </span>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => void runBulk("publish")}
              className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-surface disabled:opacity-50"
            >
              Set as published
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => void runBulk("draft")}
              className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-surface disabled:opacity-50"
            >
              Set as draft
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => void runBulk("delete")}
              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
            >
              Delete
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => setSelected(new Set())}
              className="ml-auto text-xs font-medium text-muted hover:text-foreground"
            >
              Clear
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-semibold uppercase tracking-wide text-muted">
                <th className="w-12 px-4 py-3 sm:px-5">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    ref={(el) => {
                      if (el) {
                        el.indeterminate =
                          someVisibleSelected && !allVisibleSelected;
                      }
                    }}
                    onChange={toggleAllVisible}
                    aria-label="Select all products"
                    className="h-4 w-4 rounded border-border accent-[var(--brand-gold)]"
                  />
                </th>
                <th className="px-2 py-3 font-semibold normal-case tracking-normal">
                  Product
                </th>
                <th className="hidden px-4 py-3 font-semibold normal-case tracking-normal sm:table-cell">
                  Source
                </th>
                <th className="px-4 py-3 font-semibold normal-case tracking-normal">
                  Price
                </th>
                <th className="px-4 py-3 font-semibold normal-case tracking-normal">
                  Status
                </th>
                <th className="w-12 px-4 py-3 sm:px-5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const thumb = p.imageThumbUrl || p.imageUrl;
                const isSelected = selected.has(p.id);
                const isPublished = p.published !== false;
                return (
                  <tr
                    key={p.id}
                    onClick={() => openProduct(p.id)}
                    className={`cursor-pointer border-b border-border last:border-0 transition ${
                      isSelected
                        ? "bg-accent/10"
                        : "hover:bg-[#faf9f7]"
                    }`}
                  >
                    <td
                      className="px-4 py-3 sm:px-5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(p.id)}
                        aria-label={`Select ${p.name}`}
                        className="h-4 w-4 rounded border-border accent-[var(--brand-gold)]"
                      />
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-border bg-[#faf9f7]">
                          {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={thumb}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Image
                                src="/brand/logo-mark-gold.png"
                                alt=""
                                width={20}
                                height={26}
                                className="h-5 w-auto opacity-40"
                                unoptimized
                              />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">
                            {p.name}
                          </p>
                          <p className="truncate text-xs text-muted">
                            {[p.brand, p.slug ? `/${p.slug}` : null]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 capitalize text-muted sm:table-cell">
                      {p.source || "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-foreground">
                      {p.pricing?.basePrice != null
                        ? `$${Number(p.pricing.basePrice).toFixed(2)}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                          isPublished
                            ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100"
                            : "bg-[#f3f1ed] text-muted ring-1 ring-border"
                        }`}
                      >
                        {isPublished ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 text-right sm:px-5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={(e) => void removeOne(p.id, e)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-red-50 hover:text-red-700"
                        aria-label={`Delete ${p.name}`}
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-sm text-muted"
                  >
                    {products.length === 0
                      ? "No products yet. Add one manually or import from S&S."
                      : "No products match your search."}
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-sm text-muted"
                  >
                    Loading…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
