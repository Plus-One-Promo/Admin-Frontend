"use client";

import { useEffect, useState } from "react";
import { fetchSiteSettings } from "@/lib/api";
import {
  ApparelNavSettings,
  megaMenuToDraft,
  type NavColumnDraft,
} from "@/components/ApparelNavSettings";

export default function NavigationSettingsPage() {
  const [navColumns, setNavColumns] = useState<NavColumnDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSiteSettings()
      .then((data) => {
        setNavColumns(
          megaMenuToDraft(data.settings?.apparelMegaMenu || { columns: [] }),
        );
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-muted">Loading apparel menu…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return <ApparelNavSettings initialColumns={navColumns} />;
}
