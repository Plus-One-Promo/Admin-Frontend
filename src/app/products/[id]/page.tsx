"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  fetchProduct,
  fetchSiteSettings,
  updateProduct,
  uploadProductImage,
  ssRefreshProduct,
} from "@/lib/api";
import {
  SettingsCard,
  settingsBtnPrimaryClass,
  settingsBtnSecondaryClass,
  settingsInputClass,
  settingsLabelClass,
} from "@/components/settings/SettingsShell";

type ProductColor = {
  name: string;
  hex?: string;
  imageUrl?: string;
  swatchUrl?: string;
};

type CatalogMethod = {
  id: string;
  label: string;
  askInkColors?: boolean;
  locations: string[];
};

type ProductForm = {
  name: string;
  slug: string;
  brand: string;
  category: string;
  description: string;
  basePrice: string;
  supplierPrice: string;
  markupPercent: string;
  priceNote: string;
  colors: ProductColor[];
  sizes: string[];
  imageUrl: string;
  imageThumbUrl: string;
  gallery: string[];
  showcaseColor: string;
  decorationOptions: string[];
  decorationLocations: Record<string, string[]>;
  published: boolean;
  featured: boolean;
  ssStyleId?: string | number;
};

const emptyForm: ProductForm = {
  name: "",
  slug: "",
  brand: "",
  category: "Apparel",
  description: "",
  basePrice: "0",
  supplierPrice: "",
  markupPercent: "",
  priceNote: "Starting estimate — final quote after review",
  colors: [],
  sizes: ["S", "M", "L", "XL", "2XL"],
  imageUrl: "",
  imageThumbUrl: "",
  gallery: [],
  showcaseColor: "",
  decorationOptions: [],
  decorationLocations: {},
  published: true,
  featured: false,
  ssStyleId: undefined,
};

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const productId = params.id;

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [catalogMethods, setCatalogMethods] = useState<CatalogMethod[]>([]);
  const [newColorName, setNewColorName] = useState("");
  const [newSize, setNewSize] = useState("");
  const [colorsOpen, setColorsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [data, settingsData] = await Promise.all([
          fetchProduct(productId),
          fetchSiteSettings(),
        ]);
        const p = data.product;
        if (!p || cancelled) return;
        const methods: CatalogMethod[] = (
          settingsData.settings?.decorationMethods || []
        ).map(
          (m: {
            id?: string;
            label?: string;
            askInkColors?: boolean;
            locations?: string[];
          }) => ({
            id: m.id || "",
            label: m.label || m.id || "",
            askInkColors: Boolean(m.askInkColors),
            locations: Array.isArray(m.locations) ? m.locations : [],
          }),
        );
        setCatalogMethods(methods.filter((m) => m.id));

        const colors: ProductColor[] = Array.isArray(p.colors)
          ? p.colors.map(
              (c: {
                name?: string;
                hex?: string;
                imageUrl?: string;
                swatchUrl?: string;
              }) => ({
                name: c.name || "",
                hex: c.hex || undefined,
                imageUrl: c.imageUrl || undefined,
                swatchUrl: c.swatchUrl || undefined,
              }),
            )
          : [];

        const decorationOptions: string[] = Array.isArray(p.decorationOptions)
          ? p.decorationOptions
          : methods
              .filter((m) => m.id === "screenprint" || m.id === "embroidery")
              .map((m) => m.id);

        const decorationLocations: Record<string, string[]> =
          p.decorationLocations && typeof p.decorationLocations === "object"
            ? p.decorationLocations
            : Object.fromEntries(
                decorationOptions.map((id) => {
                  const method = methods.find((m) => m.id === id);
                  return [id, method?.locations ? [...method.locations] : []];
                }),
              );

        setForm({
          name: p.name || "",
          slug: p.slug || "",
          brand: p.brand || "",
          category: p.category || "Apparel",
          description: p.description || "",
          basePrice: String(p.pricing?.basePrice ?? 0),
          supplierPrice:
            p.pricing?.supplierPrice != null
              ? String(p.pricing.supplierPrice)
              : "",
          markupPercent:
            p.pricing?.markupPercent != null
              ? String(p.pricing.markupPercent)
              : "",
          priceNote:
            p.pricing?.priceNote ||
            "Starting estimate — final quote after review",
          colors,
          sizes: Array.isArray(p.sizes) ? p.sizes : [],
          imageUrl: p.imageUrl || "",
          imageThumbUrl: p.imageThumbUrl || "",
          gallery: Array.isArray(p.gallery) ? p.gallery : [],
          showcaseColor: p.showcaseColor || colors[0]?.name || "",
          decorationOptions,
          decorationLocations,
          published: p.published !== false,
          featured: Boolean(p.featured),
          ssStyleId: p.ssStyleId,
        });
        setError(null);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load product");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  function update(key: keyof ProductForm, value: ProductForm[keyof ProductForm]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setShowcaseFromColor(color: ProductColor) {
    setForm((prev) => ({
      ...prev,
      showcaseColor: color.name,
      imageUrl: color.imageUrl || prev.imageUrl,
      imageThumbUrl: color.imageUrl || prev.imageThumbUrl,
    }));
  }

  function removeColor(name: string) {
    setForm((prev) => {
      const colors = prev.colors.filter((c) => c.name !== name);
      const showcaseColor =
        prev.showcaseColor === name
          ? colors[0]?.name || ""
          : prev.showcaseColor;
      return { ...prev, colors, showcaseColor };
    });
  }

  function addColor() {
    const name = newColorName.trim();
    if (!name) return;
    if (form.colors.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      setNewColorName("");
      return;
    }
    setForm((prev) => ({
      ...prev,
      colors: [...prev.colors, { name }],
      showcaseColor: prev.showcaseColor || name,
    }));
    setNewColorName("");
  }

  function removeSize(size: string) {
    setForm((prev) => ({
      ...prev,
      sizes: prev.sizes.filter((s) => s !== size),
    }));
  }

  function addSize() {
    const size = newSize.trim().toUpperCase();
    if (!size) return;
    if (form.sizes.some((s) => s.toLowerCase() === size.toLowerCase())) {
      setNewSize("");
      return;
    }
    setForm((prev) => ({ ...prev, sizes: [...prev.sizes, size] }));
    setNewSize("");
  }

  async function refreshFromSs() {
    setSyncing(true);
    setError(null);
    try {
      const data = await ssRefreshProduct(productId);
      const p = data.product;
      const colors: ProductColor[] = Array.isArray(p.colors)
        ? p.colors.map(
            (c: {
              name?: string;
              hex?: string;
              imageUrl?: string;
              swatchUrl?: string;
            }) => ({
              name: c.name || "",
              hex: c.hex || undefined,
              imageUrl: c.imageUrl || undefined,
              swatchUrl: c.swatchUrl || undefined,
            }),
          )
        : [];
      setForm((prev) => ({
        ...prev,
        colors,
        sizes: Array.isArray(p.sizes) ? p.sizes : prev.sizes,
        showcaseColor: p.showcaseColor || colors[0]?.name || prev.showcaseColor,
        imageUrl: p.imageUrl || prev.imageUrl,
        imageThumbUrl: p.imageThumbUrl || prev.imageThumbUrl,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to refresh from S&S");
    } finally {
      setSyncing(false);
    }
  }

  async function onUpload(file: File, asPrimary: boolean) {
    setUploading(true);
    setError(null);
    try {
      const { asset } = await uploadProductImage(file, productId);
      if (asPrimary) {
        setForm((prev) => ({
          ...prev,
          imageUrl: asset.url,
          imageThumbUrl: asset.thumbUrl,
        }));
      } else {
        setForm((prev) => ({
          ...prev,
          gallery: [...prev.gallery, asset.url],
        }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateProduct(productId, {
        name: form.name,
        slug: form.slug,
        brand: form.brand,
        category: form.category,
        description: form.description,
        imageUrl: form.imageUrl || undefined,
        imageThumbUrl: form.imageThumbUrl || undefined,
        gallery: form.gallery,
        showcaseColor: form.showcaseColor || undefined,
        published: form.published,
        featured: form.featured,
        colors: form.colors.filter((c) => c.name.trim()),
        sizes: form.sizes.filter(Boolean),
        decorationOptions: form.decorationOptions,
        decorationLocations: Object.fromEntries(
          form.decorationOptions.map((id) => [
            id,
            form.decorationLocations[id] || [],
          ]),
        ),
        pricing: {
          displayMode: "from",
          currency: "USD",
          basePrice: Number(form.basePrice) || 0,
          supplierPrice:
            form.supplierPrice !== ""
              ? Number(form.supplierPrice)
              : undefined,
          markupPercent:
            form.markupPercent !== ""
              ? Number(form.markupPercent)
              : undefined,
          priceNote: form.priceNote,
        },
      });
      router.push("/products");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl">
        <p className="text-sm text-muted">Loading product…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <form onSubmit={onSubmit}>
        <div className="sticky top-0 z-10 -mx-6 mb-6 border-b border-border bg-background/95 px-6 py-4 backdrop-blur md:-mx-8 md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <Link
                href="/products"
                className="text-xs font-medium text-muted transition hover:text-foreground"
              >
                ← Products
              </Link>
              <h1 className="mt-1 truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                {form.name || "Untitled product"}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => router.push("/products")}
                className={settingsBtnSecondaryClass}
              >
                Discard
              </button>
              <button
                type="submit"
                disabled={saving || uploading}
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
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    className={settingsInputClass}
                  />
                </label>
                <label className={settingsLabelClass}>
                  Description
                  <textarea
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    rows={5}
                    className={`${settingsInputClass} resize-y`}
                  />
                </label>
              </div>
            </SettingsCard>

            <SettingsCard
              title="Media"
              description={
                form.showcaseColor
                  ? `Showcase color: ${form.showcaseColor}`
                  : "Pick a color below to set the featured product shot."
              }
            >
              <div className="flex flex-wrap items-start gap-4">
                <div className="relative h-44 w-36 overflow-hidden rounded-xl border border-border bg-[#faf9f7]">
                  {form.imageThumbUrl || form.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.imageThumbUrl || form.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-2 text-center text-xs text-muted">
                      No image
                    </div>
                  )}
                </div>
                <div className="min-w-[16rem] flex-1 space-y-3">
                  <label className="inline-flex cursor-pointer rounded-lg bg-foreground px-3 py-2 text-sm font-semibold text-white">
                    {uploading ? "Uploading…" : "Upload image"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void onUpload(file, true);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <label className={settingsLabelClass}>
                    Or paste image URL
                    <input
                      value={form.imageUrl}
                      onChange={(e) => update("imageUrl", e.target.value)}
                      className={settingsInputClass}
                    />
                  </label>
                </div>
              </div>
            </SettingsCard>

            <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <button
                type="button"
                onClick={() => setColorsOpen((open) => !open)}
                aria-expanded={colorsOpen}
                className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-[#faf9f7]/70 sm:px-6"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-foreground">
                      Colors
                    </h2>
                    <span className="rounded-full bg-[#f3f1ed] px-2 py-0.5 text-xs font-semibold text-muted">
                      {form.colors.length}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {form.showcaseColor
                      ? `Showcase: ${form.showcaseColor}`
                      : form.colors.length === 0
                        ? "No colors yet"
                        : "Closed — expand to manage colors"}
                  </p>
                </div>
                {!colorsOpen && form.colors.length > 0 && (
                  <div className="hidden items-center sm:flex">
                    <div className="flex -space-x-1.5">
                      {form.colors.slice(0, 8).map((color) => (
                        <span
                          key={color.name}
                          title={color.name}
                          className="h-5 w-5 rounded-full border-2 border-white shadow-sm"
                          style={{
                            backgroundColor: color.hex || "#ddd",
                            backgroundImage: color.swatchUrl
                              ? `url(${color.swatchUrl})`
                              : undefined,
                            backgroundSize: "cover",
                          }}
                        />
                      ))}
                    </div>
                    {form.colors.length > 8 && (
                      <span className="ml-2 text-xs font-medium text-muted">
                        +{form.colors.length - 8}
                      </span>
                    )}
                  </div>
                )}
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                  className={`h-5 w-5 shrink-0 text-muted transition ${
                    colorsOpen ? "rotate-180" : ""
                  }`}
                >
                  <path
                    d="M5 7.5 10 12.5 15 7.5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {colorsOpen && (
                <div className="border-t border-border px-5 py-5 sm:px-6">
                  <p className="mb-4 text-sm text-muted">
                    Click a color to use it as the storefront showcase image.
                  </p>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {form.ssStyleId ? (
                      <button
                        type="button"
                        disabled={syncing}
                        onClick={() => void refreshFromSs()}
                        className={settingsBtnSecondaryClass}
                      >
                        {syncing ? "Syncing…" : "Refresh from S&S"}
                      </button>
                    ) : null}
                    <input
                      value={newColorName}
                      onChange={(e) => setNewColorName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addColor();
                        }
                      }}
                      placeholder="Add color name"
                      className="min-w-[10rem] flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/25"
                    />
                    <button
                      type="button"
                      onClick={addColor}
                      className={settingsBtnSecondaryClass}
                    >
                      Add
                    </button>
                  </div>

                  {form.colors.length === 0 ? (
                    <p className="text-sm text-muted">
                      No colors yet. Import from S&amp;S or add colors
                      manually.
                    </p>
                  ) : (
                    <div className="grid max-h-[28rem] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-4">
                      {form.colors.map((color) => {
                        const isShowcase = form.showcaseColor === color.name;
                        return (
                          <div
                            key={color.name}
                            className={`overflow-hidden rounded-xl border ${
                              isShowcase
                                ? "border-accent ring-1 ring-accent/40"
                                : "border-border"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setShowcaseFromColor(color)}
                              className="block w-full text-left"
                              title="Use as showcase image"
                            >
                              <div className="relative aspect-[4/5] bg-[#faf9f7]">
                                {color.imageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={color.imageUrl}
                                    alt={color.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div
                                    className="flex h-full w-full items-center justify-center"
                                    style={{
                                      backgroundColor: color.hex || "#e8e4de",
                                    }}
                                  >
                                    <span className="text-xs text-black/40">
                                      No photo
                                    </span>
                                  </div>
                                )}
                                {isShowcase && (
                                  <span className="absolute left-2 top-2 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-medium text-white">
                                    Showcase
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 px-2.5 py-2">
                                <span
                                  className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/10"
                                  style={{
                                    backgroundColor: color.hex || "#ddd",
                                    backgroundImage: color.swatchUrl
                                      ? `url(${color.swatchUrl})`
                                      : undefined,
                                    backgroundSize: "cover",
                                  }}
                                />
                                <span className="truncate text-xs font-medium">
                                  {color.name}
                                </span>
                              </div>
                            </button>
                            <div className="flex border-t border-border">
                              <button
                                type="button"
                                onClick={() => setShowcaseFromColor(color)}
                                className="flex-1 px-2 py-1.5 text-[11px] font-medium text-accent-dark hover:bg-[#faf9f7]"
                              >
                                {isShowcase ? "Showcased" : "Set showcase"}
                              </button>
                              <button
                                type="button"
                                onClick={() => removeColor(color.name)}
                                className="border-l border-border px-2 py-1.5 text-[11px] text-red-600 hover:bg-[#faf9f7]"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </section>

            <SettingsCard
              title={`Sizes (${form.sizes.length})`}
              description="Available sizes on the storefront (no inventory qty)."
            >
              <div className="mb-3 flex flex-wrap gap-2">
                <input
                  value={newSize}
                  onChange={(e) => setNewSize(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSize();
                    }
                  }}
                  placeholder="Add size"
                  className="w-28 rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/25"
                />
                <button
                  type="button"
                  onClick={addSize}
                  className={settingsBtnSecondaryClass}
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.sizes.map((size) => (
                  <span
                    key={size}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-[#faf9f7] px-3 py-1.5 text-sm font-medium"
                  >
                    {size}
                    <button
                      type="button"
                      onClick={() => removeSize(size)}
                      className="text-muted hover:text-red-600"
                      aria-label={`Remove ${size}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
                {form.sizes.length === 0 && (
                  <p className="text-sm text-muted">No sizes yet.</p>
                )}
              </div>
            </SettingsCard>

            <SettingsCard
              title="Pricing"
              description="Showcase price is what customers see. Supplier cost and markup are kept for reference on S&S imports."
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <label className={settingsLabelClass}>
                  Supplier / blank cost
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={form.supplierPrice}
                    onChange={(e) => update("supplierPrice", e.target.value)}
                    placeholder="—"
                    className={settingsInputClass}
                  />
                </label>
                <label className={settingsLabelClass}>
                  Markup used %
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    value={form.markupPercent}
                    onChange={(e) => update("markupPercent", e.target.value)}
                    placeholder="—"
                    className={settingsInputClass}
                  />
                </label>
                <label className={settingsLabelClass}>
                  Showcase price
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    required
                    value={form.basePrice}
                    onChange={(e) => update("basePrice", e.target.value)}
                    className={`${settingsInputClass} font-semibold`}
                  />
                </label>
              </div>
              {form.supplierPrice !== "" && form.markupPercent !== "" && (
                <button
                  type="button"
                  onClick={() => {
                    const cost = Number(form.supplierPrice);
                    const markup = Number(form.markupPercent);
                    if (!Number.isFinite(cost) || !Number.isFinite(markup))
                      return;
                    const next =
                      Math.round(cost * (1 + markup / 100) * 100) / 100;
                    update("basePrice", String(next));
                  }}
                  className="mt-3 text-xs font-medium text-accent-dark hover:underline"
                >
                  Recalculate showcase from cost + markup
                </button>
              )}
              <label className={`${settingsLabelClass} mt-4`}>
                Price note shown to customers
                <input
                  value={form.priceNote}
                  onChange={(e) => update("priceNote", e.target.value)}
                  className={settingsInputClass}
                />
              </label>
            </SettingsCard>

            <SettingsCard
              title="Decoration"
              description={
                <>
                  Choose methods and locations for this product. Manage the
                  global list in{" "}
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
                  No decoration methods yet. Add them under Settings →
                  Decoration.
                </p>
              ) : (
                <div className="space-y-3">
                  {catalogMethods.map((method) => {
                    const enabled = form.decorationOptions.includes(method.id);
                    const selectedLocs =
                      form.decorationLocations[method.id] || [];
                    return (
                      <div
                        key={method.id}
                        className="rounded-xl border border-border bg-[#faf9f7] p-3.5"
                      >
                        <label className="flex items-center gap-2.5 text-sm font-semibold">
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => {
                              const on = e.target.checked;
                              setForm((prev) => {
                                const decorationOptions = on
                                  ? [...prev.decorationOptions, method.id]
                                  : prev.decorationOptions.filter(
                                      (id) => id !== method.id,
                                    );
                                const decorationLocations = {
                                  ...prev.decorationLocations,
                                };
                                if (on && !decorationLocations[method.id]) {
                                  decorationLocations[method.id] = [
                                    ...method.locations,
                                  ];
                                }
                                if (!on) {
                                  delete decorationLocations[method.id];
                                }
                                return {
                                  ...prev,
                                  decorationOptions,
                                  decorationLocations,
                                };
                              });
                            }}
                            className="h-4 w-4 accent-[var(--brand-gold)]"
                          />
                          {method.label}
                        </label>
                        {enabled && (
                          <div className="mt-3 flex flex-wrap gap-2 pl-6">
                            {method.locations.length === 0 ? (
                              <p className="text-xs text-muted">
                                No locations defined for this method in
                                Settings.
                              </p>
                            ) : (
                              method.locations.map((loc) => {
                                const checked = selectedLocs.includes(loc);
                                return (
                                  <label
                                    key={loc}
                                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                                      checked
                                        ? "border-accent bg-white text-foreground"
                                        : "border-border bg-white/70 text-muted"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      className="sr-only"
                                      onChange={(e) => {
                                        const on = e.target.checked;
                                        setForm((prev) => {
                                          const current =
                                            prev.decorationLocations[
                                              method.id
                                            ] || [];
                                          const next = on
                                            ? [...current, loc]
                                            : current.filter((l) => l !== loc);
                                          return {
                                            ...prev,
                                            decorationLocations: {
                                              ...prev.decorationLocations,
                                              [method.id]: next,
                                            },
                                          };
                                        });
                                      }}
                                    />
                                    {loc}
                                  </label>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
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
                  value={form.published ? "published" : "draft"}
                  onChange={(e) =>
                    update("published", e.target.value === "published")
                  }
                  className={settingsInputClass}
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </label>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                {form.published
                  ? "Visible on the storefront when catalog pages load it."
                  : "Hidden from the public shop until you publish."}
              </p>
            </SettingsCard>

            <SettingsCard title="Organization">
              <div className="space-y-3">
                <label className={settingsLabelClass}>
                  Brand
                  <input
                    value={form.brand}
                    onChange={(e) => update("brand", e.target.value)}
                    className={settingsInputClass}
                  />
                </label>
                <label className={settingsLabelClass}>
                  Category
                  <input
                    value={form.category}
                    onChange={(e) => update("category", e.target.value)}
                    className={settingsInputClass}
                  />
                </label>
                <label className={settingsLabelClass}>
                  URL slug
                  <input
                    required
                    value={form.slug}
                    onChange={(e) => update("slug", e.target.value)}
                    className={settingsInputClass}
                  />
                </label>
                <label className="flex items-start gap-2.5 pt-1 text-sm">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => update("featured", e.target.checked)}
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
            Discard
          </button>
          <button
            type="submit"
            disabled={saving || uploading}
            className={settingsBtnPrimaryClass}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
