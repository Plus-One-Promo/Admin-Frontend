"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { fetchUsers, inviteUser, removeUser } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  SettingsCard,
  settingsBtnPrimaryClass,
  settingsBtnSecondaryClass,
  settingsInputClass,
  settingsLabelClass,
} from "@/components/settings/SettingsShell";

type AllowedUser = {
  id: string;
  email: string;
  name?: string | null;
  role?: string;
  status?: string;
  invitedAt?: string | null;
  invitedBy?: string | null;
  createdAt?: string | null;
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

function initials(name: string | null | undefined, email: string) {
  const source = (name || email.split("@")[0] || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function statusTone(status?: string) {
  switch ((status || "allowed").toLowerCase()) {
    case "invited":
      return "bg-amber-50 text-amber-900 ring-amber-100";
    case "active":
    case "allowed":
      return "bg-emerald-50 text-emerald-800 ring-emerald-100";
    case "disabled":
    case "revoked":
      return "bg-[#f3f1ed] text-muted ring-border";
    default:
      return "bg-[#f3f1ed] text-muted ring-border";
  }
}

function statusLabel(status?: string) {
  const value = (status || "allowed").replace(/_/g, " ");
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AllowedUser[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "viewer">("admin");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchUsers();
      const list = (data.users || []) as AllowedUser[];
      // Guard against duplicate allowlist rows for the same email.
      const byEmail = new Map<string, AllowedUser>();
      for (const entry of list) {
        const key = String(entry.email || "")
          .trim()
          .toLowerCase();
        if (!key) continue;
        const prev = byEmail.get(key);
        if (!prev) {
          byEmail.set(key, entry);
          continue;
        }
        const prevTime = new Date(
          prev.invitedAt || prev.createdAt || 0,
        ).getTime();
        const nextTime = new Date(
          entry.invitedAt || entry.createdAt || 0,
        ).getTime();
        if (nextTime >= prevTime) byEmail.set(key, entry);
      }
      setUsers([...byEmail.values()]);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const hay = [u.name, u.email, u.role, u.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [users, query]);

  async function onInvite(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const data = await inviteUser({
        email: email.trim(),
        name: name.trim() || undefined,
        role,
      });
      setMessage(data.message || `Invite sent to ${email}`);
      setEmail("");
      setName("");
      setRole("admin");
      setShowInvite(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(id: string, targetEmail: string) {
    if (!confirm(`Remove ${targetEmail} from admin access?`)) return;
    setRemovingId(id);
    setError(null);
    try {
      await removeUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Team
          </h1>
          <p className="mt-1 text-sm text-muted">
            {loading
              ? "Loading…"
              : `${users.length} staff member${users.length === 1 ? "" : "s"} · only allowlisted emails can sign in`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowInvite((v) => !v);
            setMessage(null);
            setError(null);
          }}
          className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-white transition hover:bg-foreground/90"
        >
          {showInvite ? "Close" : "Invite staff"}
        </button>
      </div>

      {message && (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {showInvite && (
        <form onSubmit={onInvite} className="mt-5">
          <SettingsCard
            title="Invite staff member"
            description="They’ll get a magic-link email via Resend and can sign into this admin."
            footer={
              <>
                <button
                  type="button"
                  onClick={() => {
                    setShowInvite(false);
                    setEmail("");
                    setName("");
                    setRole("admin");
                  }}
                  className={settingsBtnSecondaryClass}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy || !email.trim()}
                  className={settingsBtnPrimaryClass}
                >
                  {busy ? "Sending…" : "Send invite"}
                </button>
              </>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={`${settingsLabelClass} sm:col-span-2`}>
                Email
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={settingsInputClass}
                  placeholder="teammate@company.com"
                />
              </label>
              <label className={settingsLabelClass}>
                Name
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={settingsInputClass}
                  placeholder="Optional"
                />
              </label>
              <label className={settingsLabelClass}>
                Role
                <select
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value as "admin" | "viewer")
                  }
                  className={settingsInputClass}
                >
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
              </label>
            </div>
          </SettingsCard>
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
              placeholder="Search team"
              className="w-full rounded-lg border border-border bg-[#faf9f7] py-2 pl-9 pr-3 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/25"
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-semibold text-muted">
                <th className="px-4 py-3 sm:px-5">Staff</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Role</th>
                <th className="hidden px-4 py-3 sm:table-cell">Invited</th>
                <th className="w-12 px-4 py-3 sm:px-5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const isYou = u.email === user?.email;
                const displayName = u.name || u.email.split("@")[0];
                return (
                  <tr
                    key={u.id}
                    className="border-b border-border last:border-0 transition hover:bg-[#faf9f7]"
                  >
                    <td className="px-4 py-3 sm:px-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-semibold text-accent-dark">
                          {initials(u.name, u.email)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">
                            {displayName}
                            {isYou ? (
                              <span className="ml-2 text-xs font-medium text-muted">
                                (you)
                              </span>
                            ) : null}
                          </p>
                          <p className="truncate text-xs text-muted">
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${statusTone(
                          u.status,
                        )}`}
                      >
                        {statusLabel(u.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 capitalize text-foreground">
                      {u.role || "admin"}
                    </td>
                    <td className="hidden px-4 py-3 text-muted sm:table-cell">
                      <p className="text-sm">
                        {formatDate(u.invitedAt || u.createdAt)}
                      </p>
                      {u.invitedBy ? (
                        <p className="text-xs text-muted">by {u.invitedBy}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right sm:px-5">
                      {!isYou ? (
                        <button
                          type="button"
                          disabled={removingId === u.id}
                          onClick={() => void onRemove(u.id, u.email)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                          aria-label={`Remove ${u.email}`}
                          title="Remove"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      ) : (
                        <span className="inline-block h-8 w-8" />
                      )}
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
                    {users.length === 0
                      ? "No staff yet. Invite a teammate to get started."
                      : "No staff match your search."}
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
    </div>
  );
}
