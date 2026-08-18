import { useState, useEffect } from "react";
import { isCritical } from "./criticalFilter.js";

/**
 * Fetches current status for all Critical buildings, returns counts
 * for the M6 CriticalQueue subtraction math:
 *   criticalTotal − contacted − dismissed = toReview
 */
export function useStatusCounts(buildings, token) {
  const [counts, setCounts]   = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token || !buildings.length) return;

    const criticalBbls = buildings
      .filter(isCritical)
      .map((b) => {
        const raw = typeof b.bbl === "string" ? b.bbl.replace(/[^0-9]/g, "") : "";
        return /^[1-5]\d{9}$/.test(raw) ? raw : null;
      })
      .filter(Boolean);

    if (!criticalBbls.length) {
      setCounts({ contacted: 0, dismissed: 0, toReview: 0, total: 0 });
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch("/api/buildings/status/bulk", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bbls: criticalBbls }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((statusMap) => {
        if (cancelled) return;
        let contacted = 0, dismissed = 0;
        for (const { status } of Object.values(statusMap)) {
          if (status === "Contacted" || status === "In review" || status === "Confirmed at-risk") contacted++;
          else if (status === "Dismissed" || status === "False positive") dismissed++;
        }
        const total    = criticalBbls.length;
        const toReview = Math.max(0, total - contacted - dismissed);
        setCounts({ contacted, dismissed, toReview, total });
      })
      .catch(() => {
        if (!cancelled) setCounts(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [buildings, token]);

  return { counts, loading };
}
