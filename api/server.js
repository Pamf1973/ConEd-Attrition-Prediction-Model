/* global process */
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { readFileSync } from "fs";
import { resolve } from "path";
import { randomBytes, timingSafeEqual } from "crypto";

import dotenv from "dotenv";
import { EXPLAIN_PROMPT } from "./prompts/explainPrompt.js";
import { csvCell, validateSpec, _isRetryable, ALLOWED_SORT_BY, ALLOWED_SORT_DIR, ALLOWED_SIGNALS, ALLOWED_USES, ALLOWED_CLUSTERS } from "./utils.js";

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

// Railway terminates TLS at its load balancer and forwards the real client IP via
// X-Forwarded-For. Railway strips client-supplied XFF headers before appending
// its own, so trust proxy=1 (trust exactly one hop from right) safely resolves
// to the real client IP. Without this, express-rate-limit throws
// ERR_ERL_UNEXPECTED_X_FORWARDED_FOR and cannot identify clients for rate limiting.
// If a CDN is ever placed in front of Railway, increment this count to match
// the total number of trusted proxy hops.
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);

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
  const publicPath = resolve(process.cwd(), "public", filename);
  const distPath   = resolve(process.cwd(), "dist", filename);
  try {
    return readFileSync(publicPath, "utf8");
  } catch (primaryErr) {
    console.warn(`[startup] ${filename}: public/ read failed (${primaryErr.code ?? primaryErr.message}), trying dist/`);
    try {
      return readFileSync(distPath, "utf8");
    } catch (fallbackErr) {
      throw new Error(
        `FATAL: cannot load ${filename} — public/ (${primaryErr.code ?? primaryErr.message}), dist/ (${fallbackErr.code ?? fallbackErr.message})`
      );
    }
  }
}
const DATA_CACHE = {
  buildings:  loadJsonFile("buildings.json"),
  enrichment: loadJsonFile("buildingEnrichment.json"),
  yearly:     loadJsonFile("yearly.json"),
  yoyDeltas:  loadJsonFile("yoy_deltas.json"),
};

// ETag for the enrichment payload — changes each time the server starts (i.e. after redeploy).
// Lets browsers skip re-downloading 1.17MB when the data hasn't changed within a session.
const ENRICHMENT_ETAG = `"enrich-${Date.now()}"`;

// Parsed versions used by endpoints that need to iterate over the data (e.g. CSV export)
function parseJsonFile(name, raw) {
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`FATAL: ${name} contains invalid JSON — ${err.message}`);
  }
}
const DATA_PARSED = {
  buildings:  parseJsonFile("buildings.json",          DATA_CACHE.buildings),
  enrichment: parseJsonFile("buildingEnrichment.json", DATA_CACHE.enrichment),
  yearly:     parseJsonFile("yearly.json",             DATA_CACHE.yearly),
  yoyDeltas:  parseJsonFile("yoy_deltas.json",         DATA_CACHE.yoyDeltas),
};

// ── Protected Data Endpoints ──────────────────────────────────────────────────
app.get("/api/data/buildings",   requireAuth, (_req, res) => res.type("json").send(DATA_CACHE.buildings));
app.get("/api/data/enrichment",  requireAuth, (req, res) => {
  if (req.headers["if-none-match"] === ENRICHMENT_ETAG) return res.status(304).end();
  res.setHeader("ETag", ENRICHMENT_ETAG);
  res.setHeader("Cache-Control", "private, no-cache");
  res.type("json").send(DATA_CACHE.enrichment);
});
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
  if (risk_min !== undefined) {
    const rmin = parseFloat(risk_min);
    if (!Number.isFinite(rmin)) return res.status(400).json({ error: "risk_min must be a number" });
    rows = rows.filter(b => Number.isFinite(b.risk) && b.risk >= rmin);
  }
  if (risk_max !== undefined) {
    const rmax = parseFloat(risk_max);
    if (!Number.isFinite(rmax)) return res.status(400).json({ error: "risk_max must be a number" });
    rows = rows.filter(b => Number.isFinite(b.risk) && b.risk <= rmax);
  }
  if (use)      rows = rows.filter(b => b.use === use);
  if (signal)   rows = rows.filter(b => b.signal === signal);
  if (ll97_over === "1" || ll97_over === "true")  rows = rows.filter(b => b.ll97_over_2024 === 1);
  if (ll97_over === "0" || ll97_over === "false") rows = rows.filter(b => b.ll97_over_2024 === 0);
  if (cluster_name) rows = rows.filter(b => b.cluster_name === cluster_name);
  if (search) {
    const q = search.slice(0, 200).toLowerCase();
    rows = rows.filter(b =>
      [b.address, b.use, b.cluster_name, b.sc_class].some(f => (f ?? "").toLowerCase().includes(q))
    );
  }

  // Sort — use the same allow-list as validateSpec to prevent drift
  const sortKey = ALLOWED_SORT_BY.includes(sort_by) ? sort_by : "risk";
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
    enrichAlertDescriptions(top50).catch((err) => {
      console.error("[enrich] top-level enrichment failure:", err?.message?.slice(0, 200) ?? String(err));
    });
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
        console.warn(`[enrich] ${alert.address}: attempt 1 failed (${err.message?.slice(0, 100)}), retrying…`);
        if (!_isRetryable(String(err.message ?? err))) {
          console.warn(`[enrich] ${alert.address}: non-retryable error — skipping retries`);
          return;
        }
        for (let retry = 1; retry <= MAX_RETRIES; retry++) {
          await new Promise(r => setTimeout(r, retry * 2000));
          try {
            const raw = await callLLM(prompt, "You are a ConEd steam operations advisor. Respond with raw JSON only — no markdown, no code fences.", ENRICH_TIMEOUT, 1024);
            const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
            const parsed = JSON.parse(cleaned);
            if (typeof parsed.description === "string") alert.description = parsed.description.trim().slice(0, 160);
            if (typeof parsed.recommendation === "string") alert.recommendation = parsed.recommendation.trim().slice(0, 240);
            break; // success — exit retry loop
          } catch (retryErr) {
            if (retry === MAX_RETRIES) {
              console.warn(`[enrich] ${alert.address}: all ${MAX_RETRIES} retries exhausted — ${retryErr.message?.slice(0, 120) ?? String(retryErr)}`);
            }
          }
        }
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
computeProactiveAlerts().catch((err) => {
  console.error("[alerts] startup computation failed:", err?.message?.slice(0, 200) ?? String(err));
});

// Refresh every 30 minutes — 5min was too aggressive and saturated per-minute LLM rate limits
setInterval(() => {
  computeProactiveAlerts().catch((err) => {
    console.error("[alerts] scheduled recompute failed:", err?.message?.slice(0, 200) ?? String(err));
  });
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

// ── /api/meta — dataset freshness metadata ────────────────────────────────────
app.get("/api/meta", (_req, res) => {
  const meta = {
    dataset_date: "2026-06",
    steam_year: "2024",
    ll84_date: "2025-05",
    model_version: "GBM-v1+SHAP",
    buildings: DATA_PARSED.buildings?.length ?? 0,
  };
  res.setHeader("Cache-Control", "private, max-age=3600");
  res.json(meta);
});

// Protect public JSON files from direct exposure in production build folder
app.get(["/buildings.json", "/buildingEnrichment.json", "/yearly.json", "/yoy_deltas.json", "/yoy_summary.json"], (req, res) => {
  res.status(403).json({ error: "Access Forbidden — Data is protected" });
});

// Serve built frontend assets. index.html must never be cached — browsers that
// serve a stale index.html will reference old Vite chunk hashes that no longer
// exist after a redeploy, causing "Failed to fetch dynamically imported module".
// Hashed asset files (*.js, *.css with content hash in filename) get long-lived
// immutable caching handled by express.static's default max-age.
app.use(express.static(resolve(process.cwd(), "dist"), {
  setHeaders(res, filePath) {
    if (filePath.endsWith("index.html")) {
      res.setHeader("Cache-Control", "no-store");
    }
  },
}));

// Wrap user input in XML tags to structurally isolate it from the system prompt,
// and strip the most common injection patterns. This is defense-in-depth —
// validateSpec() still enforces the schema on output regardless.
const INJECTION_RE = /\b(ignore|forget|disregard|override|system prompt|instructions|you are now|act as|jailbreak|new task|pretend|roleplay)\b/gi;
function sanitizeQuestion(q) {
  const stripped = q.replace(INJECTION_RE, "[filtered]").trim();
  const escaped = stripped.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<user_query>${escaped}</user_query>`;
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
    const body = await res.text().catch((e) => `[body read failed: ${e.message}]`);
    throw new Error(`Claude API ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

async function callGroq(question, systemOverride, timeoutMs = 10_000, maxTokens = 512) {
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
      max_tokens:  maxTokens,
      messages: [
        { role: "system", content: systemOverride ?? SYSTEM_PROMPT },
        { role: "user",   content: question },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch((e) => `[body read failed: ${e.message}]`);
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
    const body = await res.text().catch((e) => `[body read failed: ${e.message}]`);
    throw new Error(`OpenRouter API ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
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
      return await callGroq(question, systemOverride, timeoutMs, maxTokens);
    } catch (e) {
      if (!_isRetryable(String(e.message))) throw e;
      console.warn("[callLLM] Groq unavailable — falling back:", e.message.slice(0, 80));
    }
  }

  if (OPENROUTER_KEY) {
    try {
      return await callOpenRouter(question, systemOverride, timeoutMs, maxTokens);
    } catch (e) {
      if (!_isRetryable(String(e.message))) throw e;
      console.error("[callLLM] OpenRouter fallback failed:", e.message.slice(0, 80));
    }
  }

  throw new Error("All LLM providers unavailable — try again later");
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
// Entries are kept for 24 hours so stale-serve can return them on LLM failure.
// Fresh-serve window is still 15 minutes (checked at read time).
const explainCache = new Map();
// Periodic cleanup every 5 minutes: evict entries older than 24 hours
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of explainCache) {
    if (now - entry.timestamp > 24 * 60 * 60 * 1000) explainCache.delete(key);
  }
}, 5 * 60 * 1000).unref();

// ── Static FAQ for offline / LLM-failure fallback ────────────────────────────
// Stats are computed once at startup from live data so they stay accurate after retrains.
const _enrVals  = Object.values(DATA_PARSED.enrichment ?? {});
const _bldTotal = DATA_PARSED.buildings?.length ?? 0;
const _hrCount  = _enrVals.filter(e => (e.ml_risk ?? 0) > 0.70).length;
const _hrPct    = _bldTotal > 0 ? (_hrCount  / _bldTotal * 100).toFixed(1) : "N/A";
const _o24Count = _enrVals.filter(e => e.ll97_over_2024 === 1).length;
const _o30Count = _enrVals.filter(e => e.ll97_over_2030 === 1).length;
const _o24Pct   = _bldTotal > 0 ? (_o24Count / _bldTotal * 100).toFixed(1) : "N/A";
const _o30Pct   = _bldTotal > 0 ? (_o30Count / _bldTotal * 100).toFixed(1) : "N/A";

const FAQ = [
  {
    keywords: ["how many", "buildings", "high risk", "count"],
    answer: `There are currently ${_hrCount} high-risk buildings (ml_risk > 0.70) in the portfolio, representing ${_hrPct}% of the ${_bldTotal.toLocaleString()} active steam customers tracked in this dashboard.`
  },
  {
    keywords: ["what is", "ml_risk", "score", "risk score", "attrition risk"],
    answer: "The attrition risk score (ml_risk) is a GBM (Gradient Boosting Machine) model prediction (0–1) of how likely a building is to reduce or cancel steam service within the next cycle. Key drivers include LL97 penalty exposure, steam GHG share, Energy Star score, and peer attrition rates in the same cluster."
  },
  {
    keywords: ["ll97", "penalty", "fine", "compliance", "local law 97"],
    answer: `NYC Local Law 97 sets carbon emissions caps on large buildings. Violations incur a $268/MT CO₂e penalty above the cap. The 2024 cap applies now; the stricter 2030 cap applies from 2030. Currently ${_o24Pct}% of tracked buildings are over the 2024 cap, and ${_o30Pct}% would be over the 2030 cap.`
  },
  {
    keywords: ["cluster", "archetype", "segment", "group", "kmeans"],
    answer: "Buildings are grouped into 5 customer archetypes via K-means clustering: Pre-War Active (22%), Large Commercial (22%), Low-Compliance Commercial (20%), Pre-War Stable (20%), and Mid-Size Post-War (16%). Each cluster has a distinct attrition risk profile."
  },
  {
    keywords: ["energy star", "score", "efficient", "efficiency"],
    answer: "Energy Star score (1–100) measures building energy efficiency relative to similar buildings nationally. Interestingly, the model found that HIGH Energy Star scores correlate with higher attrition risk — well-managed efficient buildings have both the capital and motivation to switch from steam to modern heat-pump systems."
  },
  {
    keywords: ["data", "when", "date", "fresh", "updated", "current"],
    answer: "The dashboard uses ConEd steam consumption data through 2024, LL84 benchmarking data through May 2025, and LL97 penalty calculations based on current NYC compliance rules. The attrition model was trained on verified churn events from 2021–2024."
  },
];

function matchFAQ(question) {
  const q = question.toLowerCase();
  for (const entry of FAQ) {
    const hits = entry.keywords.filter(k => q.includes(k)).length;
    if (hits >= 2) return entry.answer;
  }
  return null;
}

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
    // Stale-serve: return an older cached answer if available (up to 24h old)
    const stale = explainCache.get(safe);
    if (stale) {
      const age_minutes = Math.round((Date.now() - stale.timestamp) / 60_000);
      console.warn(`[/api/explain] LLM failed, stale-serving ${age_minutes}m old answer: ${err.message?.slice(0, 80)}`);
      return res.json({ answer: stale.answer, cached: true, age_minutes, degraded: true });
    }
    // FAQ fallback: check if question matches a pre-computed answer
    const faqAnswer = matchFAQ(safe);
    if (faqAnswer) {
      return res.json({ answer: faqAnswer, cached: true, source: "faq" });
    }
    res.status(502).json({ error: "explain failed — try again" });
  }
});

// ── /api/export/csv ───────────────────────────────────────────────────────────
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

// Terminal error handler — catches anything that reaches next(err) and isn't
// already handled above; prevents Express default from leaking stack traces.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("[server] unhandled express error:", err?.message?.slice(0, 200));
  res.status(500).json({ error: "Internal server error" });
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
