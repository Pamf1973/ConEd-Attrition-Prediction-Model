// Shared utility functions — imported by server.js and test files.
// Keep this module free of side effects and Node-only globals.

export const ALLOWED_SORT_BY  = ["risk", "ll97_penalty_2024", "steam", "dob_jobs"];
export const ALLOWED_SORT_DIR = ["asc", "desc"];
export const ALLOWED_SIGNALS  = ["big_drop", "mod_drop", "any", null];
export const ALLOWED_USES     = [
  "Office", "Multifamily Housing", "Hotel", "K-12 School",
  "College/University", "Hospital (General Medical & Surgical)",
  "Retail Store", "Other", null,
];
export const ALLOWED_CLUSTERS = [
  "Pre-War Active — Permit-Driven Churn",
  "Mid-Size Post-War — Moderate Signal",
  "Pre-War Stable — Low Signal",
  "Large Commercial — Capital Mobilized",
  "Low-Compliance Commercial — Quiet Attrition",
  null,
];

// Escape a value for a CSV cell.
// Finite numbers are emitted as-is; all other values are double-quoted with
// internal quotes doubled and =+−@ prefixed to block spreadsheet formula injection.
export function csvCell(v) {
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  const s = String(v ?? "").replace(/"/g, '""');
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe}"`;
}

// Returns true for transient/quota errors that warrant trying the next provider.
// Auth (401) and client validation (400 without credit language) are NOT retryable.
export function _isRetryable(msg) {
  return msg.includes("402") || msg.includes("429") || msg.includes("credit balance") ||
         /\b5\d{2}\b/.test(msg);
}

export function validateSpec(raw) {
  const numOrNull = (v, min = -Infinity, max = Infinity) => {
    if (v == null) return null;
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return Math.min(max, Math.max(min, n));
  };
  const oneOf = (v, allowed) => allowed.includes(v) ? v : null;

  return {
    risk_min:         numOrNull(raw.risk_min, 0, 1),
    risk_max:         numOrNull(raw.risk_max, 0, 1),
    use:              oneOf(raw.use, ALLOWED_USES),
    dob_jobs_min:     numOrNull(raw.dob_jobs_min, 0, 1000),
    signal:           oneOf(raw.signal, ALLOWED_SIGNALS),
    ll97_over_2024:   (raw.ll97_over_2024 === true || raw.ll97_over_2024 === 1) ? true : (raw.ll97_over_2024 === false || raw.ll97_over_2024 === 0) ? false : null,
    ll97_penalty_min: numOrNull(raw.ll97_penalty_min, 0, 1e9),
    steam_min:        numOrNull(raw.steam_min, 0, 1e12),
    steam_max:        numOrNull(raw.steam_max, 0, 1e12),
    cluster_name:     oneOf(raw.cluster_name, ALLOWED_CLUSTERS),
    address_search:   typeof raw.address_search === "string" ? raw.address_search.slice(0, 100) : null,
    yr_min:           numOrNull(raw.yr_min, 1800, 2030),
    yr_max:           numOrNull(raw.yr_max, 1800, 2030),
    sort_by:          ALLOWED_SORT_BY.includes(raw.sort_by) ? raw.sort_by : "risk",
    sort_dir:         ALLOWED_SORT_DIR.includes(raw.sort_dir) ? raw.sort_dir : "desc",
    explanation:      typeof raw.explanation === "string" ? raw.explanation.slice(0, 200) : "",
  };
}
