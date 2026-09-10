"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ssBrands, ssImport, ssSearch, ssStatus } from "@/lib/api";
import {
  settingsBtnPrimaryClass,
  settingsBtnSecondaryClass,
} from "@/components/settings/SettingsShell";

type Style = {
  styleID: number | string;
  title: string;
  brandName?: string;
  styleName?: string;
  partNumber?: string;
  imageUrl?: string;
  description?: string;
  baseCategory?: string;
};

type Brand = {
  brandID: number | string;
  name: string;
  image?: string;
};

const POPULAR_BRANDS = [
  "Comfort Colors",
  "Gildan",
  "Bella + Canvas",
  "Next Level",
  "Independent Trading Co.",
  "Port Authority",
  "Richardson",
  "Nike",
];

type Props = {
  onBack?: () => void;
};

export function SsImportPanel({ onBack }: Props) {
  const router = useRouter();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [q, setQ] = useState("");
  const [brand, setBrand] = useState("");
  const [brandQuery, setBrandQuery] = useState("");
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandsMeta, setBrandsMeta] = useState<{
    cached?: boolean;
    cachedAt?: string;
  } | null>(null);
  const [styles, setStyles] = useState<Style[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [importingId, setImportingId] = useState<string | number | null>(null);
  const [selected, setSelected] = useState<Style | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    ssStatus()
      .then(async (d) => {
        const ok = Boolean(d.configured);
        setConfigured(ok);
        if (ok) await loadBrands(false);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  async function loadBrands(refresh: boolean) {
    setBrandsLoading(true);
    try {
      const data = await ssBrands({ refresh });
      setBrands(data.brands || []);
      setBrandsMeta({
        cached: Boolean(data.cached),
        cachedAt: data.cachedAt,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load brands");
    } finally {
      setBrandsLoading(false);
    }
  }

  const filteredBrands = useMemo(() => {
    const needle = brandQuery.trim().toLowerCase();
    if (!needle) return brands;
    return brands.filter((b) => b.name.toLowerCase().includes(needle));
  }, [brands, brandQuery]);

  const popularAvailable = useMemo(() => {
    const names = new Set(brands.map((b) => b.name.toLowerCase()));
    return POPULAR_BRANDS.filter((name) => names.has(name.toLowerCase()))
      .concat(
        POPULAR_BRANDS.filter((name) =>
          brands.some((b) =>
            b.name.toLowerCase().includes(name.toLowerCase()),
          ),
        ).filter((name) => !names.has(name.toLowerCase())),
      )
      .filter((name, i, arr) => arr.indexOf(name) === i);
  }, [brands]);

  function resolvePopularBrand(label: string) {
    const exact = brands.find(
      (b) => b.name.toLowerCase() === label.toLowerCase(),
    );
    if (exact) return exact.name;
    const partial = brands.find((b) =>
      b.name.toLowerCase().includes(label.toLowerCase()),
    );
    return partial?.name || label;
  }

  async function runSearch(nextBrand = brand, nextQ = q) {
    if (!nextBrand && nextQ.trim().length < 2) {
      setError("Enter at least 2 characters, or pick a brand filter");
      return;
    }
    setBusy(true);
    setError(null);
    setSelected(null);
    setSearched(true);
    try {
      const data = await ssSearch(nextQ.trim(), nextBrand || undefined);
      setStyles(data.styles || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setStyles([]);
    } finally {
      setBusy(false);
    }
  }

  async function search(e: React.FormEvent) {
    e.preventDefault();
    await runSearch();
  }

  async function applyBrand(next: string) {
    setBrand(next);
    setBrandQuery("");
    if (!next && q.trim().length < 2) {
      setStyles([]);
      setSearched(false);
      setSelected(null);
      return;
    }
    await runSearch(next, q);
  }

  async function importStyle(styleId: string | number) {
    setImportingId(styleId);
    setError(null);
    try {
      const data = await ssImport(styleId);
      const product = data.product as { id?: string; name?: string } | undefined;
      if (product?.id) {
        router.push(`/products/${product.id}`);
        return;
      }
      setError("Import succeeded but product id was missing.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImportingId(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="text-xs font-medium text-muted transition hover:text-foreground"
            >
              ← Change source
            </button>
          ) : null}
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
            Import from S&amp;S Activewear
          </h2>
          <p className="mt-1 text-sm text-muted">
            Search by brand, style #, or part # — then import into your catalog.
          </p>
        </div>
        <Link
          href="/settings/suppliers"
          className="text-sm font-medium text-accent-dark hover:underline"
        >
          Manage S&amp;S credentials
        </Link>
      </div>

      {configured === false && (
        <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          S&amp;S is not connected yet.{" "}
          <Link
            href="/settings/suppliers"
            className="font-semibold underline"
          >
            Add your account number and API key in Settings
          </Link>
          , then come back here to search.
        </p>
      )}

      {configured && (
        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-muted">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-800 ring-1 ring-emerald-100">
            Connected
          </span>
          <span>
            {brandsLoading
              ? "Loading brands…"
              : `${brands.length} brands${
                  brandsMeta?.cached ? " (cached 1h)" : ""
                }`}
          </span>
          <button
            type="button"
            disabled={brandsLoading}
            onClick={() => void loadBrands(true)}
            className="font-medium text-accent-dark hover:underline disabled:opacity-50"
          >
            Refresh brands
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="border-b border-border px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">Brand filter</p>
            {brand && (
              <button
                type="button"
                onClick={() => void applyBrand("")}
                className="text-xs font-medium text-muted hover:underline"
              >
                Clear brand
              </button>
            )}
          </div>

          {popularAvailable.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {popularAvailable.map((name) => {
                const resolved = resolvePopularBrand(name);
                const active = brand === resolved;
                return (
                  <button
                    key={name}
                    type="button"
                    disabled={configured === false || busy}
                    onClick={() => void applyBrand(active ? "" : resolved)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                      active
                        ? "bg-foreground text-white"
                        : "border border-border bg-[#faf9f7] text-foreground hover:border-accent"
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-3 grid gap-3 md:grid-cols-[220px_1fr]">
            <label className="block text-sm font-medium text-foreground">
              Find brand
              <input
                value={brandQuery}
                onChange={(e) => setBrandQuery(e.target.value)}
                placeholder="Type to filter brands…"
                disabled={configured === false}
                className="mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/25 disabled:opacity-50"
              />
            </label>
            <label className="block text-sm font-medium text-foreground">
              Or choose from list
              <select
                value={brand}
                onChange={(e) => void applyBrand(e.target.value)}
                disabled={configured === false || brandsLoading}
                className="mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/25 disabled:opacity-50"
              >
                <option value="">All brands</option>
                {filteredBrands.map((b) => (
                  <option key={String(b.brandID)} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {brandQuery &&
            filteredBrands.length > 0 &&
            filteredBrands.length <= 12 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {filteredBrands.slice(0, 12).map((b) => (
                  <button
                    key={String(b.brandID)}
                    type="button"
                    onClick={() => void applyBrand(b.name)}
                    className={`rounded-md px-2 py-1 text-xs ${
                      brand === b.name
                        ? "bg-accent/30 font-medium"
                        : "bg-[#faf9f7] text-muted hover:text-foreground"
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            )}
        </div>

        <form
          onSubmit={search}
          className="flex flex-wrap gap-2 border-b border-border bg-[#faf9f7] px-5 py-3 sm:px-6"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={
              brand
                ? `Style # or part # within ${brand}…`
                : "Style #, part #, brand, or keywords…"
            }
            disabled={configured === false}
            className="min-w-[14rem] flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/25 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={busy || configured === false}
            className={settingsBtnPrimaryClass}
          >
            {busy ? "Searching…" : "Search"}
          </button>
        </form>

        {error && (
          <p className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700 sm:px-6">
            {error}
          </p>
        )}

        <div className="grid gap-0 lg:grid-cols-[1fr_18rem]">
          <ul className="divide-y divide-border">
            {styles.map((s) => {
              const isImporting = importingId === s.styleID;
              return (
                <li
                  key={String(s.styleID)}
                  className={`flex items-center gap-3 px-4 py-3 transition sm:px-5 ${
                    selected?.styleID === s.styleID
                      ? "bg-accent/10"
                      : "hover:bg-[#faf9f7]"
                  }`}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    onClick={() => setSelected(s)}
                  >
                    <div className="relative h-14 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-[#faf9f7]">
                      {s.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={s.imageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-muted">
                          No img
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {s.title}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {s.brandName} · Style {s.styleName}
                        {s.partNumber ? ` · Part ${s.partNumber}` : ""}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    disabled={busy || importingId != null}
                    onClick={() => void importStyle(s.styleID)}
                    className={settingsBtnSecondaryClass}
                  >
                    {isImporting ? "Importing…" : "Import"}
                  </button>
                </li>
              );
            })}
            {!busy && searched && styles.length === 0 && configured && (
              <li className="px-5 py-12 text-center text-sm text-muted">
                No styles found. Try a brand chip, a mill style # (like 1717),
                or a 5-digit part number.
              </li>
            )}
            {!busy && !searched && configured && (
              <li className="px-5 py-12 text-center text-sm text-muted">
                Pick a brand or search a part/style number to get started.
              </li>
            )}
            {busy && (
              <li className="px-5 py-12 text-center text-sm text-muted">
                Searching…
              </li>
            )}
          </ul>

          <aside className="border-t border-border bg-[#faf9f7] p-5 lg:border-l lg:border-t-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
              Preview
            </p>
            {selected ? (
              <div className="mt-4">
                <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-border bg-white">
                  {selected.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selected.imageUrl}
                      alt={selected.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted">
                      No image
                    </div>
                  )}
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">
                  {selected.title}
                </h3>
                <p className="mt-1 text-sm text-muted">
                  {selected.brandName} · Style {selected.styleName}
                  {selected.partNumber ? ` · Part ${selected.partNumber}` : ""}
                </p>
                {selected.baseCategory && (
                  <p className="mt-1 text-xs text-muted">
                    {selected.baseCategory}
                  </p>
                )}
                {selected.description && (
                  <p className="mt-3 text-sm leading-relaxed text-muted line-clamp-5">
                    {selected.description.replace(/<[^>]+>/g, " ")}
                  </p>
                )}
                <button
                  type="button"
                  disabled={busy || importingId != null}
                  onClick={() => void importStyle(selected.styleID)}
                  className={`mt-5 w-full ${settingsBtnPrimaryClass}`}
                >
                  {importingId === selected.styleID
                    ? "Importing…"
                    : "Import to catalog"}
                </button>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted">
                Select a style to preview details before importing.
              </p>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
