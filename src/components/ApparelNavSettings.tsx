"use client";

import { FormEvent, useEffect, useState } from "react";
import { saveNavigationSettings } from "@/lib/api";

export type NavItemDraft = {
  id: string;
  label: string;
  collectionSlug: string;
  brand: string;
  href: string;
};

export type NavColumnDraft = {
  id: string;
  title: string;
  items: NavItemDraft[];
  viewAllLabel: string;
  viewAllHref: string;
  helpText: string;
  ctaLabel: string;
  ctaHref: string;
};

type LinkType = "collection" | "brand" | "href";

function inferLinkType(item: NavItemDraft): LinkType {
  if (item.href.trim()) return "href";
  if (item.brand.trim()) return "brand";
  return "collection";
}

function linkTarget(item: NavItemDraft, type: LinkType) {
  if (type === "brand") return item.brand;
  if (type === "href") return item.href;
  return item.collectionSlug;
}

function withLinkType(
  item: NavItemDraft,
  type: LinkType,
  target: string,
): NavItemDraft {
  return {
    ...item,
    collectionSlug: type === "collection" ? target : "",
    brand: type === "brand" ? target : "",
    href: type === "href" ? target : "",
  };
}

export function megaMenuToDraft(raw: {
  columns?: Array<{
    id?: string;
    title?: string;
    items?: Array<{
      id?: string;
      label?: string;
      collectionSlug?: string;
      brand?: string;
      href?: string;
    }>;
    viewAllLabel?: string;
    viewAllHref?: string;
    helpText?: string;
    ctaLabel?: string;
    ctaHref?: string;
  }>;
}): NavColumnDraft[] {
  return (raw?.columns || []).map((col, i) => ({
    id: col.id || `column-${i + 1}`,
    title: col.title || "",
    items: (col.items || []).map((item, j) => ({
      id: item.id || `item-${i}-${j}`,
      label: item.label || "",
      collectionSlug: item.collectionSlug || "",
      brand: item.brand || "",
      href: item.href || "",
    })),
    viewAllLabel: col.viewAllLabel || "View All",
    viewAllHref: col.viewAllHref || "/apparel",
    helpText: col.helpText || "",
    ctaLabel: col.ctaLabel || "",
    ctaHref: col.ctaHref || "",
  }));
}

const inputClass =
  "mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent";
const labelClass = "block text-xs font-medium text-muted";

type Props = {
  initialColumns: NavColumnDraft[];
};

export function ApparelNavSettings({ initialColumns }: Props) {
  const [columns, setColumns] = useState<NavColumnDraft[]>(initialColumns);
  const [openFooter, setOpenFooter] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setColumns(initialColumns);
  }, [initialColumns]);

  function updateColumn(colIndex: number, patch: Partial<NavColumnDraft>) {
    setColumns((prev) =>
      prev.map((c, i) => (i === colIndex ? { ...c, ...patch } : c)),
    );
  }

  function updateItem(
    colIndex: number,
    itemIndex: number,
    next: NavItemDraft,
  ) {
    setColumns((prev) =>
      prev.map((c, i) => {
        if (i !== colIndex) return c;
        return {
          ...c,
          items: c.items.map((it, j) => (j === itemIndex ? next : it)),
        };
      }),
    );
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const payload = {
        apparelMegaMenu: {
          columns: columns
            .map((col) => ({
              id: col.id,
              title: col.title.trim(),
              viewAllLabel: col.viewAllLabel.trim() || undefined,
              viewAllHref: col.viewAllHref.trim() || undefined,
              helpText: col.helpText.trim() || undefined,
              ctaLabel: col.ctaLabel.trim() || undefined,
              ctaHref: col.ctaHref.trim() || undefined,
              items: col.items
                .map((item) => {
                  const type = inferLinkType(item);
                  return {
                    id: item.id,
                    label: item.label.trim(),
                    collectionSlug:
                      type === "collection"
                        ? item.collectionSlug.trim() || undefined
                        : undefined,
                    brand:
                      type === "brand" ? item.brand.trim() || undefined : undefined,
                    href:
                      type === "href" ? item.href.trim() || undefined : undefined,
                  };
                })
                .filter((item) => item.label),
            }))
            .filter((col) => col.title),
        },
      };
      if (!payload.apparelMegaMenu.columns.length) {
        throw new Error("Add at least one column with a title");
      }
      const data = await saveNavigationSettings(payload);
      setColumns(
        megaMenuToDraft(
          data.settings?.apparelMegaMenu || payload.apparelMegaMenu,
        ),
      );
      setMessage(
        data.message ||
          "Saved — the storefront Apparel dropdown will use this menu.",
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save navigation",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSave}
      className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
    >
      <div className="border-b border-border px-5 py-4 sm:px-6">
        <h2 className="text-base font-semibold text-foreground">
          Apparel mega-menu
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Controls the Categories / Brands / Discover dropdown. Link items to a
          collection page, brand filter, or custom path. Saving creates empty
          collections for new slugs.
        </p>
      </div>

      <div className="divide-y divide-border">
        {columns.map((column, colIndex) => {
          const footerOpen = openFooter[column.id] ?? false;
          return (
            <section key={column.id} className="px-5 py-5 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-semibold text-muted">
                    {colIndex + 1}
                  </span>
                  <input
                    value={column.title}
                    onChange={(e) =>
                      updateColumn(colIndex, { title: e.target.value })
                    }
                    className="min-w-0 flex-1 border-0 bg-transparent p-0 text-base font-semibold text-foreground outline-none placeholder:text-muted/50 focus:ring-0"
                    placeholder="Column title (e.g. Categories)"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted">
                    {column.items.length} link
                    {column.items.length === 1 ? "" : "s"}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setColumns((prev) =>
                        prev.filter((_, i) => i !== colIndex),
                      )
                    }
                    className="text-xs font-medium text-muted transition hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                {column.items.length === 0 && (
                  <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
                    No links yet — add the first one below.
                  </p>
                )}

                {column.items.map((item, itemIndex) => {
                  const type = inferLinkType(item);
                  const target = linkTarget(item, type);
                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-border bg-surface/60 p-3 sm:p-3.5"
                    >
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1.1fr)_9rem_minmax(0,1.2fr)_auto] sm:items-end">
                        <label className={labelClass}>
                          Label
                          <input
                            value={item.label}
                            onChange={(e) =>
                              updateItem(colIndex, itemIndex, {
                                ...item,
                                label: e.target.value,
                              })
                            }
                            placeholder="Custom T-Shirts"
                            className={inputClass}
                          />
                        </label>

                        <label className={labelClass}>
                          Link type
                          <select
                            value={type}
                            onChange={(e) => {
                              const nextType = e.target.value as LinkType;
                              updateItem(
                                colIndex,
                                itemIndex,
                                withLinkType(item, nextType, target),
                              );
                            }}
                            className={inputClass}
                          >
                            <option value="collection">Collection</option>
                            <option value="brand">Brand</option>
                            <option value="href">Custom path</option>
                          </select>
                        </label>

                        <label className={labelClass}>
                          {type === "collection"
                            ? "Collection slug"
                            : type === "brand"
                              ? "Brand name"
                              : "Path"}
                          <input
                            value={target}
                            onChange={(e) =>
                              updateItem(
                                colIndex,
                                itemIndex,
                                withLinkType(item, type, e.target.value),
                              )
                            }
                            placeholder={
                              type === "collection"
                                ? "custom-t-shirts"
                                : type === "brand"
                                  ? "Comfort Colors"
                                  : "/apparel"
                            }
                            className={inputClass}
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() =>
                            setColumns((prev) =>
                              prev.map((c, i) =>
                                i === colIndex
                                  ? {
                                      ...c,
                                      items: c.items.filter(
                                        (_, j) => j !== itemIndex,
                                      ),
                                    }
                                  : c,
                              ),
                            )
                          }
                          className="mb-0.5 h-10 rounded-lg px-2 text-xs font-medium text-muted transition hover:bg-white hover:text-red-600"
                          aria-label={`Remove ${item.label || "link"}`}
                        >
                          ✕
                        </button>
                      </div>
                      {type === "collection" && target.trim() && (
                        <p className="mt-2 text-[11px] text-muted">
                          Opens{" "}
                          <span className="font-medium text-foreground">
                            /collections/{target.trim()}
                          </span>
                        </p>
                      )}
                      {type === "brand" && target.trim() && (
                        <p className="mt-2 text-[11px] text-muted">
                          Filters{" "}
                          <span className="font-medium text-foreground">
                            /apparel?brand={target.trim()}
                          </span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setColumns((prev) =>
                      prev.map((c, i) =>
                        i === colIndex
                          ? {
                              ...c,
                              items: [
                                ...c.items,
                                {
                                  id: `item-${Date.now().toString(36)}`,
                                  label: "",
                                  collectionSlug: "",
                                  brand: "",
                                  href: "",
                                },
                              ],
                            }
                          : c,
                      ),
                    )
                  }
                  className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-accent"
                >
                  + Add link
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setOpenFooter((prev) => ({
                      ...prev,
                      [column.id]: !footerOpen,
                    }))
                  }
                  className="text-xs font-medium text-muted hover:text-foreground"
                >
                  {footerOpen ? "Hide" : "Edit"} column footer
                  {(column.helpText || column.ctaLabel) && !footerOpen
                    ? " · has extras"
                    : ""}
                </button>
              </div>

              {footerOpen && (
                <div className="mt-4 rounded-xl border border-border bg-surface/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Column footer
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className={labelClass}>
                      View all label
                      <input
                        value={column.viewAllLabel}
                        onChange={(e) =>
                          updateColumn(colIndex, {
                            viewAllLabel: e.target.value,
                          })
                        }
                        className={inputClass}
                      />
                    </label>
                    <label className={labelClass}>
                      View all path
                      <input
                        value={column.viewAllHref}
                        onChange={(e) =>
                          updateColumn(colIndex, {
                            viewAllHref: e.target.value,
                          })
                        }
                        placeholder="/apparel"
                        className={inputClass}
                      />
                    </label>
                    <label className={`${labelClass} sm:col-span-2`}>
                      Help text
                      <input
                        value={column.helpText}
                        onChange={(e) =>
                          updateColumn(colIndex, { helpText: e.target.value })
                        }
                        placeholder="Need help finding the perfect product?"
                        className={inputClass}
                      />
                    </label>
                    <label className={labelClass}>
                      CTA label
                      <input
                        value={column.ctaLabel}
                        onChange={(e) =>
                          updateColumn(colIndex, { ctaLabel: e.target.value })
                        }
                        placeholder="Talk to us"
                        className={inputClass}
                      />
                    </label>
                    <label className={labelClass}>
                      CTA path
                      <input
                        value={column.ctaHref}
                        onChange={(e) =>
                          updateColumn(colIndex, { ctaHref: e.target.value })
                        }
                        placeholder="/contact"
                        className={inputClass}
                      />
                    </label>
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-[#faf9f7] px-5 py-3 sm:px-6">
        <button
          type="button"
          onClick={() =>
            setColumns((prev) => [
              ...prev,
              {
                id: `column-${Date.now().toString(36)}`,
                title: "",
                items: [],
                viewAllLabel: "View All",
                viewAllHref: "/apparel",
                helpText: "",
                ctaLabel: "",
                ctaHref: "",
              },
            ])
          }
          className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface"
        >
          Add column
        </button>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-foreground px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>

      {(message || error) && (
        <div className="border-t border-border px-5 py-3 sm:px-6">
          {message && <p className="text-sm text-green-700">{message}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}
    </form>
  );
}
