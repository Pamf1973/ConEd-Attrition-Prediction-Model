// Detect if the question is asking for an explanation vs. a building filter.
//
// Strategy: be conservative — when ambiguous, default to FILTER.
// Explain only when question clearly asks for meaning, calculation, or description.

// Domain acronyms that contain no vowels but are still valid queries
const DOMAIN_ACRONYMS = /\b(ll97|gbm|bbl|hvac|dob|ghg|hdd|yoy|iqr|kbtu|eui|nyc|api)\b/i;

// Short conversational replies that mean nothing without context
const CONVERSATIONAL_REPLY = /^(yes|no|ok|okay|sure|nope|yep|yeah|nah|thanks|thank\s+you|got\s+it|i\s+see|alright|cool|great|fine|maybe|correct|right|wrong|exactly|yup|uh\s*huh|mm+|hmm+)\.?!?$/i;

// A valid query must have at least 3 meaningful chars and either:
//   - contain at least one vowel (real words), OR
//   - match a known domain acronym (LL97, GBM, BBL, etc.)
// Returns false for gibberish and for conversational one-word replies.
export function isValidQuery(q) {
  const t = q.trim().replace(/^[?!.,;]+|[?!.,;]+$/g, "");
  if (t.length < 3) return false;
  if (CONVERSATIONAL_REPLY.test(t)) return false;
  if (/[aeiou]/i.test(t)) return true;
  return DOMAIN_ACRONYMS.test(t);
}

export function isConversationalReply(q) {
  const t = q.trim().replace(/^[?!.,;]+|[?!.,;]+$/g, "");
  return CONVERSATIONAL_REPLY.test(t);
}

// Phrases that are clearly filter intent — override even if explain pattern matches
const FILTER_OVERRIDE = /^(what\s+buildings|which\s+buildings|how\s+many|how\s+much|find\s+|show\s+|list\s+|filter\s+|give\s+me\s+buildings|buildings\s+with|buildings\s+that|buildings\s+over|buildings\s+under)/i;

// "What IS X", "What ARE X", "How IS X calculated", "How DOES X work" — clearly definitional
const EXPLAIN_STARTS = /^(what\s+(is|are|does|do|'s|was)\s|how\s+(is|are|does|do|was|were)\s|why\s+(is|are|does|do)\s|explain\s+|tell\s+me\s+(about|what|how|why)|describe\s+|define\s+|help\s+me\s+(understand|with)|can\s+you\s+explain|what's\s+the\s+(difference|meaning|purpose|formula|definition))/i;

// Domain-specific explain signals anywhere in the question
const EXPLAIN_CONTAINS = /\b(formula|definition|meaning|explanation|overview|purpose|interpret|interpreting|difference\s+between|how\s+does\s+it\s+work|how\s+is\s+it\s+calculated|tell\s+me\s+about\s+the)\b/i;

export function isExplainQuery(question) {
  const q = question.trim();
  if (FILTER_OVERRIDE.test(q)) return false;
  return EXPLAIN_STARTS.test(q) || EXPLAIN_CONTAINS.test(q);
}

export async function explainDashboard(question, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch("/api/explain", {
    method: "POST",
    headers,
    body: JSON.stringify({ question }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error ?? `Explain failed (${res.status})`);
  }
  const { answer } = await res.json();
  return answer;
}

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
