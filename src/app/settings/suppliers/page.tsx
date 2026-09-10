"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  clearSsCredentials,
  fetchSsCredentials,
  saveSsCredentials,
  testSsCredentials,
} from "@/lib/api";
import {
  SettingsCard,
  settingsBtnPrimaryClass,
  settingsBtnSecondaryClass,
  settingsInputClass,
  settingsLabelClass,
} from "@/components/settings/SettingsShell";

export default function SuppliersSettingsPage() {
  const [accountNumber, setAccountNumber] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [ssMeta, setSsMeta] = useState<{
    configured: boolean;
    source: string | null;
    apiKeyMasked: string;
    updatedAt: string | null;
    updatedBy: string | null;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSsCredentials()
      .then((data) => {
        setSsMeta({
          configured: Boolean(data.configured),
          source: data.source || null,
          apiKeyMasked: data.apiKeyMasked || "",
          updatedAt: data.updatedAt || null,
          updatedBy: data.updatedBy || null,
        });
        if (data.accountNumber) setAccountNumber(data.accountNumber);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const data = await saveSsCredentials({
        accountNumber: accountNumber.trim(),
        apiKey: apiKey.trim(),
      });
      setSsMeta({
        configured: true,
        source: "settings",
        apiKeyMasked: data.apiKeyMasked || "",
        updatedAt: data.updatedAt || null,
        updatedBy: data.updatedBy || null,
      });
      setApiKey("");
      setMessage(data.message || "S&S credentials saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  async function onTest() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const payload =
        accountNumber.trim() && apiKey.trim()
          ? {
              accountNumber: accountNumber.trim(),
              apiKey: apiKey.trim(),
            }
          : undefined;
      const data = await testSsCredentials(payload);
      setMessage(data.message || "Connection OK");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Test failed");
    } finally {
      setBusy(false);
    }
  }

  async function onClear() {
    if (!confirm("Remove saved S&S credentials from the admin?")) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const data = await clearSsCredentials();
      setSsMeta({
        configured: Boolean(data.configured),
        source: data.source || null,
        apiKeyMasked: "",
        updatedAt: null,
        updatedBy: null,
      });
      setApiKey("");
      if (!data.configured) setAccountNumber("");
      setMessage(data.message || "Cleared");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clear failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">Loading suppliers…</p>;
  }

  return (
    <form onSubmit={onSave}>
      <SettingsCard
        title="S&S Activewear"
        description="Connect your S&S account so the team can search styles and import products. Credentials are shared across this admin."
        footer={
          <>
            {message && (
              <p className="mr-auto text-sm text-green-700">{message}</p>
            )}
            {error && <p className="mr-auto text-sm text-red-600">{error}</p>}
            {ssMeta?.source === "settings" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void onClear()}
                className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Remove key
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => void onTest()}
              className={settingsBtnSecondaryClass}
            >
              Test connection
            </button>
            <button
              type="submit"
              disabled={busy || !accountNumber.trim() || !apiKey.trim()}
              className={settingsBtnPrimaryClass}
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </>
        }
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            {ssMeta?.configured ? (
              <span className="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
                Connected
              </span>
            ) : (
              <span className="inline-flex rounded-full bg-[#f2e9db] px-2.5 py-1 text-xs font-semibold text-muted">
                Not connected
              </span>
            )}
            {ssMeta?.configured && (
              <p className="mt-2 text-xs text-muted">
                Source:{" "}
                {ssMeta.source === "settings" ? "team settings" : "server env"}
                {ssMeta.apiKeyMasked ? ` · ${ssMeta.apiKeyMasked}` : ""}
                {ssMeta.updatedBy ? ` · ${ssMeta.updatedBy}` : ""}
              </p>
            )}
          </div>
          <Link
            href="/products/new?source=ss"
            className="text-sm font-medium text-accent-dark hover:underline"
          >
            Add product from S&S →
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={settingsLabelClass}>
            Account number
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              className={settingsInputClass}
              placeholder="S&S account #"
              autoComplete="off"
            />
          </label>
          <label className={settingsLabelClass}>
            API key
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className={settingsInputClass}
              placeholder={
                ssMeta?.apiKeyMasked
                  ? `Saved: ${ssMeta.apiKeyMasked}`
                  : "Paste S&S API key"
              }
              autoComplete="off"
            />
          </label>
        </div>
      </SettingsCard>
    </form>
  );
}
