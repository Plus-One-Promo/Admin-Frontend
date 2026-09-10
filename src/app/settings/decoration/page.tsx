"use client";

import { FormEvent, useEffect, useState } from "react";
import { fetchSiteSettings, saveDecorationSettings } from "@/lib/api";
import {
  SettingsCard,
  settingsBtnPrimaryClass,
  settingsBtnSecondaryClass,
  settingsInputClass,
  settingsLabelClass,
} from "@/components/settings/SettingsShell";
import { TagInput } from "@/components/settings/TagInput";

type MethodDraft = {
  id: string;
  label: string;
  askInkColors: boolean;
  locations: string[];
};

function toDraft(
  methods: Array<{
    id?: string;
    label?: string;
    askInkColors?: boolean;
    locations?: string[];
  }>,
): MethodDraft[] {
  return (methods || []).map((m, i) => ({
    id: m.id || `method-${i + 1}`,
    label: m.label || "",
    askInkColors: Boolean(m.askInkColors),
    locations: Array.isArray(m.locations) ? m.locations : [],
  }));
}

export default function DecorationSettingsPage() {
  const [methods, setMethods] = useState<MethodDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSiteSettings()
      .then((data) => {
        setMethods(toDraft(data.settings?.decorationMethods || []));
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
      const payload = methods
        .map((m) => ({
          id: m.id,
          label: m.label.trim(),
          askInkColors: m.askInkColors,
          locations: m.locations.map((l) => l.trim()).filter(Boolean),
        }))
        .filter((m) => m.label);
      if (!payload.length) {
        throw new Error("Add at least one decoration method");
      }
      const data = await saveDecorationSettings({
        decorationMethods: payload,
      });
      setMethods(toDraft(data.settings?.decorationMethods || payload));
      setMessage(
        data.message ||
          "Saved — products can choose from these methods and locations.",
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save decoration",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">Loading decoration…</p>;
  }

  return (
    <form onSubmit={onSave} className="space-y-4">
      <SettingsCard
        title="Print methods & locations"
        description="Define the decoration types you offer. On each product, choose which methods and locations are available."
        footer={
          <>
            {message && (
              <p className="mr-auto text-sm text-green-700">{message}</p>
            )}
            {error && <p className="mr-auto text-sm text-red-600">{error}</p>}
            <button
              type="button"
              onClick={() =>
                setMethods((prev) => [
                  ...prev,
                  {
                    id: `method-${Date.now().toString(36)}`,
                    label: "",
                    askInkColors: false,
                    locations: ["Front chest", "Full front", "Back"],
                  },
                ])
              }
              className={settingsBtnSecondaryClass}
            >
              Add method
            </button>
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
        <div className="space-y-3">
          {methods.length === 0 && (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
              No methods yet. Add screen print, embroidery, or anything you
              offer.
            </p>
          )}

          {methods.map((method, index) => (
            <article
              key={method.id}
              className="rounded-xl border border-border bg-[#faf9f7] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <label className={`${settingsLabelClass} min-w-[12rem] flex-1`}>
                  Method name
                  <input
                    value={method.label}
                    onChange={(e) =>
                      setMethods((prev) =>
                        prev.map((m, i) =>
                          i === index ? { ...m, label: e.target.value } : m,
                        ),
                      )
                    }
                    className={settingsInputClass}
                    placeholder="e.g. Screen Print"
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setMethods((prev) => prev.filter((_, i) => i !== index))
                  }
                  className="mt-7 text-xs font-medium text-muted transition hover:text-red-600"
                >
                  Remove
                </button>
              </div>

              <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={method.askInkColors}
                  onChange={(e) =>
                    setMethods((prev) =>
                      prev.map((m, i) =>
                        i === index
                          ? { ...m, askInkColors: e.target.checked }
                          : m,
                      ),
                    )
                  }
                  className="rounded border-border"
                />
                Ask customers for number of ink / print colors
              </label>

              <div className="mt-4">
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">
                    Locations
                  </p>
                  <p className="text-xs text-muted">
                    Press Enter to add · {method.locations.length} added
                  </p>
                </div>
                <TagInput
                  value={method.locations}
                  onChange={(locations) =>
                    setMethods((prev) =>
                      prev.map((m, i) =>
                        i === index ? { ...m, locations } : m,
                      ),
                    )
                  }
                  placeholder="e.g. Front chest"
                />
              </div>
            </article>
          ))}
        </div>
      </SettingsCard>
    </form>
  );
}
