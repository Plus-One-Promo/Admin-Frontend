"use client";

import { FormEvent, useEffect, useState } from "react";
import { fetchSiteSettings, savePricingSettings } from "@/lib/api";
import {
  SettingsCard,
  settingsBtnPrimaryClass,
  settingsInputClass,
  settingsLabelClass,
} from "@/components/settings/SettingsShell";

export default function PricingSettingsPage() {
  const [markupPercent, setMarkupPercent] = useState("0");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSiteSettings()
      .then((data) => {
        setMarkupPercent(String(data.settings?.defaultMarkupPercent ?? 0));
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
      const value = Number(markupPercent);
      if (!Number.isFinite(value) || value < 0) {
        throw new Error("Enter a valid markup percentage (0 or higher)");
      }
      const data = await savePricingSettings({
        defaultMarkupPercent: value,
      });
      setMarkupPercent(String(data.settings?.defaultMarkupPercent ?? value));
      setMessage(
        data.message ||
          `Saved — new S&S imports will use ${value}% markup on blank cost.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save markup");
    } finally {
      setBusy(false);
    }
  }

  const markupPreviewCost = 10;
  const markupValue = Number(markupPercent);
  const markupPreviewPrice =
    Number.isFinite(markupValue) && markupValue >= 0
      ? Math.round(markupPreviewCost * (1 + markupValue / 100) * 100) / 100
      : null;

  if (loading) {
    return <p className="text-sm text-muted">Loading pricing…</p>;
  }

  return (
    <form onSubmit={onSave}>
      <SettingsCard
        title="Default product markup"
        description="Applied to blank garment cost when importing from S&S. You can still override any product's showcase price on the edit screen."
        footer={
          <>
            {message && (
              <p className="mr-auto text-sm text-green-700">{message}</p>
            )}
            {error && <p className="mr-auto text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className={settingsBtnPrimaryClass}
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </>
        }
      >
        <label className={settingsLabelClass}>
          Markup percentage
          <div className="mt-1.5 flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={1000}
              step={0.1}
              value={markupPercent}
              onChange={(e) => setMarkupPercent(e.target.value)}
              className={`${settingsInputClass} mt-0 w-28`}
            />
            <span className="text-sm text-muted">%</span>
          </div>
        </label>

        {markupPreviewPrice != null && (
          <div className="mt-5 rounded-xl bg-[#faf9f7] px-4 py-3 text-sm text-muted">
            Example: ${markupPreviewCost.toFixed(2)} blank →{" "}
            <span className="font-semibold text-foreground">
              ${markupPreviewPrice.toFixed(2)}
            </span>{" "}
            showcase price
          </div>
        )}
      </SettingsCard>
    </form>
  );
}
