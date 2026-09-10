"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  createCollection,
  deleteCollection,
  fetchCollections,
  setHomepageCollection,
} from "@/lib/api";

type Collection = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  productIds?: string[];
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

export default function CollectionsPage() {
  const router = useRouter();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [homepageCollectionId, setHomepageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchCollections();
      setCollections(data.collections || []);
      setHomepageId(data.homepageCollectionId || null);
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
    if (!q) return collections;
    return collections.filter((c) => {
      const hay = [c.name, c.slug, c.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [collections, query]);

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((c) => selected.has(c.id));
  const someVisibleSelected = filtered.some((c) => selected.has(c.id));

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
        filtered.forEach((c) => next.delete(c.id));
      } else {
        filtered.forEach((c) => next.add(c.id));
      }
      return next;
    });
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const slug = newName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const created = await createCollection({
        name: newName.trim(),
        slug,
        productIds: [],
      });
      setNewName("");
      setShowCreate(false);
      const newId = created?.collection?.id;
      if (newId) {
        router.push(`/collections/${newId}`);
        return;
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setCreating(false);
    }
  }

  async function onSetHomepage(id: string | null, e?: React.MouseEvent) {
    e?.stopPropagation();
    try {
      await setHomepageCollection(id);
      setHomepageId(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update homepage");
    }
  }

  async function removeOne(id: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    if (!confirm("Delete this collection?")) return;
    try {
      await deleteCollection(id);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (homepageCollectionId === id) setHomepageId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  async function runBulkDelete() {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (
      !confirm(
        `Delete ${ids.length} collection${ids.length === 1 ? "" : "s"}? This cannot be undone.`,
      )
    ) {
      return;
    }
    setBulkBusy(true);
    setError(null);
    try {
      await Promise.all(ids.map((id) => deleteCollection(id)));
      setSelected(new Set());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk delete failed");
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Collections
          </h1>
          <p className="mt-1 text-sm text-muted">
            {loading
              ? "Loading…"
              : `${collections.length} collection${collections.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-white transition hover:bg-foreground/90"
        >
          Create collection
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {showCreate && (
        <form
          onSubmit={onCreate}
          className="mt-5 overflow-hidden rounded-2xl border border-border bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-5"
        >
          <p className="text-sm font-semibold text-foreground">
            New collection
          </p>
          <p className="mt-1 text-xs text-muted">
            You can add products and edit details on the next screen.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="min-w-[16rem] flex-1 text-sm font-medium text-foreground">
              Title
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Homepage Featured"
                className="mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/25"
              />
            </label>
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreate(false);
                setNewName("");
              }}
              className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground"
            >
              Cancel
            </button>
          </div>
        </form>
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
              placeholder="Search collections"
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
              onClick={() => void runBulkDelete()}
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
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-semibold text-muted">
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
                    aria-label="Select all collections"
                    className="h-4 w-4 rounded border-border accent-[var(--brand-gold)]"
                  />
                </th>
                <th className="px-2 py-3">Collection</th>
                <th className="px-4 py-3">Products</th>
                <th className="px-4 py-3">Homepage</th>
                <th className="w-12 px-4 py-3 sm:px-5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const isSelected = selected.has(c.id);
                const isHome = homepageCollectionId === c.id;
                const count = (c.productIds || []).length;
                return (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/collections/${c.id}`)}
                    className={`cursor-pointer border-b border-border last:border-0 transition ${
                      isSelected ? "bg-accent/10" : "hover:bg-[#faf9f7]"
                    }`}
                  >
                    <td
                      className="px-4 py-3 sm:px-5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(c.id)}
                        aria-label={`Select ${c.name}`}
                        className="h-4 w-4 rounded border-border accent-[var(--brand-gold)]"
                      />
                    </td>
                    <td className="px-2 py-3">
                      <p className="font-semibold text-foreground">{c.name}</p>
                      <p className="text-xs text-muted">/{c.slug}</p>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted">
                      {count}
                    </td>
                    <td
                      className="px-4 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isHome ? (
                        <span className="inline-flex items-center rounded-full bg-accent/25 px-2.5 py-1 text-xs font-semibold text-foreground ring-1 ring-accent/30">
                          Active on site
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => void onSetHomepage(c.id, e)}
                          className="text-xs font-semibold text-accent-dark hover:underline"
                        >
                          Use on homepage
                        </button>
                      )}
                    </td>
                    <td
                      className="px-4 py-3 text-right sm:px-5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={(e) => void removeOne(c.id, e)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-red-50 hover:text-red-700"
                        aria-label={`Delete ${c.name}`}
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
                    colSpan={5}
                    className="px-4 py-12 text-center text-sm text-muted"
                  >
                    {collections.length === 0
                      ? "No collections yet. Create one to curate the site."
                      : "No collections match your search."}
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td
                    colSpan={5}
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

      {homepageCollectionId && (
        <button
          type="button"
          onClick={() => void onSetHomepage(null)}
          className="mt-4 text-xs text-muted hover:underline"
        >
          Clear homepage collection (site falls back to featured products)
        </button>
      )}
    </div>
  );
}
