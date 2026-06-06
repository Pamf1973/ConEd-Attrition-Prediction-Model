import { useState, useEffect } from "react";

export function estimateScClass(useType, steamKbtu, dobJobs) {
  const steam = steamKbtu || 0;
  const jobs = parseInt(dobJobs || 0, 10);
  const use = (useType || "").trim();

  // SC-3: Residential multifamily (>=50% residential, >=3 units per tariff definition)
  if (["Multifamily", "Apartment", "Residence Hall", "Dormitory"].some(x => use.includes(x))) {
    return "SC-3* (Residential)";
  }

  // SC-5 candidates: large buildings with active boiler permit activity
  // Indicator: steam > 50M kBtu AND >=2 DOB HVAC/boiler job filings
  if (steam > 50000000 && jobs >= 2) {
    return "SC-5* (Negotiated — est.)";
  }

  // SC-4 candidates: dual-supply / backup indicators
  // Indicator: any DOB boiler filings + meaningful steam demand
  if (jobs >= 1 && steam > 5000000) {
    return "SC-4* (Dual-Supply — est.)";
  }

  // SC-1: small users — low steam demand or small-format use types
  if (steam < 5000000 || ["Retail Store", "Other"].includes(use)) {
    return "SC-1* (Small Commercial)";
  }

  // SC-2: large commercial / institutional (year-round demand, no backup signals)
  return "SC-2* (Annual Power)";
}

export function useBuildings(token) {
  const [buildings,  setBuildings]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  useEffect(() => {
    if (!token) {
      const t = setTimeout(() => {
        setBuildings([]);
        setLoading(false);
        setError(null);
      }, 0);
      return () => clearTimeout(t);
    }

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const headers = { Authorization: `Bearer ${token}` };

        const bldgRes = await fetch("/api/data/buildings", { headers });
        if (bldgRes.status === 401) throw new Error("UNAUTHORIZED");
        if (!bldgRes.ok) throw new Error(`buildings data: HTTP ${bldgRes.status}`);
        const bldgs = await bldgRes.json();

        // Enrichment is optional — degrade gracefully if it fails
        let enrich = {};
        try {
          const enrichRes = await fetch("/api/data/enrichment", { headers });
          if (enrichRes.status === 401) throw new Error("UNAUTHORIZED");
          if (enrichRes.ok) enrich = await enrichRes.json();
        } catch (err) {
          if (err.message === "UNAUTHORIZED") throw err;
          console.warn("buildingEnrichment.json failed to load — continuing without enrichment");
        }

        if (cancelled) return;

        // yearly.json is optional — year-over-year steam trend (steam_2022/2023/2024)
        let yearly = {};
        try {
          const yearlyRes = await fetch("/api/data/yearly", { headers });
          if (yearlyRes.status === 401) throw new Error("UNAUTHORIZED");
          if (yearlyRes.ok) yearly = await yearlyRes.json();
        } catch (err) {
          if (err.message === "UNAUTHORIZED") throw err;
          console.warn("yearly.json failed to load");
        }

        if (cancelled) return;

        // Enrichment keys are uppercased by ll97_model.py / kmeans_model.py
        const merged = bldgs.map(b => {
          const key = b.address?.toUpperCase();
          const e = enrich[key] ?? {};
          const y = yearly[key] ?? {};
          const has_ml_risk = e.ml_risk != null;
          const risk   = has_ml_risk ? e.ml_risk : b.risk;
          const signal = e.signal || null;
          const dobJobs = e.dob_jobs || 0;
          const sc_class = estimateScClass(b.use, b.steam, dobJobs);
          return { ...b, ...e, ...y, risk, has_ml_risk, signal, sc_class };
        });
        setBuildings(merged);
      } catch (err) {
        if (!cancelled) setError(err.message ?? "Failed to load building data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [token]);

  return { buildings, loading, error };
}

// Derive risk tier label and color from risk score (0–1)
export function riskTier(score) {
  if (!Number.isFinite(score)) return { label: "Unknown", color: "#64748b", bg: "#1e293b" };
  const s = Math.max(0, Math.min(1, score));
  if (s > 0.7) return { label: "High",   color: "#ef4444", bg: "#450a0a" };
  if (s > 0.4) return { label: "Medium", color: "#f97316", bg: "#431407" };
  return               { label: "Low",   color: "#22c55e", bg: "#052e16" };
}

// Signal label + color from enrichment signal field
export function signalMeta(signal) {
  if (signal === "big_drop") return { label: "⚠ Big Drop", color: "#00d4dc" };
  if (signal === "mod_drop") return { label: "↓ Mod Drop", color: "#ffa500" };
  return                            { label: "—",          color: "#475569" };
}

// Building has no supervised ML score — only the legacy heuristic is available
export function isUncertain(building) {
  return building.has_ml_risk === false;
}

// Recommended action based on risk score + signal
export function recommendedAction(score, signal) {
  if (!Number.isFinite(score)) return { label: "Insufficient Data", color: "#64748b", bg: "#1e293b" };
  if (score > 0.7 || signal === "big_drop")
    return { label: "Outreach Now", color: "#ef4444", bg: "#450a0a" };
  if (score > 0.4 || signal === "mod_drop")
    return { label: "Monitor",      color: "#f97316", bg: "#431407" };
  return   { label: "Low Priority", color: "#64748b", bg: "#1e293b" };
}
