"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { createProduct, fetchSiteSettings } from "@/lib/api";
import { SsImportPanel } from "@/components/products/SsImportPanel";
import { TagInput } from "@/components/settings/TagInput";
import {
  SettingsCard,
  settingsBtnPrimaryClass,
  settingsBtnSecondaryClass,
  settingsInputClass,
  settingsLabelClass,
} from "@/components/settings/SettingsShell";

type Source = "ss" | "manual" | null;

type CatalogMethod = {
  id: string;
  label: string;
  locations: string[];
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function NewProductContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = searchParams.get("source");
  const [source, setSource] = useState<Source>(
    initial === "ss" || initial === "manual" ? initial : null,
  );

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [catalogMethods, setCatalogMethods] = useState<CatalogMethod[]>([]);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("Apparel");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState("10");
  const [priceNote, setPriceNote] = useState(
    "Starting estimate — final quote after review",
  );
  const [colors, setColors] = useState<string[]>(["White", "Black", "Navy"]);
  const [sizes, setSizes] = useState<string[]>(["S", "M", "L", "XL", "2XL"]);
  const [decorationOptions, setDecorationOptions] = useState<string[]>([]);
  const [published, setPublished] = useState(true);
  const [featured, setFeatured] = useState(false);

  useEffect(() => {
    if (source !== "manual") return;
    fetchSiteSettings()
      .then((data) => {
        const methods: CatalogMethod[] = (
          data.settings?.decorationMethods || []
        ).map(
          (m: { id?: string; label?: string; locations?: string[] }) => ({
            id: m.id || "",
            label: m.label || m.id || "",
            locations: Array.isArray(m.locations) ? m.locations : [],
          }),
        );
        const valid = methods.filter((m) => m.id);
        setCatalogMethods(valid);
        setDecorationOptions((prev) => {
          if (prev.length) return prev;
          const defaults = valid
            .filter((m) => m.id === "screenprint" || m.id === "embroidery")
            .map((m) => m.id);
          return defaults.length ? defaults : valid.slice(0, 2).map((m) => m.id);
        });
      })
      .catch(() => {
        /* optional */
      });
  }, [source]);

  function chooseSource(next: Source) {
    setSource(next);
    setError(null);
    const url =
      next == null
        ? "/products/new"
        : `/products/new?source=${next}`;
    router.replace(url);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const finalSlug = slug.trim() || slugify(name);
      const decorationLocations = Object.fromEntries(
        decorationOptions.map((id) => {
          const method = catalogMethods.find((m) => m.id === id);
          return [id, method?.locations ? [...method.locations] : []];
        }),
      );

      const created = await createProduct({
        name: name.trim(),
        slug: finalSlug,
        brand: brand.trim(),
        category: category.trim() || "Apparel",
        description,
        source: "manual",
        published,
        featured,
        colors: colors.filter(Boolean).map((c) => ({ name: c })),
        sizes: sizes.filter(Boolean),
        decorationOptions,
        decorationLocations,
        pricing: {
          displayMode: "from",
          currency: "USD",
          basePrice: Number(basePrice) || 0,
          priceNote,
        },
      });
      router.push(`/products/${created.product.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setSaving(false);
    }
  }

  if (source === null) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <Link
            href="/products"
            className="text-xs font-medium text-muted transition hover:text-foreground"
          >
            ← Products
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Add product
          </h1>
          <p className="mt-1 text-sm text-muted">
            Where is this product coming from?
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => chooseSource("ss")}
            className="group rounded-2xl border border-border bg-white p-6 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:border-accent hover:shadow-md"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/20 text-accent-dark">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path
                  d="M4 7h16M4 12h10M4 17h14"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <p className="mt-4 text-lg font-semibold text-foreground">
              S&amp;S Activewear
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              Search the supplier catalog and import a style with colors,
              sizes, and pricing.
            </p>
            <p className="mt-4 text-sm font-semibold text-accent-dark group-hover:underline">
              Continue →
            </p>
          </button>

          <button
            type="button"
            onClick={() => chooseSource("manual")}
            className="group rounded-2xl border border-border bg-white p-6 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:border-accent hover:shadow-md"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f3f1ed] text-foreground">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path
                  d="M12 5v14M5 12h14"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <p className="mt-4 text-lg font-semibold text-foreground">
              Create manually
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              Enter product details yourself — title, media later, colors,
              sizes, pricing, and decoration.
            </p>
            <p className="mt-4 text-sm font-semibold text-accent-dark group-hover:underline">
              Continue →
            </p>
          </button>
        </div>
      </div>
    );
  }

  if (source === "ss") {
    return (
      <div className="mx-auto max-w-6xl">
        <SsImportPanel onBack={() => chooseSource(null)} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <form onSubmit={onSubmit}>
        <div className="sticky top-0 z-10 -mx-6 mb-6 border-b border-border bg-background/95 px-6 py-4 backdrop-blur md:-mx-8 md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => chooseSource(null)}
                className="text-xs font-medium text-muted transition hover:text-foreground"
              >
                ← Change source
              </button>
              <h1 className="mt-1 truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                {name.trim() || "New product"}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => router.push("/products")}
                className={settingsBtnSecondaryClass}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className={settingsBtnPrimaryClass}
              >
                {saving ? "Creating…" : "Save"}
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
                    onChange={(e) => {
                      const next = e.target.value;
                      setName(next);
                      if (!slugTouched) setSlug(slugify(next));
                    }}
                    placeholder="e.g. Comfort Colors Tee"
                    className={settingsInputClass}
                  />
                </label>
                <label className={settingsLabelClass}>
                  Description
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Shown on the product page"
                    className={`${settingsInputClass} resize-y`}
                  />
                </label>
              </div>
            </SettingsCard>

            <SettingsCard
              title="Colors & sizes"
              description="Add options customers can choose on the storefront. You can refine these after saving."
            >
              <div className="space-y-4">
                <div>
                  <p className={settingsLabelClass}>Colors</p>
                  <div className="mt-1.5">
                    <TagInput
                      value={colors}
                      onChange={setColors}
                      placeholder="Type a color and press Enter"
                    />
                  </div>
                </div>
                <div>
                  <p className={settingsLabelClass}>Sizes</p>
                  <div className="mt-1.5">
                    <TagInput
                      value={sizes}
                      onChange={setSizes}
                      placeholder="Type a size and press Enter"
                    />
                  </div>
                </div>
              </div>
            </SettingsCard>

            <SettingsCard
              title="Pricing"
              description="Showcase price is what customers see on the storefront."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={settingsLabelClass}>
                  Showcase price
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    required
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    className={`${settingsInputClass} font-semibold`}
                  />
                </label>
                <label className={settingsLabelClass}>
                  Price note
                  <input
                    value={priceNote}
                    onChange={(e) => setPriceNote(e.target.value)}
                    className={settingsInputClass}
                  />
                </label>
              </div>
            </SettingsCard>

            <SettingsCard
              title="Decoration"
              description={
                <>
                  Choose methods for this product. Manage the global list in{" "}
                  <Link
                    href="/settings/decoration"
                    className="underline hover:text-foreground"
                  >
                    Settings → Decoration
                  </Link>
                  .
                </>
              }
            >
              {catalogMethods.length === 0 ? (
                <p className="text-sm text-muted">
                  No decoration methods configured yet. You can add them later
                  on the product edit screen.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {catalogMethods.map((method) => {
                    const on = decorationOptions.includes(method.id);
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() =>
                          setDecorationOptions((prev) =>
                            on
                              ? prev.filter((id) => id !== method.id)
                              : [...prev, method.id],
                          )
                        }
                        className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                          on
                            ? "border-accent bg-accent/15 text-foreground"
                            : "border-border bg-white text-muted hover:text-foreground"
                        }`}
                      >
                        {method.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </SettingsCard>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <SettingsCard title="Status">
              <label className={settingsLabelClass}>
                Visibility
                <select
                  value={published ? "published" : "draft"}
                  onChange={(e) =>
                    setPublished(e.target.value === "published")
                  }
                  className={settingsInputClass}
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </label>
            </SettingsCard>

            <SettingsCard title="Organization">
              <div className="space-y-3">
                <label className={settingsLabelClass}>
                  Brand
                  <input
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className={settingsInputClass}
                  />
                </label>
                <label className={settingsLabelClass}>
                  Category
                  <input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={settingsInputClass}
                  />
                </label>
                <label className={settingsLabelClass}>
                  URL slug
                  <input
                    value={slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setSlug(e.target.value);
                    }}
                    placeholder="auto-from-name"
                    className={settingsInputClass}
                  />
                </label>
                <label className="flex items-start gap-2.5 pt-1 text-sm">
                  <input
                    type="checkbox"
                    checked={featured}
                    onChange={(e) => setFeatured(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[var(--brand-gold)]"
                  />
                  <span>
                    <span className="font-medium text-foreground">
                      Featured fallback
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      Used on homepage if no collection is set.
                    </span>
                  </span>
                </label>
              </div>
            </SettingsCard>
          </aside>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-border pt-5">
          <button
            type="button"
            onClick={() => router.push("/products")}
            className={settingsBtnSecondaryClass}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className={settingsBtnPrimaryClass}
          >
            {saving ? "Creating…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewProductPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl">
          <p className="text-sm text-muted">Loading…</p>
        </div>
      }
    >
      <NewProductContent />
    </Suspense>
  );
}
