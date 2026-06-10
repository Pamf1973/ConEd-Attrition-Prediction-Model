export async function summarizeResults(question, results, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  try {
    const res = await fetch("/api/summarize", {
      method: "POST",
      headers,
      body: JSON.stringify({
        question,
        count: results.length,
        sample: results.slice(0, 5).map(b => ({
          address: b.address,
          risk: b.risk,
          ll97_penalty_2024: b.ll97_penalty_2024,
          use: b.use,
        })),
      }),
    });
    if (!res.ok) return null;
    const { summary } = await res.json();
    return summary ?? null;
  } catch {
    return null;
  }
}

// Calls the backend proxy at /api/query — no API keys in frontend code
export async function queryBuildings(question, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch("/api/query", {
    method:  "POST",
    headers,
    body:    JSON.stringify({ question }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error ?? `Request failed (${res.status})`);
  }

  const { spec } = await res.json();
  return spec;
}

export function applyFilterSpec(buildings, spec) {
  let rows = [...buildings];

  if (spec.risk_min   != null) rows = rows.filter(b => b.risk >= spec.risk_min);
  if (spec.risk_max   != null) rows = rows.filter(b => b.risk <= spec.risk_max);
  if (spec.use        != null) rows = rows.filter(b => b.use === spec.use);
  if (spec.dob_jobs_min != null) rows = rows.filter(b => (b.dob_jobs ?? 0) >= spec.dob_jobs_min);
  if (spec.signal === "any")    rows = rows.filter(b => b.signal != null);
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
