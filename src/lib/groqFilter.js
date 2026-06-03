const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `You are a data query assistant for a ConEd steam customer attrition dashboard.
The user asks questions in plain English. You translate them into a JSON filter spec — nothing else.

AVAILABLE FIELDS on each building:
- risk (number 0–1): ML attrition probability. "high risk" = risk > 0.7, "medium" = 0.4–0.7, "low" = < 0.4
- use (string): building use type. Exact values: "Office", "Multifamily Housing", "Hotel", "K-12 School",
  "College/University", "Hospital (General Medical & Surgical)", "Retail Store", "Other"
- dob_jobs (integer): number of HVAC/boiler permit filings. "has permits" or "active" means dob_jobs >= 1
- signal (string or null): "big_drop" = confirmed ≥50% steam decline, "mod_drop" = moderate decline, null = no signal
- ll97_over_2024 (0 or 1): 1 = building is over its LL97 2024 carbon cap (non-compliant)
- ll97_penalty_2024 (integer USD): annual LL97 fine. 0 = compliant
- steam (number kBtu): annual steam demand. "large" > 50M kBtu, "small" < 5M kBtu
- cluster_name (string): one of:
    "Post-War Multifamily — LL97 Pressure"
    "Pre-War Stable — Low Signal"
    "Large Commercial — Capital Mobilized"
    "Mid-Century Residential — Quiet Attrition"
    "Small Commercial — Neighborhood Contagion"
- address (string): building address. Use for partial text search.
- yr (integer): year built. "pre-war" = yr < 1940, "post-war" = yr >= 1940 && yr < 1980
- peer_score (number 0–1): fraction of nearby buildings also showing attrition signals

FILTER SPEC (return ONLY valid JSON, no explanation text, no markdown):
{
  "risk_min": null,         // number or null
  "risk_max": null,         // number or null
  "use": null,              // exact string match or null
  "dob_jobs_min": null,     // integer or null
  "signal": null,           // "big_drop" | "mod_drop" | "any" | null
  "ll97_over_2024": null,   // true | false | null
  "ll97_penalty_min": null, // integer USD or null
  "steam_min": null,        // kBtu or null
  "steam_max": null,        // kBtu or null
  "cluster_name": null,     // exact cluster name or null
  "address_search": null,   // partial string search or null
  "yr_max": null,           // integer or null
  "yr_min": null,           // integer or null
  "sort_by": "risk",        // field to sort by: "risk" | "ll97_penalty_2024" | "steam" | "dob_jobs"
  "sort_dir": "desc",       // "asc" | "desc"
  "explanation": ""         // one plain-English sentence describing what was filtered
}`;

export async function queryBuildings(question, apiKey) {
  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      max_tokens: 512,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: question },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const raw  = data.choices?.[0]?.message?.content ?? "";

  // Strip markdown code fences if model wraps response
  const cleaned = raw.replace(/```(?:json)?\n?/g, "").replace(/```/g, "").trim();
  const spec = JSON.parse(cleaned);
  return spec;
}

export function applyFilterSpec(buildings, spec) {
  let rows = [...buildings];

  if (spec.risk_min   != null) rows = rows.filter(b => b.risk >= spec.risk_min);
  if (spec.risk_max   != null) rows = rows.filter(b => b.risk <= spec.risk_max);
  if (spec.use        != null) rows = rows.filter(b => b.use === spec.use);
  if (spec.dob_jobs_min != null) rows = rows.filter(b => (b.dob_jobs ?? 0) >= spec.dob_jobs_min);
  if (spec.signal === "any")   rows = rows.filter(b => b.signal != null);
  else if (spec.signal != null) rows = rows.filter(b => b.signal === spec.signal);
  if (spec.ll97_over_2024 === true)  rows = rows.filter(b => b.ll97_over_2024 === 1);
  if (spec.ll97_over_2024 === false) rows = rows.filter(b => b.ll97_over_2024 === 0);
  if (spec.ll97_penalty_min != null) rows = rows.filter(b => (b.ll97_penalty_2024 ?? 0) >= spec.ll97_penalty_min);
  if (spec.steam_min  != null) rows = rows.filter(b => b.steam >= spec.steam_min);
  if (spec.steam_max  != null) rows = rows.filter(b => b.steam <= spec.steam_max);
  if (spec.cluster_name != null) rows = rows.filter(b => b.cluster_name === spec.cluster_name);
  if (spec.yr_min     != null) rows = rows.filter(b => b.yr >= spec.yr_min);
  if (spec.yr_max     != null) rows = rows.filter(b => b.yr <= spec.yr_max);
  if (spec.address_search != null) {
    const q = spec.address_search.toLowerCase();
    rows = rows.filter(b => b.address?.toLowerCase().includes(q));
  }

  const key = spec.sort_by ?? "risk";
  const dir = spec.sort_dir === "asc" ? 1 : -1;
  rows.sort((a, b) => {
    const av = a[key] ?? -Infinity;
    const bv = b[key] ?? -Infinity;
    return av < bv ? dir : av > bv ? -dir : 0;
  });

  return rows;
}
