"use client";

import { useEffect, useState } from "react";
import {
  API_URL,
  clearAdminKey,
  getAdminKey,
  setAdminKey,
} from "@/lib/api";
import {
  SettingsCard,
  settingsBtnPrimaryClass,
  settingsBtnSecondaryClass,
  settingsInputClass,
  settingsLabelClass,
} from "@/components/settings/SettingsShell";

export default function AdvancedSettingsPage() {
  const [key, setKey] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setKey(getAdminKey());
  }, []);

  return (
    <div className="space-y-4">
      <SettingsCard
        title="Connection"
        description="Where this admin talks to the Plus One Promo API."
      >
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">
              API URL
            </dt>
            <dd className="mt-1 break-all font-medium text-foreground">
              {API_URL}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">
              Authentication
            </dt>
            <dd className="mt-1 text-muted">
              Email magic-link / one-time code via Resend. Invite teammates under{" "}
              <span className="font-medium text-foreground">Team</span>.
            </dd>
          </div>
        </dl>
      </SettingsCard>

      <SettingsCard
        title="Emergency API key"
        description="Optional legacy fallback for scripts. Prefer signing in with your email for day-to-day use."
        footer={
          <>
            {saved && (
              <p className="mr-auto text-sm text-green-700">Saved locally.</p>
            )}
            <button
              type="button"
              onClick={() => {
                clearAdminKey();
                setKey("");
                setSaved(false);
              }}
              className={settingsBtnSecondaryClass}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                setAdminKey(key.trim());
                setSaved(true);
              }}
              className={settingsBtnPrimaryClass}
            >
              Save key
            </button>
          </>
        }
      >
        <label className={settingsLabelClass}>
          Admin API key
          <input
            type="password"
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
              setSaved(false);
            }}
            className={settingsInputClass}
            placeholder="Optional service key"
          />
        </label>
      </SettingsCard>
    </div>
  );
}
