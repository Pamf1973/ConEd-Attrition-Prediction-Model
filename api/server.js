/* global process */
import express from "express";
import rateLimit from "express-rate-limit";
import { readFileSync } from "fs";
import { resolve } from "path";
import { randomBytes } from "crypto";

import dotenv from "dotenv";

// Keep track of inherited keys before dotenv overrides them
const originalAnthropicKey = process.env.ANTHROPIC_API_KEY;
const originalGroqKey = process.env.GROQ_API_KEY;

// Load .env explicitly so it overrides any inherited shell env vars
// (important when running inside Claude Code which sets ANTHROPIC_API_KEY)
dotenv.config({ override: true });

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

// Rate limit: 30 queries / minute per IP
const limiter = rateLimit({
  windowMs: 60_000,
  max: 30,
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
const SESSION_TTL = 8 * 60 * 60 * 1000; // 8 hours

// Sweep expired sessions hourly to prevent unbounded Map growth
setInterval(() => {
  const now = Date.now();
  for (const [token, expiresAt] of activeSessions) {
    if (expiresAt < now) activeSessions.delete(token);
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
  if (password === DASHBOARD_PASSWORD) {
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

// Helper to read JSON safely from public or dist
function readJsonFile(filename) {
  try {
    return readFileSync(resolve(process.cwd(), "public", filename), "utf8");
  } catch {
    return readFileSync(resolve(process.cwd(), "dist", filename), "utf8");
  }
}

// ── Protected Data Endpoints ──────────────────────────────────────────────────
app.get("/api/data/buildings", requireAuth, (req, res) => {
  try {
    const data = readJsonFile("buildings.json");
    res.type("json").send(data);
  } catch {
    res.status(500).json({ error: "Failed to read buildings data" });
  }
});

app.get("/api/data/enrichment", requireAuth, (req, res) => {
  try {
    const data = readJsonFile("buildingEnrichment.json");
    res.type("json").send(data);
  } catch {
    res.status(500).json({ error: "Failed to read enrichment data" });
  }
});

app.get("/api/data/yearly", requireAuth, (req, res) => {
  try {
    const data = readJsonFile("yearly.json");
    res.type("json").send(data);
  } catch {
    res.status(500).json({ error: "Failed to read yearly data" });
  }
});

// Protect public JSON files from direct exposure in production build folder
app.get(["/buildings.json", "/buildingEnrichment.json", "/yearly.json"], (req, res) => {
  res.status(403).json({ error: "Access Forbidden — Data is protected" });
});

// Serve built frontend assets in production (if built)
app.use(express.static(resolve(process.cwd(), "dist")));

// ── LLM provider detection ────────────────────────────────────────────────────
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const GROQ_KEY      = process.env.GROQ_API_KEY;

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

async function callClaude(question) {
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
      system:     SYSTEM_PROMPT,
      messages:   [{ role: "user", content: question }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}`);
  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

async function callGroq(question) {
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
        { role: "system", content: SYSTEM_PROMPT },
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
  "Post-War Multifamily — LL97 Pressure",
  "Pre-War Stable — Low Signal",
  "Large Commercial — Capital Mobilized",
  "Mid-Century Residential — Quiet Attrition",
  "Small Commercial — Neighborhood Contagion",
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
    const raw     = ANTHROPIC_KEY ? await callClaude(question) : await callGroq(question);
    const cleaned = raw.replace(/```(?:json)?\n?/g, "").replace(/```/g, "").trim();
    const parsed  = JSON.parse(cleaned);
    const spec    = validateSpec(parsed);
    res.json({ spec, provider: ANTHROPIC_KEY ? "claude-haiku" : "groq-llama3.3" });
  } catch (err) {
    console.error("[/api/query]", err.message);
    res.status(502).json({ error: "LLM query failed — try again" });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok:       true,
    provider: ANTHROPIC_KEY ? "claude-haiku" : GROQ_KEY ? "groq-llama3.3" : "none",
  });
});

app.listen(PORT, () => {
  const provider = ANTHROPIC_KEY ? "Claude Haiku" : GROQ_KEY ? "Groq Llama 3.3" : "NO KEY SET";
  console.log(`[api] listening on :${PORT} | provider: ${provider}`);
});
