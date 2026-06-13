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

app.use(helmet());

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

// ── Protected Data Endpoints ──────────────────────────────────────────────────
app.get("/api/data/buildings",   requireAuth, (_req, res) => res.type("json").send(DATA_CACHE.buildings));
app.get("/api/data/enrichment",  requireAuth, (_req, res) => res.type("json").send(DATA_CACHE.enrichment));
app.get("/api/data/yearly",      requireAuth, (_req, res) => res.type("json").send(DATA_CACHE.yearly));
app.get("/api/data/yoy-deltas",  requireAuth, (_req, res) => res.type("json").send(DATA_CACHE.yoyDeltas));

// Protect public JSON files from direct exposure in production build folder
app.get(["/buildings.json", "/buildingEnrichment.json", "/yearly.json", "/yoy_deltas.json"], (req, res) => {
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
  "Low-Compliance Residential — Quiet Attrition",
  null,
];

function validateSpec(raw) {
  const numOrNull = (v, min = -Infinity, max = Infinity) => {
    if (v == null) return null;
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return Math.min(max, Math.max(min, n));
  };
  const oneOf = (v, allowed) => allowed.includes(v) ? v : allowed[allowed.length - 1];

  return {
    risk_min:         numOrNull(raw.risk_min, 0, 1),
    risk_max:         numOrNull(raw.risk_max, 0, 1),
    use:              oneOf(raw.use, ALLOWED_USES),
    dob_jobs_min:     numOrNull(raw.dob_jobs_min, 0, 1000),
    signal:           oneOf(raw.signal, ALLOWED_SIGNALS),
    ll97_over_2024:   raw.ll97_over_2024 === true || raw.ll97_over_2024 === false ? raw.ll97_over_2024 : null,
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
app.post("/api/query", requireAuth, async (req, res) => {
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
app.post("/api/summarize", requireAuth, async (req, res) => {
  const { question, count, sample } = req.body ?? {};

  if (typeof question !== "string" || !question.trim()) {
    return res.status(400).json({ error: "question is required" });
  }
  if (!ANTHROPIC_KEY && !GROQ_KEY) {
    return res.status(503).json({ error: "No LLM API key configured" });
  }

  const top = (Array.isArray(sample) ? sample.slice(0, 5) : []).map(b =>
    `${b.address} (risk ${Math.round((b.risk ?? 0) * 100)}%, LL97 $${(b.ll97_penalty_2024 ?? 0).toLocaleString()}, ${b.use ?? "unknown use"})`
  ).join("; ");

  const summaryPrompt = `The user asked: "${sanitizeQuestion(question).slice(0, 220)}"
Results: ${count} buildings matched.
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
Answer user questions clearly and concisely. Use plain language. When relevant, give specific numbers.
Do NOT output JSON. Do NOT start with "I". Respond in 3–6 sentences unless a list is clearly better.

=== DASHBOARD PURPOSE ===
This dashboard tracks 1,210 Manhattan buildings that buy district steam heat from ConEd.
It identifies which buildings are most likely to disconnect from the steam grid ("attrition"),
so account managers can intervene before customers act. Think of it as a churn model for a utility.

=== RISK SCORE ===
Each building has a risk score from 0.0 to 1.0 produced by a Gradient Boosting Machine (GBM) classifier.
Score ≥ 0.70 = High risk (58 buildings). Score 0.30–0.70 = Medium (11 buildings). Score < 0.30 = Low (1,141 buildings).
The model is binary by design — it was trained on buildings with confirmed big steam drops vs. stable accounts.
Buildings with "moderate" drops were excluded from training, which is why the distribution is strongly bimodal.
The score is NOT a nuanced 0–100 rating; it's a signal that a building probably will or won't churn.

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
   Older stock with heavy permit activity. Landlords actively renovating toward electrification.
1: "Mid-Size Post-War — Moderate Signal" (189 buildings) — MEDIUM risk
   Post-war construction, low Energy Star scores (~21), underperforming vs. peers.
2: "Pre-War Stable — Low Signal" (242 buildings) — LOW risk
   Older but efficient (Energy Star ~72), stable consumption, no strong churn signal.
3: "Large Commercial — Capital Mobilized" (263 buildings) — MEDIUM risk
   Large pre-war commercial, low permit activity, stable base.
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
- YoY Trends: Scatter showing 2022→2023 vs 2023→2024 steam change. Bottom-left = sustained decline (highest concern).
- Watch List: Pin specific accounts for tracking across sessions.
- AI Agent (this tab): Ask questions in plain English to filter buildings or get explanations.

=== DATA SOURCES ===
- Steam + GHG data: NYC LL Benchmarking (2021–2024)
- Floor area: NYC LL Benchmarking (self-reported)
- DOB permits: NYC Open Data DOB NOW API, updated through June 2026
- Building coordinates + owner: NYC PLUTO dataset
- BBL (Borough-Block-Lot): used as the join key across all datasets`;

app.post("/api/explain", requireAuth, async (req, res) => {
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

app.get("/api/health", (_req, res) => {
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
