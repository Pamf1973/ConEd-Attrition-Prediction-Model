import { useState, useEffect } from "react";

export function useBuildings() {
  const [buildings,  setBuildings]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const bldgRes = await fetch("/buildings.json");
        if (!bldgRes.ok) throw new Error(`buildings.json: HTTP ${bldgRes.status}`);
        const bldgs = await bldgRes.json();

        // Enrichment is optional — degrade gracefully if it fails
        let enrich = {};
        try {
          const enrichRes = await fetch("/buildingEnrichment.json");
          if (enrichRes.ok) enrich = await enrichRes.json();
        } catch {
          console.warn("buildingEnrichment.json failed to load — continuing without enrichment");
        }

        if (cancelled) return;

        // Enrichment keys are uppercased by kmeans_model.py — normalize join key
        const merged = bldgs.map(b => ({ ...b, ...(enrich[b.address?.toUpperCase()] ?? {}) }));
        setBuildings(merged);
      } catch (err) {
        if (!cancelled) setError(err.message ?? "Failed to load building data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { buildings, loading, error };
}

// Derive risk tier label and color from risk score (0–1)
export function riskTier(score) {
  if (!Number.isFinite(score)) return { label: "Unknown", color: "#64748b", bg: "#1e293b" };
  if (score > 0.7) return { label: "High",   color: "#ef4444", bg: "#450a0a" };
  if (score > 0.4) return { label: "Medium", color: "#f97316", bg: "#431407" };
  return                  { label: "Low",    color: "#22c55e", bg: "#052e16" };
}

// Signal label + color from enrichment signal field
export function signalMeta(signal) {
  if (signal === "big_drop") return { label: "⚠ Big Drop", color: "#00d4dc" };
  if (signal === "mod_drop") return { label: "↓ Mod Drop", color: "#ffa500" };
  return                            { label: "—",          color: "#475569" };
}

// Recommended action based on risk score + signal
export function recommendedAction(score, signal) {
  if (!Number.isFinite(score)) return { label: "Insufficient Data", color: "#64748b", bg: "#1e293b" };
  if (score > 0.7 || signal === "big_drop")
    return { label: "Outreach Now", color: "#ef4444", bg: "#450a0a" };
  if (score > 0.5 || signal === "mod_drop")
    return { label: "Monitor",      color: "#f97316", bg: "#431407" };
  return   { label: "Low Priority", color: "#64748b", bg: "#1e293b" };
}
