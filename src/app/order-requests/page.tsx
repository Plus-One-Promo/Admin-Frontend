"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { fetchOrderRequests, updateOrderStatus } from "@/lib/api";

type SizeLine = { size: string; qty: number };

type OrderItem = {
  productId?: string;
  productName?: string;
  productSlug?: string;
  imageUrl?: string;
  variants?: Array<{
    color?: { name: string; hex?: string };
    sizes?: SizeLine[];
  }>;
  decoration?: {
    method: string;
    locations?: string[];
    colors?: number;
  };
  design?: {
    hasArtwork: boolean;
    notes?: string;
    artworkUrl?: string;
  };
};

type OrderRequest = {
  id: string;
  status: string;
  productName?: string;
  totalQty?: number;
  itemCount?: number;
  estimatedTotal?: number;
  createdAt: string;
  contact: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
  };
  color?: { name: string };
  decoration?: { method: string; locations?: string[] };
  delivery?: { speed: string; needByDate?: string; notes?: string };
  items?: OrderItem[];
  specialInstructions?: string;
};

const STATUSES = [
  "new",
  "reviewing",
  "quoted",
  "approved",
  "in_production",
  "completed",
  "cancelled",
] as const;

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "reviewing", label: "Reviewing" },
  { id: "quoted", label: "Quoted" },
  { id: "approved", label: "Approved" },
  { id: "in_production", label: "In production" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
] as const;

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

function statusTone(status: string) {
  switch (status) {
    case "new":
      return "bg-accent/25 text-foreground ring-accent/30";
    case "reviewing":
      return "bg-sky-50 text-sky-800 ring-sky-100";
    case "quoted":
      return "bg-violet-50 text-violet-800 ring-violet-100";
    case "approved":
    case "in_production":
      return "bg-amber-50 text-amber-900 ring-amber-100";
    case "completed":
      return "bg-emerald-50 text-emerald-800 ring-emerald-100";
    case "cancelled":
      return "bg-[#f3f1ed] text-muted ring-border";
    default:
      return "bg-[#f3f1ed] text-muted ring-border";
  }
}

function formatMoney(value?: number) {
  if (value == null || Number.isNaN(value)) return "—";
  return `$${value.toFixed(2)}`;
}

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function itemQty(item: OrderItem) {
  return (item.variants || []).reduce(
    (sum, variant) =>
      sum + (variant.sizes || []).reduce((s, line) => s + (line.qty || 0), 0),
    0,
  );
}

export default function OrderRequestsPage() {
  const [items, setItems] = useState<OrderRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchOrderRequests();
      const list = (data.orderRequests || []) as OrderRequest[];
      list.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setItems(list);
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

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: items.length };
    for (const status of STATUSES) map[status] = 0;
    for (const item of items) {
      map[item.status] = (map[item.status] || 0) + 1;
    }
    return map;
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!q) return true;
      const hay = [
        item.contact?.name,
        item.contact?.email,
        item.contact?.company,
        item.productName,
        item.id,
        ...(item.items || []).map((line) => line.productName),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, query, statusFilter]);

  async function onStatusChange(id: string, status: string) {
    setUpdatingId(id);
    setError(null);
    try {
      await updateOrderStatus(id, status);
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status } : item)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Order requests
          </h1>
          <p className="mt-1 text-sm text-muted">
            {loading
              ? "Loading…"
              : `${items.length} request${items.length === 1 ? "" : "s"} · no payment collected — quote and move toward production`}
          </p>
        </div>
        {counts.new > 0 && (
          <span className="rounded-full bg-accent/25 px-3 py-1 text-xs font-semibold text-foreground ring-1 ring-accent/30">
            {counts.new} new
          </span>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3 sm:px-5">
          <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto pb-0.5">
            {STATUS_FILTERS.map((filter) => {
              const active = statusFilter === filter.id;
              const count = counts[filter.id] || 0;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setStatusFilter(filter.id)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "bg-foreground text-white"
                      : "text-muted hover:bg-[#faf9f7] hover:text-foreground"
                  }`}
                >
                  {filter.label}
                  <span
                    className={`ml-1.5 tabular-nums ${
                      active ? "text-white/70" : "text-muted"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <label className="relative w-full sm:w-64">
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
              placeholder="Search requests"
              className="w-full rounded-lg border border-border bg-[#faf9f7] py-2 pl-9 pr-3 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/25"
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-semibold text-muted">
                <th className="px-4 py-3 sm:px-5">Request</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Estimate</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 sm:px-5">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const open = expanded === item.id;
                const lines = item.items || [];
                return (
                  <Fragment key={item.id}>
                    <tr
                      onClick={() => setExpanded(open ? null : item.id)}
                      className={`cursor-pointer border-b border-border transition ${
                        open ? "bg-accent/10" : "hover:bg-[#faf9f7]"
                      }`}
                    >
                      <td className="px-4 py-3 sm:px-5">
                        <div className="flex items-start gap-3">
                          <div className="relative mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-[#faf9f7]">
                            {lines[0]?.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={lines[0].imageUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-[10px] font-semibold text-muted">
                                {(item.itemCount || 1) > 1
                                  ? `${item.itemCount}`
                                  : "OR"}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-foreground">
                              {item.productName || "Order request"}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-muted">
                              {[
                                item.color?.name,
                                item.decoration?.method,
                                item.delivery?.speed,
                              ]
                                .filter(Boolean)
                                .join(" · ") || "Open for details"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">
                          {item.contact.name}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {item.contact.company || item.contact.email}
                        </p>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-foreground">
                        {item.totalQty ?? "—"}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-foreground">
                        {formatMoney(item.estimatedTotal)}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {formatDate(item.createdAt)}
                      </td>
                      <td
                        className="px-4 py-3 sm:px-5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex flex-col items-start gap-1.5">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ring-1 ${statusTone(
                              item.status,
                            )}`}
                          >
                            {statusLabel(item.status)}
                          </span>
                          <select
                            value={item.status}
                            disabled={updatingId === item.id}
                            onChange={(e) =>
                              void onStatusChange(item.id, e.target.value)
                            }
                            className="rounded-lg border border-border bg-white px-2 py-1 text-xs outline-none focus:border-accent disabled:opacity-50"
                            aria-label={`Update status for ${item.contact.name}`}
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {statusLabel(s)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                    </tr>
                    {open && (
                      <tr className="border-b border-border bg-[#faf9f7]">
                        <td colSpan={6} className="px-4 py-5 sm:px-5">
                          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_16rem]">
                            <div className="space-y-4">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                                  Line items
                                </p>
                                <div className="mt-2 space-y-3">
                                  {lines.length === 0 ? (
                                    <p className="text-sm text-muted">
                                      No line item details stored.
                                    </p>
                                  ) : (
                                    lines.map((line, idx) => (
                                      <div
                                        key={`${line.productId || "line"}-${idx}`}
                                        className="rounded-xl border border-border bg-white p-4"
                                      >
                                        <div className="flex items-start gap-3">
                                          <div className="relative h-14 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-[#faf9f7]">
                                            {line.imageUrl ? (
                                              // eslint-disable-next-line @next/next/no-img-element
                                              <img
                                                src={line.imageUrl}
                                                alt=""
                                                className="h-full w-full object-cover"
                                              />
                                            ) : null}
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-foreground">
                                              {line.productName ||
                                                `Item ${idx + 1}`}
                                            </p>
                                            <p className="mt-0.5 text-xs text-muted">
                                              {itemQty(line)} pcs
                                              {line.decoration?.method
                                                ? ` · ${line.decoration.method}`
                                                : ""}
                                              {line.decoration?.locations
                                                ?.length
                                                ? ` · ${line.decoration.locations.join(", ")}`
                                                : ""}
                                              {line.decoration?.colors
                                                ? ` · ${line.decoration.colors} ink color${line.decoration.colors === 1 ? "" : "s"}`
                                                : ""}
                                            </p>
                                            <ul className="mt-2 space-y-1 text-xs text-muted">
                                              {(line.variants || []).map(
                                                (variant) => (
                                                  <li
                                                    key={
                                                      variant.color?.name ||
                                                      "color"
                                                    }
                                                    className="flex flex-wrap items-center gap-2"
                                                  >
                                                    <span
                                                      className="inline-block h-3 w-3 rounded-full border border-black/10"
                                                      style={{
                                                        backgroundColor:
                                                          variant.color?.hex ||
                                                          "#ddd",
                                                      }}
                                                    />
                                                    <span className="font-medium text-foreground">
                                                      {variant.color?.name ||
                                                        "Color"}
                                                      :
                                                    </span>
                                                    <span>
                                                      {(variant.sizes || [])
                                                        .filter((s) => s.qty > 0)
                                                        .map(
                                                          (s) =>
                                                            `${s.size}×${s.qty}`,
                                                        )
                                                        .join(" · ") || "—"}
                                                    </span>
                                                  </li>
                                                ),
                                              )}
                                            </ul>
                                            {line.design?.notes && (
                                              <p className="mt-2 text-xs text-muted">
                                                Design notes: {line.design.notes}
                                              </p>
                                            )}
                                            {line.design?.artworkUrl && (
                                              <a
                                                href={line.design.artworkUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="mt-1 inline-block text-xs font-semibold text-accent-dark hover:underline"
                                              >
                                                View artwork →
                                              </a>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>

                              {item.specialInstructions && (
                                <div className="rounded-xl border border-border bg-white p-4">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                                    Special instructions
                                  </p>
                                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                                    {item.specialInstructions}
                                  </p>
                                </div>
                              )}
                            </div>

                            <aside className="space-y-3">
                              <div className="rounded-xl border border-border bg-white p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                                  Customer
                                </p>
                                <p className="mt-2 text-sm font-semibold text-foreground">
                                  {item.contact.name}
                                </p>
                                {item.contact.company && (
                                  <p className="text-sm text-muted">
                                    {item.contact.company}
                                  </p>
                                )}
                                <a
                                  href={`mailto:${item.contact.email}`}
                                  className="mt-2 block text-sm font-medium text-accent-dark hover:underline"
                                >
                                  {item.contact.email}
                                </a>
                                {item.contact.phone && (
                                  <a
                                    href={`tel:${item.contact.phone}`}
                                    className="mt-1 block text-sm text-muted hover:text-foreground"
                                  >
                                    {item.contact.phone}
                                  </a>
                                )}
                              </div>

                              <div className="rounded-xl border border-border bg-white p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                                  Delivery
                                </p>
                                <p className="mt-2 text-sm font-semibold capitalize text-foreground">
                                  {item.delivery?.speed || "—"}
                                </p>
                                {item.delivery?.needByDate && (
                                  <p className="mt-1 text-sm text-muted">
                                    Need by {item.delivery.needByDate}
                                  </p>
                                )}
                                {item.delivery?.notes && (
                                  <p className="mt-2 text-xs text-muted">
                                    {item.delivery.notes}
                                  </p>
                                )}
                              </div>

                              <div className="rounded-xl border border-border bg-white p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                                  Request ID
                                </p>
                                <p className="mt-2 break-all font-mono text-xs text-muted">
                                  {item.id}
                                </p>
                              </div>
                            </aside>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-14 text-center text-sm text-muted"
                  >
                    {items.length === 0
                      ? "No order requests yet. They’ll appear here when customers submit from the storefront."
                      : "No requests match this filter."}
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-14 text-center text-sm text-muted"
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
