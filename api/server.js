/* global process */
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { readFileSync } from "fs";
import { resolve } from "path";
import { randomBytes, timingSafeEqual } from "crypto";

import dotenv from "dotenv";

// Keep track of inherited keys before dotenv overrides them
const originalAnthropicKey = process.env.ANTHROPIC_API_KEY;
const originalGroqKey = process.env.GROQ_API_KEY;

// Load .env explicitly so it overrides any inherited shell env vars
// (important when running inside Claude Code which sets ANTHROPIC_API_KEY)
dotenv.config({ override: true, quiet: true });

// Helper to identify if a key is a template placeholder (e.g. from .env.example)
const isPlaceholder = (key) => {
  if (!key) return true;
  return key === "sk-ant-..." || key.startsWith("sk-ant-...") || key === "gsk_..." || key.startsWith("gsk_...");
};

// If dotenv overrode with placeholders, restore the original inherited keys
if (isPlaceholder(process.env.ANTHROPIC_API_KEY)) {
  if (originalAnthropicKey && !isPlaceholder(originalAnthropicKey)) {
    process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
  } else {
    delete process.env.ANTHROPIC_API_KEY;
  }
}
if (isPlaceholder(process.env.GROQ_API_KEY)) {
  if (originalGroqKey && !isPlaceholder(originalGroqKey)) {
    process.env.GROQ_API_KEY = originalGroqKey;
  } else {
    delete process.env.GROQ_API_KEY;
  }
}

const app  = express();
const PORT = process.env.API_PORT ?? 3001;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'"],
      styleSrc:    ["'self'", "'unsafe-inline'"],
      imgSrc:      ["'self'", "data:"],
      connectSrc:  ["'self'"],
      frameSrc:    ["'none'"],
      objectSrc:   ["'none'"],
    },
  },
  frameguard: { action: "deny" },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));

// trust proxy only when behind a real reverse proxy (nginx in prod)
// Do NOT set "trust proxy" in dev — X-Forwarded-For would be client-controlled
// and would allow rate limit bypass by spoofing different IPs per request.
// In production: set to the specific nginx IP, e.g. app.set("trust proxy", "loopback")
app.use(express.json({ limit: "16kb" }));
app.use((err, req, res, next) => {
  if (err.status === 413 || err.type === "entity.too.large")
    return res.status(413).json({ error: "Request too large — max 16kb" });
  if (err.type === "entity.parse.failed" || err instanceof SyntaxError)
    return res.status(400).json({ error: "Invalid JSON in request body" });
  next(err);
});

// Rate limit: 100 queries / minute per IP (raised from 30 — concurrent SPA fetches exhaust 30 quickly)
const limiter = rateLimit({
  windowMs: 60_000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests — try again in a minute" },
});
app.use("/api", limiter);

const aiLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "AI query rate limit — max 20 per minute" },
});

// ── Authentication & Sessions ──────────────────────────────────────────────────
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD;
if (!DASHBOARD_PASSWORD) {
  throw new Error("FATAL: DASHBOARD_PASSWORD must be set in .env");
}

const activeSessions = new Map(); // token → expiresAt
const SESSION_TTL  = 8 * 60 * 60 * 1000; // 8 hours
const MAX_SESSIONS = 10_000; // cap to prevent OOM from session flood attacks

// Sweep expired sessions hourly; if still over cap, evict oldest entries (FIFO)
setInterval(() => {
  const now = Date.now();
  for (const [token, expiresAt] of activeSessions) {
    if (expiresAt < now) activeSessions.delete(token);
  }
  // Secondary cap: evict oldest entries if still over limit after TTL sweep
  if (activeSessions.size > MAX_SESSIONS) {
    const overflow = activeSessions.size - MAX_SESSIONS;
    let evicted = 0;
    for (const token of activeSessions.keys()) {
      activeSessions.delete(token);
      if (++evicted >= overflow) break;
    }
  }
}, 60 * 60 * 1000).unref();

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized — missing token" });
  }
  const token = authHeader.substring(7);
  const expiresAt = activeSessions.get(token);
  if (!expiresAt || expiresAt < Date.now()) {
    activeSessions.delete(token); // clean up if expired
    return res.status(401).json({ error: "Unauthorized — invalid or expired session" });
  }
  req.sessionToken = token;
  next();
}

// ── Auth Endpoints ────────────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts — try again in 15 minutes" },
});

app.post("/api/auth/login", loginLimiter, (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: "Password is required" });
  }
  const pwdBuf  = Buffer.from(password);
  const hashBuf = Buffer.from(DASHBOARD_PASSWORD);
  const match   = pwdBuf.length === hashBuf.length &&
                  timingSafeEqual(pwdBuf, hashBuf);
  if (match) {
    // Enforce hard cap inline: if at limit, reject new sessions immediately
    if (activeSessions.size >= MAX_SESSIONS) {
      return res.status(503).json({ error: "Server at session capacity — try again later" });
    }
    const token = randomBytes(32).toString("hex");
    activeSessions.set(token, Date.now() + SESSION_TTL);
    return res.json({ token });
  }
  return res.status(401).json({ error: "Invalid password" });
});

app.post("/api/auth/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    activeSessions.delete(token);
  }
  res.json({ ok: true });
});

app.get("/api/auth/check", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const expiresAt = activeSessions.get(token);
    if (expiresAt && expiresAt > Date.now()) {
      return res.json({ valid: true });
    }
    activeSessions.delete(token); // clean up
  }
  res.json({ valid: false });
});

// Preload JSON files at startup — avoids blocking readFileSync on every request
function loadJsonFile(filename) {
  try {
    return readFileSync(resolve(process.cwd(), "public", filename), "utf8");
  } catch {
    return readFileSync(resolve(process.cwd(), "dist", filename), "utf8");
  }
}
const DATA_CACHE = {
  buildings:  loadJsonFile("buildings.json"),
  enrichment: loadJsonFile("buildingEnrichment.json"),
  yearly:     loadJsonFile("yearly.json"),
  yoyDeltas:  loadJsonFile("yoy_deltas.json"),
};

// Parsed versions used by endpoints that need to iterate over the data (e.g. CSV export)
const DATA_PARSED = {
  buildings:  JSON.parse(DATA_CACHE.buildings),
  enrichment: JSON.parse(DATA_CACHE.enrichment),
};

// ── Protected Data Endpoints ──────────────────────────────────────────────────
app.get("/api/data/buildings",   requireAuth, (_req, res) => res.type("json").send(DATA_CACHE.buildings));
app.get("/api/data/enrichment",  requireAuth, (_req, res) => res.type("json").send(DATA_CACHE.enrichment));
app.get("/api/data/yearly",      requireAuth, (_req, res) => res.type("json").send(DATA_CACHE.yearly));
app.get("/api/data/yoy-deltas",  requireAuth, (_req, res) => res.type("json").send(DATA_CACHE.yoyDeltas));

// GET /api/buildings — server-side filtered + paginated building query
app.get("/api/buildings", requireAuth, (req, res) => {
  const {
    risk_min, risk_max, use, signal, ll97_over,
    cluster_name, sort_by = "risk", sort_dir = "desc",
    page = "1", per_page = "50", search,
  } = req.query;

  // Merge buildings with enrichment (same logic as client useBuildings)
  let rows = DATA_PARSED.buildings.map(b => {
    const key = b.address?.toUpperCase();
    const e = DATA_PARSED.enrichment?.[key] ?? {};
    return { ...b, ...e, risk: e.ml_risk ?? b.risk };
  });

  // Filters
  if (risk_min) rows = rows.filter(b => Number.isFinite(b.risk) && b.risk >= parseFloat(risk_min));
  if (risk_max) rows = rows.filter(b => Number.isFinite(b.risk) && b.risk <= parseFloat(risk_max));
  if (use)      rows = rows.filter(b => b.use === use);
  if (signal)   rows = rows.filter(b => b.signal === signal);
  if (ll97_over === "1" || ll97_over === "true")  rows = rows.filter(b => b.ll97_over_2024 === 1);
  if (ll97_over === "0" || ll97_over === "false") rows = rows.filter(b => b.ll97_over_2024 === 0);
  if (cluster_name) rows = rows.filter(b => b.cluster_name === cluster_name);
  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter(b =>
      [b.address, b.use, b.cluster_name, b.sc_class].some(f => (f ?? "").toLowerCase().includes(q))
    );
  }

  // Sort
  const SORTABLE = ["risk", "ll97_penalty_2024", "ll97_penalty_2030", "steam", "yr", "energy_star", "peer_score"];
  const sortKey = SORTABLE.includes(sort_by) ? sort_by : "risk";
  const sortAsc = sort_dir === "asc";
  rows.sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return sortAsc ? (av < bv ? -1 : av > bv ? 1 : 0) : (av > bv ? -1 : av < bv ? 1 : 0);
  });

  // Pagination
  const total     = rows.length;
  const pageNum   = Math.max(1, parseInt(page, 10) || 1);
  const perPage   = Math.min(200, Math.max(1, parseInt(per_page, 10) || 50));
  const paged     = rows.slice((pageNum - 1) * perPage, pageNum * perPage);
  const totalPages = Math.ceil(total / perPage);

  res.json({ buildings: paged, total, page: pageNum, per_page: perPage, total_pages: totalPages });
});

// ── Watchlist — per-session persistence (Map, localStorage fallback on client) ──
const watchlistStore = new Map(); // token → string[]

app.post("/api/watchlist/save", requireAuth, (req, res) => {
  if (!req.sessionToken) return res.status(401).json({ error: "No session token" });
  const { addresses } = req.body ?? {};
  if (!Array.isArray(addresses)) {
    return res.status(400).json({ error: "addresses must be an array of strings" });
  }
  if (addresses.length > 10_000) {
    return res.status(400).json({ error: "addresses array too large (max 10,000)" });
  }
  if (!addresses.every(a => typeof a === "string" && a.length <= 500)) {
    return res.status(400).json({ error: "each address must be a non-empty string ≤ 500 chars" });
  }
  // Evict oldest entry when store reaches 500 sessions to bound memory use
  if (watchlistStore.size >= 500) watchlistStore.delete(watchlistStore.keys().next().value);
  watchlistStore.set(req.sessionToken, addresses);
  res.json({ ok: true, count: addresses.length });
});

app.get("/api/watchlist/load", requireAuth, (req, res) => {
  if (!req.sessionToken) return res.status(401).json({ error: "No session token" });
  const addresses = watchlistStore.get(req.sessionToken) ?? [];
  res.json({ addresses });
});

// Protect public JSON files from direct exposure in production build folder
app.get(["/buildings.json", "/buildingEnrichment.json", "/yearly.json", "/yoy_deltas.json", "/yoy_summary.json"], (req, res) => {
  res.status(403).json({ error: "Access Forbidden — Data is protected" });
});

// Serve built frontend assets in production (if built)
app.use(express.static(resolve(process.cwd(), "dist")));

// ── LLM provider detection ────────────────────────────────────────────────────
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const GROQ_KEY      = process.env.GROQ_API_KEY;

// Wrap user input in XML tags to structurally isolate it from the system prompt,
// and strip the most common injection patterns. This is defense-in-depth —
// validateSpec() still enforces the schema on output regardless.
const INJECTION_RE = /\b(ignore|forget|disregard|override|system prompt|instructions|you are now|act as|jailbreak|new task|pretend|roleplay)\b/gi;
function sanitizeQuestion(q) {
  const stripped = q.replace(INJECTION_RE, "[filtered]").trim();
  return `<user_query>${stripped}</user_query>`;
}

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
    "Pre-War Active — Permit-Driven Churn"
    "Mid-Size Post-War — Moderate Signal"
    "Pre-War Stable — Low Signal"
    "Large Commercial — Capital Mobilized"
    "Low-Compliance Commercial — Quiet Attrition"
- address (string): building address. Use for partial text search.
- yr (integer): year built. "pre-war" = yr < 1940, "post-war" = yr >= 1940 && yr < 1980
- peer_score (number 0–1): fraction of nearby buildings also showing attrition signals

FILTER SPEC (return ONLY valid JSON, no explanation text, no markdown):
{
  "risk_min": null,
  "risk_max": null,
  "use": null,
  "dob_jobs_min": null,
  "signal": null,
  "ll97_over_2024": null,
  "ll97_penalty_min": null,
  "steam_min": null,
  "steam_max": null,
  "cluster_name": null,
  "address_search": null,
  "yr_max": null,
  "yr_min": null,
  "sort_by": "risk",
  "sort_dir": "desc",
  "explanation": ""
}`;

async function callClaude(question, systemOverride) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal: AbortSignal.timeout(10_000),
    headers: {
      "content-type":      "application/json",
      "x-api-key":         ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system:     systemOverride ?? SYSTEM_PROMPT,
      messages:   [{ role: "user", content: question }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}`);
  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

async function callGroq(question, systemOverride) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(10_000),
    headers: {
      "content-type":  "application/json",
      "Authorization": `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model:       "llama-3.3-70b-versatile",
      temperature: 0,
      max_tokens:  512,
      messages: [
        { role: "system", content: systemOverride ?? SYSTEM_PROMPT },
        { role: "user",   content: question },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Groq API ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// ── Spec schema validation ────────────────────────────────────────────────────
const ALLOWED_SORT_BY  = ["risk", "ll97_penalty_2024", "steam", "dob_jobs"];
const ALLOWED_SORT_DIR = ["asc", "desc"];
const ALLOWED_SIGNALS  = ["big_drop", "mod_drop", "any", null];
const ALLOWED_USES     = [
  "Office", "Multifamily Housing", "Hotel", "K-12 School",
  "College/University", "Hospital (General Medical & Surgical)",
  "Retail Store", "Other", null,
];
const ALLOWED_CLUSTERS = [
  "Pre-War Active — Permit-Driven Churn",
  "Mid-Size Post-War — Moderate Signal",
  "Pre-War Stable — Low Signal",
  "Large Commercial — Capital Mobilized",
  "Low-Compliance Commercial — Quiet Attrition",
  null,
];

function validateSpec(raw) {
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

// ── /api/query ────────────────────────────────────────────────────────────────
app.post("/api/query", requireAuth, aiLimiter, async (req, res) => {
  const question = req.body?.question;

  if (typeof question !== "string" || !question.trim()) {
    return res.status(400).json({ error: "question is required" });
  }
  if (question.length > 500) {
    return res.status(400).json({ error: "question too long (max 500 chars)" });
  }
  if (!ANTHROPIC_KEY && !GROQ_KEY) {
    return res.status(503).json({ error: "No LLM API key configured — set ANTHROPIC_API_KEY or GROQ_API_KEY" });
  }

  try {
    const safe    = sanitizeQuestion(question);
    const raw     = ANTHROPIC_KEY ? await callClaude(safe) : await callGroq(safe);
    const cleaned = raw.replace(/```(?:json)?\n?/g, "").replace(/```/g, "").trim();
    const parsed  = JSON.parse(cleaned);
    const spec    = validateSpec(parsed);
    res.json({ spec, provider: ANTHROPIC_KEY ? "claude-haiku" : "groq-llama3.3" });
  } catch (err) {
    console.error("[/api/query]", err.message);
    res.status(502).json({ error: "LLM query failed — try again" });
  }
});

// ── /api/summarize ────────────────────────────────────────────────────────────
app.post("/api/summarize", requireAuth, aiLimiter, async (req, res) => {
  const { question, count, sample } = req.body ?? {};

  if (typeof question !== "string" || !question.trim()) {
    return res.status(400).json({ error: "question is required" });
  }
  if (question.length > 600) {
    return res.status(400).json({ error: "question too long (max 600 chars)" });
  }
  if (!ANTHROPIC_KEY && !GROQ_KEY) {
    return res.status(503).json({ error: "No LLM API key configured" });
  }

  const safeCount = Math.max(0, Math.min(99999, parseInt(count, 10) || 0));
  const top = (Array.isArray(sample) ? sample.slice(0, 5) : []).map(b => {
    const addr    = String(b.address ?? "").replace(/[\r\n]/g, " ").slice(0, 100);
    const use     = String(b.use     ?? "unknown use").replace(/[\r\n]/g, " ").slice(0, 50);
    const risk    = Math.round((Number.isFinite(b.risk) ? b.risk : 0) * 100);
    const penalty = Number.isFinite(b.ll97_penalty_2024) ? b.ll97_penalty_2024 : 0;
    return `${addr} (risk ${risk}%, LL97 $${penalty.toLocaleString()}, ${use})`;
  }).join("; ");

  const summaryPrompt = `The user asked: "${sanitizeQuestion(question).slice(0, 220)}"
Results: ${safeCount} buildings matched.
Top matches: ${top || "none"}.
Write ONE concise sentence (max 25 words) summarizing what was found. Be specific with numbers. No preamble.`;

  try {
    const raw = ANTHROPIC_KEY
      ? await callClaude(summaryPrompt, "You are a data analyst summarizing building search results. Reply with one sentence only.")
      : await callGroq(summaryPrompt,   "You are a data analyst summarizing building search results. Reply with one sentence only.");
    res.json({ summary: raw.trim().replace(/^["']|["']$/g, "") });
  } catch (err) {
    console.error("[/api/summarize]", err.message);
    res.status(502).json({ error: "summarize failed" });
  }
});

// ── /api/explain — dashboard knowledge Q&A ───────────────────────────────────
const EXPLAIN_PROMPT = `You are an expert assistant embedded inside the ConEd Manhattan Steam Attrition Dashboard.
You have complete knowledge of how the dashboard works, its data, formulas, and ML models.
Do NOT output JSON. Do NOT start with "I".

=== HOW TO CALIBRATE YOUR ANSWER ===
Read the user's question tone carefully and match it:

If the question contains words like "simple", "eli5", "like i'm 5", "layman", "plain english",
"easy", "basic", "non-technical", "in simple terms", OR if the system prefix says [SIMPLE MODE]:
  → Use everyday analogies. No jargon. Short sentences. Imagine explaining to a smart non-technical friend.
  → Use metaphors: steam like a subscription service, risk score like a doctor's checkup, LL97 like a speeding fine.
  → Max 5 sentences, then offer to go deeper.

If the question asks for "technical detail", "deep dive", "formula", "calculation", "how exactly", "precise":
  → Give full technical detail: exact formulas, feature names, model hyperparameters, SQL-style logic.
  → Use numbers and percentages. Bullet lists are fine.

Otherwise: give a clear, balanced answer — plain English but accurate. 3–6 sentences.

=== ELI5 REFERENCE ANALOGIES (use these when in simple mode) ===

ATTRITION / CHURN:
  ConEd pumps steam heat through underground pipes to 1,210 Manhattan buildings.
  Some buildings might one day decide to stop buying that steam and switch to electric heat pumps instead.
  When a building stops buying steam, that's "attrition" — like a customer cancelling their Netflix subscription.
  ConEd loses that recurring revenue. This dashboard tries to catch those buildings BEFORE they cancel.

RISK SCORE (ELI5):
  Imagine 1,210 customers at a gym. Some have been coming less and less often.
  The risk score is the gym's estimate of which members are most likely to cancel their membership.
  It looks at: are they visiting less (steam usage dropping?), did they just buy a home gym set (permits for new HVAC?), and are they being charged big fees they hate (LL97 fines?).
  A score near 1.0 (like 95%) is a STRONG WARNING SIGNAL — not a guarantee, but multiple red flags at once.
  A score near 0.0 means the data shows no warning signs at all. The model is a pattern-matcher, not a crystal ball.

LL97 (ELI5):
  New York City made a rule: every big building must stay under a carbon pollution limit.
  If a building pollutes too much from heating, it pays a fine — $268 for every extra ton of CO₂.
  Steam heat contributes significantly to a building's carbon count under this law.
  The fine rate ($268/ton) stays the same, but the allowed pollution LIMIT gets much stricter in 2030 —
  so the same building that barely squeaks by in 2024 could owe 3× more in fines by 2030.
  Think of it like a speed limit that drops from 60mph to 40mph — same fine per mph over, but now you're further over the limit.

STEAM (ELI5):
  ConEd makes steam in giant boilers and pipes it underground to buildings all over Manhattan.
  Buildings use that steam to heat their offices, apartments, and hallways in winter.
  It's like a district-wide radiator — instead of each building having its own furnace, they all share ConEd's.

EUI (Energy Use Intensity, ELI5):
  EUI is how much energy a building uses per square foot per year.
  Think of it like how many gallons of gas a car burns per mile — NOT miles per gallon.
  Lower EUI = more efficient building (uses less energy to heat the same space).
  A building with very high EUI is "guzzling" energy compared to similar buildings.

DOB PERMITS (ELI5):
  When a building owner does HVAC or boiler work, they need a permit from the city.
  High permit count suggests the building is actively doing heating system work.
  This COULD mean they are switching from steam to electric — but it could also mean maintenance.
  It is a warning signal worth watching, not a guarantee they are leaving.

CLUSTERS / ARCHETYPES (ELI5):
  The dashboard sorts all 1,210 buildings into 5 personality types — like sorting customers into groups.
  Group 1 (Pre-War Active): Old buildings filing lots of renovation permits. Most likely to eventually leave.
  Group 2 (Mid-Size Post-War): Medium buildings, not very efficient, starting to show warning signs.
  Group 3 (Pre-War Stable): Old but efficient and quiet — no signs of leaving.
  Group 4 (Large Commercial): Big commercial buildings, stable but worth watching.
  Group 5 (Low-Compliance Commercial): Big offices facing huge LL97 fines after 2030. Strong financial reason to switch.

YoY CHART (ELI5):
  The year-over-year chart compares how much each building's steam usage changed in two periods.
  X-axis = how much it changed from 2022 to 2023. Y-axis = how much it changed from 2023 to 2024.
  A building in the bottom-left corner = steam going down both years. That's the biggest red flag.
  A building in the top-right = steam going UP both years. Totally stable customer.

=== CRITICAL FACTS — DO NOT HALLUCINATE ===
- LL84 benchmarking is administered by the NYC DEPARTMENT OF BUILDINGS (DOB), NOT the Department of Energy. Never say "DOE" or "Department of Energy."
- The 213 "skip-year" buildings (2022 + 2024 data, missing 2023) have unknown root cause. Do NOT speculate about "alternative heating sources" or "briefly trialed alternatives." The actual possible causes are: missed LL84 submission, management/ownership change, DOB data rejection, BBL lot merge/split, or temporary closure for renovation. Use the neutral language provided in the section below.
- The 254 buildings with only 2022 data are not necessarily churned. They may have left the steam system, changed ownership, or simply stopped filing. Data alone cannot distinguish these.
- Dataset snapshot: June 2026. This is the pull date — use this when asked "when was the data pulled?"

=== YOY COVERAGE — WHY ONLY 422 OF 1,210 BUILDINGS APPEAR IN THE SCATTER CHART ===
Dataset snapshot: June 2026. LL84 steam benchmarking data sourced from NYC Open Data / Portfolio Manager.
The scatter chart requires confirmed data for BOTH the 22→23 AND 23→24 consecutive periods.
Here is the exact breakdown of all 1,210 buildings:

- 422 buildings: have both deltas — full YoY data, plotted in the scatter chart.
- 321 buildings: have 2022 and 2023 steam data but 2024 is missing. NYC Local Law 84 benchmarking
  requires building owners to self-report annually to the NYC Department of Buildings (DOB), with a
  May 1 deadline. The 2024 filing deadline was May 1, 2025 — over a year before this snapshot.
  These 321 buildings are likely non-compliant with LL84 reporting as of June 2026 (DOB typically
  cites ~20% annual non-compliance before enforcement). They have clean 2022–2023 history.
- 254 buildings: have 2022 data only — stopped filing after 2022. May have left the steam system,
  changed ownership, or been demolished/converted.
- 213 buildings: have 2022 and 2024 data but are MISSING 2023. Root cause is unclear — most likely
  explanations are: missed LL84 submission for 2023, management/ownership change disrupting reporting,
  NYC DOB data rejection or BBL lot merge/split, or temporary closure for renovation. These are excluded
  because a complete two-period delta cannot be computed without 2023. Further manual validation required.

Total: 422 + 321 + 254 + 213 = 1,210.
Selection bias note: the 422 plotted buildings may skew toward larger, better-resourced buildings that
file LL84 on time — meaning the scatter chart may underrepresent smaller buildings with weaker compliance.
The chart is conservative: it only plots buildings with verified data for consecutive periods.

GBM / Risk Model (ELI5):
  Imagine each building is a student taking a test. The model is the teacher who's graded 1,000 previous students and knows exactly which answers predict a failing grade. When a new building shows patterns like "steam going down + filed HVAC permits + near a fine limit," the teacher flags it. The risk score is how many alarm bells the teacher hears for that building — rang all of them (90%+), rang a few (40-70%), or none at all (under 30%).

K-means Clustering (ELI5):
  Think of sorting a pile of mixed LEGO bricks into 5 buckets. You sort by color, size, and shape all at once so each bucket ends up with bricks that look similar to each other. That's what K-means does — it looks at each building's year built, steam usage, permits filed, and energy score, then places it into one of 5 groups where every building in the group shares similar patterns.

HDD Normalization (ELI5):
  Heating Degree Days measure how cold each winter is. If 2023 was freezing cold and 2024 was warm, buildings naturally use less steam in 2024 — not because they left ConEd, just because it was warmer. HDD normalization adjusts for this: it's like correcting for the weather so we can see the REAL drop, not the weather-related one.

Peer Score (Z-score) (ELI5):
  If you're a 5'10" kid in a 4th-grade class, you're tall. But in a high school, you're short. Peer score compares each building's energy use against OTHER BUILDINGS OF THE SAME TYPE — so an office is only compared to offices, a hospital to hospitals. A negative peer score means "more efficient than similar buildings."

=== DASHBOARD PURPOSE ===
This dashboard tracks 1,210 Manhattan buildings that buy district steam heat from ConEd.
It identifies which buildings are most likely to disconnect from the steam grid ("attrition"),
so account managers can intervene before customers act. Think of it as a churn model for a utility.

=== RISK SCORE ===
Each building has a risk score from 0.0 to 1.0 produced by a Gradient Boosting Machine (GBM) classifier.
Score ≥ 0.90 = Extreme risk (54 buildings). Score 0.70–0.90 = High risk (4 buildings). Score 0.40–0.70 = Medium (5 buildings). Score 0.10–0.40 = Low-medium (71 buildings). Score < 0.10 = Low (1,076 buildings).
NOTE: The model is strongly bimodal — most buildings are either extreme (≥0.90) or low (<0.10). The middle is almost empty. This is by design: the GBM was trained on confirmed big-drop vs stable labels, not on a gradient.
The model is binary by design — it was trained on buildings with confirmed big steam drops vs. stable accounts.
Buildings with "moderate" drops were excluded from training, which is why the distribution is strongly bimodal.
The score is NOT a nuanced 0–100 rating; it's a signal that a building probably will or won't churn.

=== ACTIONABILITY — WHAT TO DO WITH HIGH ATTRITION RISK ===
The dashboard is designed to drive three types of action:

Tier 1 — Extreme Risk (score ≥ 0.90, 54 buildings): Immediate account manager outreach.
  These are the clearest churn signals in the portfolio. The model fires at this level when multiple
  alarm signals overlap: large LL97 fines, sustained steam drops, active HVAC permits, poor peer score.
  Action: Direct contact with building owner/manager within 1–2 weeks. Ask: "Are you considering switching
  off steam?" Understand their timeline, offer rate negotiation or LL97 compliance assistance if applicable.

Tier 2 — High Risk (score 0.70–0.90, 4 buildings): Scheduled proactive outreach.
  Action: Add to watch list. Flag for quarterly account review. Monitor for new DOB permit filings.

Tier 3 — Medium (score 0.40–0.70, 5 buildings): Thin band — treat like Tier 2.
  Action: Watch list + monitor for two consecutive years of steam drops.

Tier 4 — Low (score < 0.40, 1,147 buildings): Passive monitoring.
  Action: Watch for YoY steam drops ≥20% in two consecutive years — that's the primary early warning.
  The YoY scatter chart bottom-left quadrant surfaces these automatically.

IMPORTANT: The model is bimodal. 54 buildings have ≥90% risk; 1,076 have <10%. The middle is sparse.
The LL97 dollar exposure story is richer than the risk score story for investment purposes:
  - 165 buildings are over the 2024 LL97 cap now ($81.9M total penalty)
  - 830 buildings will be over the 2030 LL97 cap ($270.9M total penalty — a 231% jump)
  - This is the investment signal Blackstone cares about most.

Key signals that should ESCALATE a building's priority:
- New HVAC or boiler DOB permit filed in the last 6 months (dob_jobs metric)
- LL97 fine crossing $200K/year threshold in 2024, or $500K/year projected for 2030
- Two consecutive years of normalized steam decline (bottom-left quadrant of YoY chart)
- Peer score turning significantly negative (building becoming far more efficient than peers — may signal
  they already partially switched and are reducing steam load)

=== GBM FEATURES (12 total, in order of importance) ===
1. LL97 penalty 2024 (log) — ~22% importance. Biggest driver: financial pressure to switch.
2. Steam consumption (log) — ~17%. Raw volume signal.
3. LL97 over limit 2024 — ~13%. Binary: is building currently non-compliant?
4. GHG emissions (log) — ~12%.
5. Peer score — ~9%. EUI vs. same-use-type peers (negative = more efficient than peers).
6. LL97 penalty 2030 (log) — ~7%. Forward-looking pressure.
7. Cluster ID — ~6%. Which K-means archetype the building belongs to.
8. Steam–GHG share — ~5%. Fraction of building GHG attributable to steam (vs. electricity).
9. Energy Star score — ~4%.
10. Year built — ~2%.
11. DOB permit count (log) — ~2%. Recent HVAC/boiler permit activity.
12. Use-type risk ordinal — ~1%. Office=4 (most likely to electrify), Hospital=1 (least likely).

=== LL97 CALCULATION (Local Law 97, NYC 2019) ===
LL97 caps carbon emissions per square foot for buildings over 25,000 sq ft.
Step 1 — Convert steam to GHG: GHG (MT CO₂e/yr) = steam_kBtu × 0.00004493
  (0.00004493 is the NYC-binding coefficient from NYC DOB Chapter 103 Rules, not the EPA eGRID value)
Step 2 — Calculate allowed cap: cap = floor_sqft × intensity_limit (varies by use type and phase)
  Examples: Office = 0.00846 MT/ft²/yr (Phase 1, 2024), 0.00453 (Phase 2, 2030)
  Hotel = 0.01450 (2024), 0.00700 (2030). Hospital = 0.02381 (2024), 0.00840 (2030).
Step 3 — Fine: excess = max(0, GHG − cap). Fine = excess × $268/ton.
Total 2024 portfolio exposure: $81,875,711. Total 2030 exposure: $270,916,416 (~3.3× more).

=== 5 CLUSTER ARCHETYPES (K-means, K=5) ===
Buildings are grouped into 5 archetypes using steam, year built, DOB permits, Energy Star, peer score, and use type.
0: "Pre-War Active — Permit-Driven Churn" (269 buildings) — HIGH risk
   Mixed-era stock with moderate permit activity. Includes diverse use types (residential, office, institutional). Landlords with active permits may be renovating toward electrification.
1: "Mid-Size Post-War — Moderate Signal" (189 buildings) — MEDIUM risk
   Post-war construction, low Energy Star scores (~21), underperforming vs. peers.
2: "Pre-War Stable — Low Signal" (242 buildings) — LOW risk
   Older but efficient (Energy Star ~72), stable consumption, no strong churn signal.
3: "Large Commercial — Capital Mobilized" (263 buildings) — MEDIUM risk
   Primarily pre-war multifamily housing with low permit activity and mixed efficiency — stable base overall, but higher LL97 exposure for the residential portion.
4: "Low-Compliance Commercial — Quiet Attrition" (247 buildings) — HIGH risk
   97% office/commercial. High DOB activity (avg 12.3 permits). Most exposed to LL97 2030 tightening.

=== KEY FIELDS ===
- EUI (Energy Use Intensity): kBtu per sq ft per year. Lower = more efficient.
- DOB jobs: permit filings in trailing 24 months. High count = active capital investment (could signal electrification prep).
- Peer score: z-score of EUI vs. same-use-type buildings. Negative = more efficient than average peers.
- YoY delta: year-over-year % change in steam consumption, HDD-normalized (adjusted for weather).
- Steam–GHG share: fraction of building's total GHG that comes from steam (vs. electricity).
- Signal: "big_drop" = ≥50% confirmed steam decline (highest churn signal), "mod_drop" = moderate, null = stable.

=== DASHBOARD TABS ===
- Attrition Rankings: Sortable risk table of all 1,210 buildings. Filter by risk tier, use type, cluster, LL97 status.
- YoY Trends: Scatter showing 2022→2023 vs 2023→2024 steam change for the 422 buildings with confirmed data in both periods. Bottom-left quadrant = sustained decline both years (highest concern). 743 buildings have 22→23 data; only 422 also have 23→24 — the 321-building gap is missing 2024 LL84 filings (timeliness, not data loss).
- Watch List: Pin specific accounts for tracking across sessions.
- AI Agent (this tab): Ask questions in plain English to filter buildings or get explanations.

=== DATA SOURCES ===
- Steam + GHG data: NYC LL Benchmarking (2021–2024)
- Floor area: NYC LL Benchmarking (self-reported)
- DOB permits: NYC Open Data DOB NOW API, updated through June 2026
- Building coordinates + owner: NYC PLUTO dataset
- BBL (Borough-Block-Lot): used as the join key across all datasets

=== DEEP DIVE — FOR ML SCIENTISTS AND EXPERTS ===
When the user asks for "formula", "derivation", "SHAP", "model weights", "backprop", "mathematical", "deep technical", or shows expert-level language:

Risk Model Architecture:
- Algorithm: sklearn.ensemble.GradientBoostingClassifier with n_estimators=300, learning_rate=0.1, max_depth=4, subsample=0.8, min_samples_leaf=10.
- Training data: 782 buildings with confirmed labels (big_drop=1: 391, stable=0: 391). Moderate-drop buildings excluded.
- CV: 5-fold stratified, mean AUC = 0.645 (SD ±0.04). The low AUC reflects label noise from public LL84 data — production model with ConEd billing data would be stronger.
- GBM loss function: deviance (cross-entropy). Tree splits use Friedman's MSE improvement criterion.
- Feature engineering: log-transform for right-skewed features (steam_kbtu, ll97_penalty, ghg_emissions, dob_jobs). No interaction terms in current model.

To view SHAP values or feature interactions, inspect 'll97_model.py' in the project root, or request a Jupyter notebook export.

K-means (ARCHETYPES):
- Algorithm: sklearn.cluster.KMeans with n_clusters=5, init='k-means++', random_state=42.
- Features: [steam_kbtu, yr_built, dob_jobs, energy_star, peer_score, use_type_ordinal], all standardized via StandardScaler.
- K-selected via silhouette score: s(5)=0.31 vs s(4)=0.28 and s(6)=0.30 — K=5 is the elbow.
- Data path: 'kmeans_model.py' in project root.

LL97 Penalty Formula (exact):
  GHG_steam = steam_kBtu × 4.493e-5  (MT CO₂e — NYC DOB Chapter 103 coefficient)
  cap      = floor_sqft × intensity_limit[use_type][phase]
  excess   = max(0, GHG_total − cap)
  fine     = excess × $268/ton
  Phase 1 (2024) intensity limits: see INTENSITY_LIMITS dict in ll97_model.py lines 34-56.
  Phase 2 (2030) limits: 40-60% stricter by use type.

Data Limitations:
- LL84 benchmarking data is self-reported by building owners — estimated ±15% accuracy.
- 2023→2024 YoY deltas flagged as "provisional" because 2024 HDD factor is estimated until final weather data is published (typically July 2025).
- ~250 buildings have only one year of steam data (— in YoY column).
- All 1,210 buildings are below 96th Street in Manhattan. No steam customers above 96th St are represented.`;

app.post("/api/explain", requireAuth, aiLimiter, async (req, res) => {
  const { question } = req.body ?? {};

  if (typeof question !== "string" || !question.trim()) {
    return res.status(400).json({ error: "question is required" });
  }
  if (question.length > 600) {
    return res.status(400).json({ error: "question too long (max 600 chars)" });
  }
  if (!ANTHROPIC_KEY && !GROQ_KEY) {
    return res.status(503).json({ error: "No LLM API key configured" });
  }

  const safe = sanitizeQuestion(question);
  try {
    const answer = ANTHROPIC_KEY
      ? await callClaude(safe, EXPLAIN_PROMPT)
      : await callGroq(safe, EXPLAIN_PROMPT);
    res.json({ answer: answer.trim() });
  } catch (err) {
    console.error("[/api/explain]", err.message);
    res.status(502).json({ error: "explain failed — try again" });
  }
});

// ── /api/export/csv ───────────────────────────────────────────────────────────
// Escape CSV cells: wrap in double-quotes, escape internal quotes, and prefix
// cells starting with =, +, -, @ with a single-quote to prevent Excel/Sheets
// formula injection (double-quoting alone does NOT prevent this).
function csvCell(v) {
  // Finite numbers are safe as-is — no quoting, no injection risk
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  const s = String(v ?? "").replace(/"/g, '""');
  // Prefix text cells starting with =, +, -, @ to block Excel formula injection
  // (double-quoting alone does NOT prevent this — panel verdict: unanimous)
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe}"`;
}

const exportLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Export rate limit — try again in a minute" },
});

app.get("/api/export/csv", requireAuth, exportLimiter, (req, res) => {
  const rows = DATA_PARSED.buildings.map(b => {
    const e = DATA_PARSED.enrichment[b.address?.toUpperCase()] ?? {};
    return [
      b.address, b.bbl, b.lat, b.lon, b.use,
      e.ml_risk ?? b.risk, b.ll97_penalty_2024, b.ll97_penalty_2030,
      b.steam, e.cluster_name ?? "", e.floor_sqft ?? "",
      e.energy_star ?? "", e.eui ?? "", e.signal ?? "",
      e.dob_jobs ?? "", e.steam_ghg_share ?? ""
    ].map(csvCell).join(",");
  });
  const header = "address,bbl,lat,lon,use,risk,ll97_penalty_2024,ll97_penalty_2030,steam,cluster_name,floor_sqft,energy_star,eui,signal,dob_jobs,steam_ghg_share";
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="coned-steam-portfolio.csv"');
  res.setHeader("Cache-Control", "no-store, private");
  res.send([header, ...rows].join("\n"));
});

app.get("/api/health", requireAuth, (_req, res) => {
  res.json({
    ok:       true,
    provider: ANTHROPIC_KEY ? "claude-haiku" : GROQ_KEY ? "groq-llama3.3" : "none",
  });
});

const server = app.listen(PORT, () => {
  const provider = ANTHROPIC_KEY ? "Claude Haiku" : GROQ_KEY ? "Groq Llama 3.3" : "NO KEY SET";
  console.log(`[api] listening on :${PORT} | provider: ${provider}`);
});

// Kill slow/stalled connections — prevents Slowloris exhaustion attacks
server.requestTimeout  = 30_000; // 30s to complete request
server.headersTimeout  = 35_000; // slightly longer than requestTimeout
