#!/usr/bin/env node
/**
 * Neo Test Suite — Automated Regression Script
 *
 * Runs all 20 test questions against the ConEd Dashboard AI backend
 * and checks for expected key phrases in each response.
 *
 * Usage:
 *   node test_neo_suite.mjs              # against localhost:3001
 *   API_PORT=3001 node test_neo_suite.mjs
 *
 * Requires the dashboard API server to be running (npm run dev:api).
 */

const API_BASE = `http://localhost:${process.env.API_PORT || 3001}`;
const PASSWORD = process.env.DASHBOARD_PASSWORD || "coned-steam-2026";

// ── Color helpers ───────────────────────────────────────────────────────────
const GREEN  = "\x1b[32m";
const RED    = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN   = "\x1b[36m";
const RESET  = "\x1b[0m";
const BOLD   = "\x1b[1m";

function pass(s)  { return `${GREEN}✅ ${s}${RESET}`; }
function fail(s)  { return `${RED}❌ ${s}${RESET}`; }
function warn(s)  { return `${YELLOW}⚠️  ${s}${RESET}`; }
function cyan(s)  { return `${CYAN}${s}${RESET}`; }
function bold(s)  { return `${BOLD}${s}${RESET}`; }

// ── Test Cases ──────────────────────────────────────────────────────────────
const TESTS = [

  // ── Investor / Blackstone Analyst ─────────────────────────────────────────
  {
    id: 1, section: "Investor / Blackstone Analyst",
    question: "Total LL97 exposure 2024 + 2030?",
    expected: [
      "81", "270", "231%", "165", "830",
    ],
  },
  {
    id: 2, section: "Investor / Blackstone Analyst",
    question: "How much does LL97 grow?",
    expected: ["2030", "cap", "dramatic", "3.3", "exposure",],
  },
  {
    id: 3, section: "Investor / Blackstone Analyst",
    question: "Which building types attrition most?",
    expected: ["office", "attrition", "high", "risk",],
  },
  {
    id: 4, section: "Investor / Blackstone Analyst",
    question: "Model reliability / AUC?",
    expected: ["0.645", "bimodal", "AUC",],
  },
  {
    id: 5, section: "Investor / Blackstone Analyst",
    question: "Data freshness?",
    expected: ["2026", "2024", "2025", "LL84",],
  },
  {
    id: 6, section: "Investor / Blackstone Analyst",
    question: "321 missing 2024 buildings — worry?",
    expected: ["321", "attention", "warrant", "compliance", "missing",],
  },
  {
    id: 7, section: "Investor / Blackstone Analyst",
    question: "GBM math — loss function + boosting?",
    expected: ["log loss", "cross-entropy", "deviance", "residual", "gradient",],
  },

  // ── ELI5 / Actionability ──────────────────────────────────────────────────
  {
    id: 8, section: "ELI5 / Actionability",
    question: "[SIMPLE MODE] Explain the risk score",
    expected: ["risk", "score", "checkup", "building", "warning",],
  },
  {
    id: 9, section: "ELI5 / Actionability",
    question: "Building at 0.95 — next steps?",
    expected: ["outreach", "timeline", "LL97", "permit", "extreme risk",],
  },
  {
    id: 10, section: "ELI5 / Actionability",
    question: "213 skip-year buildings?",
    expected: ["2022", "2024", "2023", "gap", "missing",],
  },
  {
    id: 11, section: "ELI5 / Actionability",
    question: "Selection bias in training labels?",
    expected: ["782", "selection bias", "label", "GBM", "training",],
  },

  // ── Input Validation — server-side graceful fallback ──────────────────────
  {
    id: 12, section: "Input Validation",
    question: "qq4",
    expected: ["rephrase", "question",],
  },
  {
    id: 13, section: "Input Validation",
    question: "yes",
    expected: ["ask", "dashboard", "help",],
  },
  {
    id: 14, section: "Input Validation",
    question: "hi",
    expected: ["welcome", "dashboard", "conEd", "steam", "manhattan",],
  },

  // ── Technical Deep-Dive ────────────────────────────────────────────────────
  {
    id: 15, section: "Technical Deep-Dive",
    question: "List all 5 clusters with descriptions",
    expected: ["cluster", "pre-war", "stable", "steam", "post-war", "commercial",],
  },
  {
    id: 16, section: "Technical Deep-Dive",
    question: "SHAP values + feature ranking?",
    expected: ["LL97", "importance", "steam", "feature", "rank",],
  },
  {
    id: 17, section: "Technical Deep-Dive",
    question: "3 biggest data holes (skeptic mode)",
    expected: ["321", "missing", "filing", "data", "27%",],
  },
  {
    id: 18, section: "Technical Deep-Dive",
    question: "LL97 formula + hospital walkthrough",
    expected: ["GHG", "steam", "0.00004493", "4.493", "cap", "penalty", "268",],
  },
  {
    id: 19, section: "Technical Deep-Dive",
    question: "Peer score definition + formula",
    expected: ["z-score", "EUI", "efficient", "peer",],
  },
  {
    id: 20, section: "Technical Deep-Dive",
    question: "Why K=5 not K=3 or K=7?",
    expected: ["silhouette", "0.31", "0.28", "highest", "K=5",],
  },

];

// ── Runner ──────────────────────────────────────────────────────────────────

async function login() {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: PASSWORD }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(`Login failed: ${err.error}`);
  }
  const { token } = await res.json();
  return token;
}

async function ask(token, question) {
  let res;
  try {
    res = await fetch(`${API_BASE}/api/explain`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ question }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (err) {
    return { error: `fetch error: ${err.message}` };
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    return { error: err.error };
  }
  const { answer } = await res.json();
  return { answer: answer ?? "" };
}

function checkExpected(answer, expected) {
  const a = answer.toLowerCase();
  const results = expected.map(e => ({
    phrase: e,
    found: a.includes(e.toLowerCase()),
  }));
  return results;
}

function passesThreshold(checks) {
  // LLM answers are non-deterministic — pass if ≥ threshold/required of phrases match
  const total = checks.length;
  const found = checks.filter(c => c.found).length;

  if (total <= 3) return found >= total - 1; // allow 1 miss for 3-phrase checks
  if (total <= 4) return found >= total - 1; // allow 1 miss for 4-phrase checks
  return found >= total - 2; // allow 2 misses for 5+ phrase checks
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${bold("Neo Test Suite — Automated Regression")}`);
  console.log(`Run date: ${new Date().toISOString().split("T")[0]} against ${API_BASE}\n`);

  let token;
  try {
    token = await login();
    console.log(`${pass("Logged in successfully")}\n`);
  } catch (err) {
    console.log(`${fail("Login failed: " + err.message)}`);
    console.log(`  Make sure the server is running at ${API_BASE}\n`);
    process.exit(1);
  }

  let passed = 0;
  let failed = 0;
  let currentSection = "";

  for (const test of TESTS) {
    if (test.section !== currentSection) {
      currentSection = test.section;
      console.log(`\n${bold(cyan(`── ${currentSection} ──`))}`);
    }

    await new Promise(r => setTimeout(r, 3500)); // 3.5s between calls — stays under 20 req/min AI limiter
    const result = await ask(token, test.question);

    if (result.error) {
      console.log(`  ${fail(`Q${test.id}: ${test.question}`)}`);
      console.log(`         API error: ${result.error}`);
      failed++;
      continue;
    }

    const checks = checkExpected(result.answer, test.expected);
    const foundCount = checks.filter(c => c.found).length;
    const totalCount = checks.length;
    const passedCheck = passesThreshold(checks);

    // Show first 120 chars of answer as preview
    const preview = result.answer.slice(0, 120).replace(/\n/g, " ") + (result.answer.length > 120 ? "…" : "");

    if (passedCheck) {
      console.log(`  ${pass(`Q${String(test.id).padEnd(2)} ${test.question}`)}`);
      passed++;
    } else {
      const missing = checks.filter(c => !c.found).map(c => `"${c.phrase}"`).join(", ");
      console.log(`  ${fail(`Q${String(test.id).padEnd(2)} ${test.question}`)}`);
      console.log(`         Missing: ${missing}`);
      console.log(`         Matched ${foundCount}/${totalCount} expected phrases`);
      failed++;
    }

    // Print answer preview (truncated)
    console.log(`         ${warn(preview)}`);
    console.log("");
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  const total = passed + failed;
  const barLen = 30;
  const filled = Math.round((passed / total) * barLen);
  const bar = `${GREEN}${"█".repeat(filled)}${RED}${"█".repeat(barLen - filled)}${RESET}`;

  console.log(`${bold("─".repeat(50))}`);
  console.log(`${bold("RESULTS SUMMARY")}`);
  console.log(`${bold("─".repeat(50))}`);
  console.log(`  ${bar}`);
  console.log(`  ${pass(`${passed}/${total} passing`)}  ${fail(`${failed}/${total} failing`)}`);
  console.log(`  Score: ${((passed / total) * 100).toFixed(0)}%`);
  console.log(`  Date:  ${new Date().toISOString().split("T")[0]}`);
  console.log(`  Host:  ${API_BASE}\n`);

  if (failed > 0) {
    console.log(`${warn("Some checks failed. This could mean:")}`);
    console.log(`  1. The AI answered differently than expected (content change)`);
    console.log(`  2. Expected phrases are too strict (update test.expected[])`);
    console.log(`  3. The server returned an error for some questions\n`);
    process.exit(1);
  } else {
    console.log(`${pass("All 20 tests pass — the AI knows its numbers cold.")}\n`);
    process.exit(0);
  }
}

main().catch(err => {
  console.error(`${fail("Fatal: " + err.message)}`);
  process.exit(1);
});