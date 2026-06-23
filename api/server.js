/* global process */
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { readFileSync } from "fs";
import { resolve } from "path";
import { randomBytes, timingSafeEqual } from "crypto";

import dotenv from "dotenv";
import { EXPLAIN_PROMPT } from "./prompts/explainPrompt.js";

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

// ── LLM provider detection (hoisted — used by Proactive Alert Engine and /api/query) ──
const ANTHROPIC_KEY   = process.env.ANTHROPIC_API_KEY;
const GROQ_KEY        = process.env.GROQ_API_KEY;
const OPENROUTER_KEY  = process.env.OPENROUTER_API_KEY;

const app  = express();
const PORT = process.env.PORT ?? process.env.API_PORT ?? 3001;

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
  // Clean up alert dismissals for expired sessions
  for (const token of proactiveDismissed.keys()) {
    if (!activeSessions.has(token)) proactiveDismissed.delete(token);
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
  max: 30,
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
  yearly:     JSON.parse(DATA_CACHE.yearly),
  yoyDeltas:  JSON.parse(DATA_CACHE.yoyDeltas),
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

// ── Proactive Alert Engine ────────────────────────────────────────────────────
// Per-session dismissed alert IDs (lightweight — just tracks which were dismissed)
const proactiveDismissed = new Map(); // sessionToken → Set<alertId>

// Cache for computed proactive alerts (refreshed every 5 min)
let proactiveAlertsCache = [];
let proactiveSummaryCache = { critical: 0, high: 0, medium: 0, low: 0 };
let proactiveCacheTimestamp = 0;

// Severity thresholds
const SEV_CRITICAL = 0.8;
const SEV_HIGH = 0.5;
const SEV_MEDIUM = 0.2;

function severityScore(b, e) {
  const risk = e.ml_risk ?? b.risk ?? 0;
  const ll97Over = e.ll97_over_2024 ? 0.3 : 0;
  const penaltyContrib = Math.min((e.ll97_penalty_2024 ?? 0) / 1_000_000, 0.1);
  return risk * 0.6 + ll97Over + penaltyContrib;
}

function severityBand(score) {
  if (score >= SEV_CRITICAL) return "critical";
  if (score >= SEV_HIGH) return "high";
  if (score >= SEV_MEDIUM) return "medium";
  return "low";
}

function getSeverityOrder(sev) {
  const order = { critical: 3, high: 2, medium: 1, low: 0 };
  return order[sev] ?? 0;
}

let _enrichmentRunning = false;

async function computeProactiveAlerts() {
  if (_enrichmentRunning) {
    console.log("[enrich] skipped — previous run still in progress");
    return;
  }
  _enrichmentRunning = true;
  try {
    await _doComputeProactiveAlerts();
  } finally {
    _enrichmentRunning = false;
  }
}

async function _doComputeProactiveAlerts() {
  const now = new Date();
  const bldgs = DATA_PARSED.buildings;
  const enr = DATA_PARSED.enrichment;

  // Score all buildings
  const scored = [];
  for (const b of bldgs) {
    const addrUp = b.address?.toUpperCase();
    const e = enr[addrUp] ?? {};
    const score = severityScore(b, e);
    const band = severityBand(score);
    const pen2024 = e.ll97_penalty_2024 ?? 0;

    if (score >= SEV_MEDIUM) {
      scored.push({
        id: `proactive_${b.address}`.replace(/[^a-zA-Z0-9_]/g, "_"),
        address: b.address,
        type: "proactive_risk",
        severity: band,
        severity_score: score,
        ll97_penalty_2024: pen2024,
        ll97_over_2024: e.ll97_over_2024 ?? 0,
        message: `${b.address} — ${band === "critical" ? "Critical" : band === "high" ? "High" : "Medium"} Severity (${(score * 100).toFixed(0)}%)`,
        detail: `Risk: ${((e.ml_risk ?? b.risk ?? 0) * 100).toFixed(0)}% · LL97: $${(pen2024 / 1000).toFixed(0)}k${e.ll97_over_2024 ? " (over cap)" : ""} · ${e.cluster_name ?? ""} · ${b.use ?? ""}`,
        description: "", // filled async by LLM
        recommendation: "", // filled async by LLM
        timestamp: now.toISOString(),
      });
    }
  }

  // Summary across ALL buildings (not just top N)
  const summary = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const b of bldgs) {
    const addrUp = b.address?.toUpperCase();
    const e = enr[addrUp] ?? {};
    const band = severityBand(severityScore(b, e));
    summary[band]++;
  }

  // Sort — severity desc then score desc
  scored.sort((a, b) => {
    const sa = getSeverityOrder(b.severity) - getSeverityOrder(a.severity);
    if (sa !== 0) return sa;
    return b.severity_score - a.severity_score;
  });

  // Top 50 for detailed view
  const top50 = scored.slice(0, 50);

  // Update cache immediately (before LLM enrichment)
  proactiveAlertsCache = top50;
  proactiveSummaryCache = summary;
  proactiveCacheTimestamp = now.getTime();

  // Kick off async LLM enrichment for top items (fire-and-forget)
  // Set SKIP_ENRICHMENT=true in env to skip (preserves rate limits for testing)
  if (!process.env.SKIP_ENRICHMENT) {
    enrichAlertDescriptions(top50).catch(() => {});
  }
}

async function enrichAlertDescriptions(alerts) {
  if (!ANTHROPIC_KEY && !GROQ_KEY && !OPENROUTER_KEY) return;
  const BATCH_SIZE = 1;     // 1 at a time — Groq free tier is 30 RPM; batching blows the limit
  const DELAY_MS = 2500;   // 2.5s between alerts → ~24 req/min, safely under 30 RPM
  const MAX_RETRIES = 2;
  const ENRICH_TIMEOUT = 25_000;  // longer timeout — alert prompts are verbose (25s)

  console.log(`[enrich] Starting enrichment of ${alerts.length} alerts (batch=${BATCH_SIZE}, delay=${DELAY_MS}ms, timeout=${ENRICH_TIMEOUT}ms)`);
  for (let i = 0; i < alerts.length; i += BATCH_SIZE) {
    const batch = alerts.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (alert) => {
      const prompt = `You are a ConEd steam operations advisor. For this building alert, respond with raw JSON only — no markdown, no code fences:

Building: ${alert.address}
Severity: ${alert.severity}
Score: ${(alert.severity_score * 100).toFixed(0)}%
LL97 Penalty: $${(alert.ll97_penalty_2024 / 1000).toFixed(0)}k
Over Cap: ${alert.ll97_over_2024 ? "Yes" : "No"}

Respond with valid JSON only:
{"description":"One-sentence alert description (under 80 chars)","recommendation":"One-sentence recommended action (under 120 chars)"}`;
      try {
        const raw = await callLLM(prompt, "You are a ConEd steam operations advisor. Respond with raw JSON only — no markdown, no code fences.", ENRICH_TIMEOUT, 1024);
        // Strip markdown fences if LLM wraps output anyway
        const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
        const parsed = JSON.parse(cleaned);
        if (typeof parsed.description === "string") alert.description = parsed.description.trim().slice(0, 160);
        if (typeof parsed.recommendation === "string") alert.recommendation = parsed.recommendation.trim().slice(0, 240);
        } catch (err) {
        // Retry with exponential backoff on rate-limit / transient errors
        for (let retry = 1; retry <= MAX_RETRIES; retry++) {
          await new Promise(r => setTimeout(r, retry * 2000));
          try {
            const raw = await callLLM(prompt, "You are a ConEd steam operations advisor. Respond with raw JSON only — no markdown, no code fences.", ENRICH_TIMEOUT, 1024);
            const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
            const parsed = JSON.parse(cleaned);
            if (typeof parsed.description === "string") alert.description = parsed.description.trim().slice(0, 160);
            if (typeof parsed.recommendation === "string") alert.recommendation = parsed.recommendation.trim().slice(0, 240);
            break; // success — exit retry loop
          } catch {
            // still failed — retry or fall through
          }
        }
        // leave empty if all retries exhausted — acceptable
      }
    });
    await Promise.all(promises);
    const done = Math.min(i + BATCH_SIZE, alerts.length);
    console.log(`[enrich] ${done}/${alerts.length} alerts processed`);
    if (i + BATCH_SIZE < alerts.length) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }
}

// Compute at startup (module-level init)
computeProactiveAlerts();

// Refresh every 30 minutes — 5min was too aggressive and saturated per-minute LLM rate limits
setInterval(() => {
  computeProactiveAlerts();
}, 30 * 60 * 1000).unref();

// ── Proactive Alert API ──────────────────────────────────────────────────────
app.get("/api/alerts/proactive", requireAuth, (req, res) => {
  const token = req.sessionToken;
  const since = req.query.since;

  // Filter out dismissed alerts for this session
  const dismissed = proactiveDismissed.get(token);
  let alerts = dismissed && dismissed.size > 0
    ? proactiveAlertsCache.filter(a => !dismissed.has(a.id))
    : [...proactiveAlertsCache];

  // Filter by ?since= ISO timestamp
  if (since) {
    const sinceTime = new Date(since).getTime();
    if (!isNaN(sinceTime)) {
      alerts = alerts.filter(a => new Date(a.timestamp).getTime() > sinceTime);
    }
  }

  res.json({ alerts, count: alerts.length, summary: proactiveSummaryCache });
});

app.get("/api/alerts/proactive/summary", requireAuth, (_req, res) => {
  res.json(proactiveSummaryCache ?? { critical: 0, high: 0, medium: 0, low: 0 });
});

app.post("/api/alerts/proactive/dismiss", requireAuth, (req, res) => {
  const token = req.sessionToken;
  const { alert_id } = req.body ?? {};

  if (!alert_id || typeof alert_id !== "string") {
    return res.status(400).json({ error: "alert_id is required (string)" });
  }

  if (!proactiveDismissed.has(token)) {
    proactiveDismissed.set(token, new Set());
  }
  const set = proactiveDismissed.get(token);
  set.add(alert_id);

  // Cap at 10k per session to bound memory
  if (set.size > 10_000) {
    const iter = set.values();
    for (let i = 0; i < 1000; i++) {
      const first = iter.next();
      if (first.done) break;
      set.delete(first.value);
    }
  }

  res.json({ ok: true, alert_id });
});

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

async function callClaude(question, systemOverride, timeoutMs = 10_000, maxTokens = 512) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      "content-type":      "application/json",
      "x-api-key":         ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
      system:     systemOverride ?? SYSTEM_PROMPT,
      messages:   [{ role: "user", content: question }],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Claude API ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

async function callGroq(question, systemOverride, timeoutMs = 10_000) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(timeoutMs),
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
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Groq API ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callOpenRouter(question, systemOverride, timeoutMs = 10_000, maxTokens = 512) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      "content-type":  "application/json",
      "Authorization": `Bearer ${OPENROUTER_KEY}`,
      "HTTP-Referer":  "coned-dashboard",
      "X-Title":       "ConEd Steam Dashboard",
    },
    body: JSON.stringify({
      model:       "meta-llama/llama-3.3-70b-instruct:free",
      temperature: 0,
      max_tokens:  maxTokens,
      messages: [
        { role: "system", content: systemOverride ?? SYSTEM_PROMPT },
        { role: "user",   content: question },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenRouter API ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// Returns true for transient/quota errors that warrant trying the next provider.
// Auth errors (401) and validation errors (400 without credit language) are NOT retryable.
function _isRetryable(msg) {
  return msg.includes("402") || msg.includes("429") || msg.includes("credit balance") ||
         /\b5\d{2}\b/.test(msg);
}

// ── Unified LLM caller: Claude → Groq → OpenRouter ────────────────────────────
async function callLLM(question, systemOverride, timeoutMs = 10_000, maxTokens = 512) {
  if (ANTHROPIC_KEY) {
    try {
      return await callClaude(question, systemOverride, timeoutMs, maxTokens);
    } catch (e) {
      if (!_isRetryable(String(e.message))) throw e;
      console.warn("[callLLM] Claude unavailable — falling back:", e.message.slice(0, 80));
    }
  }

  if (GROQ_KEY) {
    try {
      return await callGroq(question, systemOverride, timeoutMs);
    } catch (e) {
      if (!_isRetryable(String(e.message))) throw e;
      console.warn("[callLLM] Groq unavailable — falling back:", e.message.slice(0, 80));
    }
  }

  if (OPENROUTER_KEY) {
    try {
      return await callOpenRouter(question, systemOverride, timeoutMs, maxTokens);
    } catch (e) {
      console.error("[callLLM] OpenRouter fallback failed:", e.message.slice(0, 80));
    }
  }

  throw new Error("All LLM providers unavailable — try again later");
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
  if (!ANTHROPIC_KEY && !GROQ_KEY && !OPENROUTER_KEY) {
    return res.status(503).json({ error: "No LLM API key configured" });
  }

  try {
    const safe    = sanitizeQuestion(question);
    const raw     = await callLLM(safe);
    const cleaned = raw.replace(/```(?:json)?\n?/g, "").replace(/```/g, "").trim();
    const parsed  = JSON.parse(cleaned);
    const spec    = validateSpec(parsed);
    res.json({ spec, provider: ANTHROPIC_KEY ? "claude-haiku" : GROQ_KEY ? "groq-llama3.3" : "openrouter-llama3.3" });
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
  if (!ANTHROPIC_KEY && !GROQ_KEY && !OPENROUTER_KEY) {
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
    const raw = await callLLM(summaryPrompt, "You are a data analyst summarizing building search results. Reply with one sentence only.", 15_000);
    res.json({ summary: raw.trim().replace(/^["']|["']$/g, "") });
  } catch (err) {
    console.error("[/api/summarize]", err.message);
    res.status(502).json({ error: "summarize failed" });
  }
});

// ── /api/explain — dashboard knowledge Q&A ───────────────────────────────────
// In-memory answer cache: sanitized question → { answer, timestamp }
const explainCache = new Map();
// Periodic cleanup every 5 minutes: evict entries older than 15 min
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of explainCache) {
    if (now - entry.timestamp > 15 * 60 * 1000) explainCache.delete(key);
  }
}, 5 * 60 * 1000).unref();

app.post("/api/explain", requireAuth, aiLimiter, async (req, res) => {
  const { question } = req.body ?? {};

  if (typeof question !== "string" || !question.trim()) {
    return res.status(400).json({ error: "question is required" });
  }
  if (question.length > 600) {
    return res.status(400).json({ error: "question too long (max 600 chars)" });
  }
  if (!ANTHROPIC_KEY && !GROQ_KEY && !OPENROUTER_KEY) {
    return res.status(503).json({ error: "No LLM API key configured" });
  }

  const safe = sanitizeQuestion(question);

  // In-memory cache: same exact question within 15 minutes
  const cached = explainCache.get(safe);
  if (cached && (Date.now() - cached.timestamp) < 15 * 60 * 1000) {
    return res.json({ answer: cached.answer });
  }

  try {
    const answer = await callLLM(safe, EXPLAIN_PROMPT, 25_000);
    const trimmed = answer.trim();
    // Store in cache on success
    explainCache.set(safe, { answer: trimmed, timestamp: Date.now() });
    res.json({ answer: trimmed });
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
    provider: ANTHROPIC_KEY ? "claude-haiku" : GROQ_KEY ? "groq-llama3.3" : OPENROUTER_KEY ? "openrouter-llama3.3" : "none",
  });
});

const server = app.listen(PORT, () => {
  const provider = ANTHROPIC_KEY ? "Claude Haiku" : GROQ_KEY ? "Groq Llama 3.3" : OPENROUTER_KEY ? "OpenRouter Llama 3.3" : "NO KEY SET";
  console.log(`[api] listening on :${PORT} | provider: ${provider}`);
});

// Kill slow/stalled connections — prevents Slowloris exhaustion attacks
server.requestTimeout  = 30_000; // 30s to complete request
server.headersTimeout  = 35_000; // slightly longer than requestTimeout

// Keep process alive despite unhandled rejections (e.g. enrichment burst LLM errors)
process.on("unhandledRejection", (reason) => {
  console.error("[server] unhandledRejection — keeping alive:", String(reason).slice(0, 200));
});
process.on("uncaughtException", (err) => {
  console.error("[server] uncaughtException — keeping alive:", err.message?.slice(0, 200));
});
process.on("exit", (code) => {
  console.error("[server] process exiting with code:", code, "at", new Date().toISOString());
});
process.on("SIGTERM", () => {
  console.error("[server] received SIGTERM");
  process.exit(0);
});
process.on("SIGINT", () => {
  console.error("[server] received SIGINT");
  process.exit(0);
});
