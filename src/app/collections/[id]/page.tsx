"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchCollection,
  fetchCollections,
  fetchProducts,
  setHomepageCollection,
  updateCollection,
} from "@/lib/api";
import { SortableCollectionProducts } from "@/components/collections/SortableCollectionProducts";
import {
  SettingsCard,
  settingsBtnPrimaryClass,
  settingsBtnSecondaryClass,
  settingsInputClass,
  settingsLabelClass,
} from "@/components/settings/SettingsShell";

type Product = {
  id: string;
  name: string;
  slug: string;
  brand?: string;
  published?: boolean;
  imageThumbUrl?: string;
  imageUrl?: string;
};

type Collection = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  pageDescription?: string;
  productIds?: string[];
  productsPerRow?: number;
  rows?: number;
};

export default function EditCollectionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [collection, setCollection] = useState<Collection | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [pageDescription, setPageDescription] = useState("");
  const [productIds, setProductIds] = useState<string[]>([]);
  const [productsPerRow, setProductsPerRow] = useState(4);
  const [rows, setRows] = useState(2);
  const [homepageCollectionId, setHomepageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [productSearch, setProductSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [colData, prodData, all] = await Promise.all([
          fetchCollection(id),
          fetchProducts(),
          fetchCollections(),
        ]);
        if (cancelled) return;
        const c = colData.collection as Collection;
        setCollection(c);
        setName(c.name || "");
        setSlug(c.slug || "");
        setDescription(c.description || "");
        setPageDescription(c.pageDescription || "");
        setProductIds(c.productIds || []);
        setProductsPerRow(c.productsPerRow || 4);
        setRows(c.rows || 2);
        setProducts(prodData.products || []);
        setHomepageId(all.homepageCollectionId || null);
        setError(null);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!searchWrapRef.current?.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const selectedSet = useMemo(() => new Set(productIds), [productIds]);

  const productById = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  const orderedSelected = useMemo(
    () =>
      productIds
        .map((pid) => productById.get(pid))
        .filter(Boolean) as Product[],
    [productIds, productById],
  );

  const searchResults = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => !selectedSet.has(p.id))
      .filter((p) => {
        const hay = [p.name, p.brand, p.slug]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 8);
  }, [productSearch, products, selectedSet]);

  function addProduct(productId: string) {
    setProductIds((prev) =>
      prev.includes(productId) ? prev : [...prev, productId],
    );
    setProductSearch("");
    setSearchOpen(false);
  }

  function removeProduct(productId: string) {
    setProductIds((prev) => prev.filter((x) => x !== productId));
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateCollection(id, {
        name,
        slug,
        description,
        pageDescription,
        productIds,
        productsPerRow,
        rows,
      });
      router.push("/collections");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setSaving(false);
    }
  }

  async function toggleHomepage() {
    try {
      if (homepageCollectionId === id) {
        await setHomepageCollection(null);
        setHomepageId(null);
      } else {
        await setHomepageCollection(id);
        setHomepageId(id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update homepage");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl">
        <p className="text-sm text-muted">Loading collection…</p>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="mx-auto max-w-6xl">
        <p className="text-sm text-red-600">{error || "Collection not found"}</p>
        <Link
          href="/collections"
          className="mt-3 inline-block text-sm text-muted hover:underline"
        >
          ← Back to collections
        </Link>
      </div>
    );
  }

  const isHomepage = homepageCollectionId === id;

  return (
    <div className="mx-auto max-w-6xl">
      <form onSubmit={onSave}>
        <div className="sticky top-0 z-10 -mx-6 mb-6 border-b border-border bg-background/95 px-6 py-4 backdrop-blur md:-mx-8 md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <Link
                href="/collections"
                className="text-xs font-medium text-muted transition hover:text-foreground"
              >
                ← Collections
              </Link>
              <h1 className="mt-1 truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                {name || "Untitled collection"}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => router.push("/collections")}
                className={settingsBtnSecondaryClass}
              >
                Discard
              </button>
              <button
                type="submit"
                disabled={saving}
                className={settingsBtnPrimaryClass}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <p className="mb-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="space-y-5">
            <SettingsCard title="Title">
              <div className="space-y-4">
                <label className={settingsLabelClass}>
                  Name
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={settingsInputClass}
                  />
                </label>
                <label className={settingsLabelClass}>
                  Description
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    placeholder="Short note for internal use or mega-menu context"
                    className={`${settingsInputClass} resize-y`}
                  />
                </label>
                <label className={settingsLabelClass}>
                  Catalog page intro
                  <textarea
                    value={pageDescription}
                    onChange={(e) => setPageDescription(e.target.value)}
                    rows={3}
                    placeholder="Shown on /collections/your-slug"
                    className={`${settingsInputClass} resize-y`}
                  />
                </label>
              </div>
            </SettingsCard>

            <SettingsCard
              title={`Products (${orderedSelected.length})`}
              description="Search to add products, then drag the handle to reorder."
            >
              <div ref={searchWrapRef} className="relative">
                <label className="relative block">
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
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setSearchOpen(true);
                    }}
                    onFocus={() => setSearchOpen(true)}
                    placeholder="Search products to add"
                    className="w-full rounded-lg border border-border bg-[#faf9f7] py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/25"
                  />
                </label>

                {searchOpen && productSearch.trim() && (
                  <div className="absolute z-20 mt-1.5 max-h-72 w-full overflow-auto rounded-xl border border-border bg-white shadow-lg">
                    {searchResults.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-muted">
                        No matching products to add.
                      </p>
                    ) : (
                      <ul>
                        {searchResults.map((p) => {
                          const thumb = p.imageThumbUrl || p.imageUrl;
                          return (
                            <li key={p.id}>
                              <button
                                type="button"
                                onClick={() => addProduct(p.id)}
                                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-[#faf9f7]"
                              >
                                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border bg-[#faf9f7]">
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
                                    {[p.brand, p.published === false ? "Draft" : "Published"]
                                      .filter(Boolean)
                                      .join(" · ")}
                                  </p>
                                </div>
                                <span className="text-xs font-semibold text-accent-dark">
                                  Add
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4">
                <SortableCollectionProducts
                  products={orderedSelected}
                  onReorder={setProductIds}
                  onRemove={removeProduct}
                />
              </div>
            </SettingsCard>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <SettingsCard title="Homepage">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Featured on site
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    {isHomepage
                      ? "This collection powers the homepage product grid."
                      : "Set this as the homepage featured collection."}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isHomepage}
                  onClick={() => void toggleHomepage()}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                    isHomepage ? "bg-accent" : "bg-border"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                      isHomepage ? "translate-x-5" : ""
                    }`}
                  />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className={settingsLabelClass}>
                  Per row
                  <select
                    value={productsPerRow}
                    onChange={(e) => setProductsPerRow(Number(e.target.value))}
                    className={settingsInputClass}
                  >
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                  </select>
                </label>
                <label className={settingsLabelClass}>
                  Rows
                  <select
                    value={rows}
                    onChange={(e) => setRows(Number(e.target.value))}
                    className={settingsInputClass}
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                  </select>
                </label>
              </div>
              <p className="mt-2 text-xs text-muted">
                Shows up to {productsPerRow * rows} products ({productsPerRow} ×{" "}
                {rows}).
              </p>
            </SettingsCard>

            <SettingsCard title="Organization">
              <label className={settingsLabelClass}>
                URL slug
                <input
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className={settingsInputClass}
                />
              </label>
              <p className="mt-2 text-xs text-muted">
                Live at{" "}
                <span className="font-medium text-foreground">
                  /collections/{slug || "…"}
                </span>
              </p>
            </SettingsCard>
          </aside>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-border pt-5">
          <button
            type="button"
            onClick={() => router.push("/collections")}
            className={settingsBtnSecondaryClass}
          >
            Discard
          </button>
          <button
            type="submit"
            disabled={saving}
            className={settingsBtnPrimaryClass}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
