#!/usr/bin/env python3
"""
Smoke test — ConEd Dashboard AI Endpoints
===========================================
Self-healing: re-logs in on 401, restarts server on connection-refused,
retries rate limits with exponential backoff, generates a test report.
Paced generously for Groq free tier (12k TPM, 30 RPM).

Usage:  python3 smoke_test.py [--report]
        --report   : write smoke_test_report.md with full results
"""
import json, sys, os, time, subprocess, urllib.request, urllib.error

BASE = "http://localhost:3001"
PASSWORD = "coned-steam-2026"
PROJECT_DIR = "/Users/icaraballo/Documents/GitHub/coned-dashboard"

questions_explain = [
    "Total LL97 exposure 2024 + 2030?",
    "How much does LL97 grow?",
    "Which building types attrition most?",
    "Model reliability / AUC?",
    "Explain the risk score like I'm 5",
    "Building at 0.95 — next steps?",
    "Selection bias in training labels?",
    "5 clusters + descriptions?",
    "SHAP values + feature ranking?",
    "LL97 formula + hospital walkthrough?",
    "Why K=5 not K=3 or K=7?",
]

questions_query = [
    "show me high risk buildings",
    "buildings over 50000 sqft with risk above 0.8",
]

# ── Helpers ──

def restart_server():
    """Kill existing node process on 3001, restart, wait for 200 OK."""
    subprocess.run(
        f"lsof -ti :3001 | xargs kill -9 2>/dev/null; sleep 1",
        shell=True, capture_output=True)
    subprocess.Popen(
        ["node", "api/server.js"], cwd=PROJECT_DIR,
        stdout=open("/tmp/server.log", "w"), stderr=subprocess.STDOUT)
    # wait up to 10s for server
    for _ in range(20):
        time.sleep(0.5)
        try:
            req = urllib.request.Request(
                f"{BASE}/api/auth/login", data=json.dumps({"password": PASSWORD}).encode(),
                headers={"Content-Type": "application/json"}, method="POST")
            with urllib.request.urlopen(req, timeout=3) as r:
                if r.status == 200:
                    return True
        except Exception:
            continue
    return False

def login():
    data = json.dumps({"password": PASSWORD}).encode()
    req = urllib.request.Request(
        f"{BASE}/api/auth/login", data=data,
        headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read())["token"]

def call_endpoint(token, endpoint, payload, timeout=40):
    """Call an endpoint; returns (success: bool, data: dict|None, error: str|None)."""
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"{BASE}{endpoint}", data=data,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
        method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return True, json.loads(r.read()), None
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")[:300]
        return False, None, (e.code, detail)
    except Exception as e:
        return False, None, ("CONNREFUSED" if "refused" in str(e).lower() else str(e)[:200])

def robust_explain(token, question, results, generation=1):
    """
    Robust call to /api/explain with self-healing:
      502/429 → retry with backoff
      401     → re-login + retry
      CONNREFUSED → restart server + retry
    Returns (ok, len, preview, generation)
    """
    max_attempts = 5
    t0 = time.time()
    for attempt in range(1, max_attempts + 1):
        ok, data, err = call_endpoint(token, "/api/explain", {"question": question})
        if ok:
            ans = data.get("answer", "")
            return True, len(ans), ans[:150], generation, time.time() - t0

        # Parse error
        code, detail = err if isinstance(err, tuple) else ("UNKNOWN", str(err))
        detail_lower = detail.lower()

        # 502 / 429 → rate limit; backoff and retry
        if code in (429, 502) and "try again" in detail_lower:
            wait = 2 ** (attempt + 2)  # 8, 16, 32, 64
            print(f"        ⏳ attempt {attempt}/{max_attempts}: HTTP {code} — waiting {wait}s")
            time.sleep(wait)
            continue

        # 401 → session expired; re-login and retry
        if code == 401:
            print(f"        🔑 attempt {attempt}/{max_attempts}: session expired — re-logging in")
            token = login()
            results.append(("RELOGIN", token[:8], "", ""))
            continue

        # Connection refused → server died; restart
        if code == "CONNREFUSED":
            print(f"        💀 attempt {attempt}/{max_attempts}: server down — restarting")
            if not restart_server():
                return False, 0, f"FAILED restart server", generation, time.time() - t0
            token = login()
            results.append(("RESTART", token[:8], "", ""))
            continue

        # Other error (fallback exhausted, internal error)
        return False, 0, f"HTTP {code}: {detail[:200]}", generation, time.time() - t0

    return False, 0, f"Exhausted {max_attempts} attempts", generation, time.time() - t0

def robust_query(token, question, results, generation=1):
    """Robust call to /api/query with same self-healing pattern."""
    max_attempts = 5
    t0 = time.time()
    for attempt in range(1, max_attempts + 1):
        ok, data, err = call_endpoint(token, "/api/query", {"question": question})
        if ok:
            spec = data.get("spec", {})
            risk_min = spec.get("risk_min", "?")
            return True, f"risk_min={risk_min}", json.dumps(spec)[:200], generation, time.time() - t0

        code, detail = err if isinstance(err, tuple) else ("UNKNOWN", str(err))
        detail_lower = detail.lower()

        if code in (429, 502) and "try again" in detail_lower:
            wait = 2 ** (attempt + 2)
            print(f"        ⏳ attempt {attempt}/{max_attempts}: HTTP {code} — waiting {wait}s")
            time.sleep(wait)
            continue

        if code == 401:
            print(f"        🔑 attempt {attempt}/{max_attempts}: session expired — re-logging in")
            token = login()
            results.append(("RELOGIN", token[:8], "", ""))
            continue

        if code == "CONNREFUSED":
            print(f"        💀 attempt {attempt}/{max_attempts}: server down — restarting")
            if not restart_server():
                return False, "RESTART_FAILED", f"Could not restart server", generation, time.time() - t0
            token = login()
            results.append(("RESTART", token[:8], "", ""))
            continue

        return False, f"HTTP {code}", detail[:200], generation, time.time() - t0

    return False, "EXHAUSTED", f"Exhausted {max_attempts} attempts", generation, time.time() - t0

# ── Main ──

def main():
    write_report = "--report" in sys.argv
    results = []  # list of (type, detail, ...) for side events (relogin, restart)

    print("=" * 68)
    print("  SMOKE TEST — ConEd Dashboard AI Endpoints")
    print("  Pacing: ~20s between calls (Groq free tier-aware)")
    print("=" * 68)

    # Login
    print("\n  [🔄] Logging in...", end=" ", flush=True)
    try:
        token = login()
        print("✅\n")
    except Exception as e:
        print(f"❌  Login failed: {e}")
        sys.exit(1)

    total = len(questions_explain) + len(questions_query)
    passed, failed = 0, 0
    explain_results = []
    query_results = []

    # ── /api/explain ──
    print(f"  ── /api/explain ({len(questions_explain)} questions) ──\n")
    for i, q in enumerate(questions_explain, 1):
        label = q[:70]
        print(f"  [{i:02d}/{total:02d}] {label}")
        ok, nchars, preview, gen, elapsed = robust_explain(token, q, results)
        if ok and nchars > 50:
            passed += 1
            icon = "✅"
        elif ok and nchars > 0:
            passed += 1
            icon = "⚠️"  # short answer but present
        else:
            failed += 1
            icon = "❌"
        explain_results.append((i, q, icon, nchars, preview[:120], gen, round(elapsed, 1)))
        print(f"         {icon} [{nchars:4d} chars in {elapsed:.0f}s] v{gen}")
        if icon != "✅":
            print(f"         ↳ {preview[:120]}")

        # Pace between questions
        if i < len(questions_explain):
            print(f"         ⏱  waiting 20s...", end=" ", flush=True)
            time.sleep(20)
            print("done")

    # ── /api/query ──
    print(f"\n  ── /api/query ({len(questions_query)} queries) ──\n")
    for i, q in enumerate(questions_query, 1):
        print(f"       ⏱  waiting 20s...", end=" ", flush=True)
        time.sleep(20)
        print("done")
        label = q[:70]
        print(f"  [{i + len(questions_explain):02d}/{total:02d}] {label}")
        ok, detail, preview, gen, elapsed = robust_query(token, q, results)
        if ok:
            passed += 1
            icon = "✅"
        else:
            failed += 1
            icon = "❌"
        query_results.append((i + len(questions_explain), q, icon, detail, preview[:120], gen, round(elapsed, 1)))
        print(f"         {icon} {detail} [{elapsed:.0f}s] v{gen}")
        if icon != "✅":
            print(f"         ↳ {preview[:120]}")

    # ── Summary ──
    print(f"\n{'=' * 68}")
    print(f"  RESULTS: {passed}/{total} passed, {failed} failed")
    if passed == total:
        print("  ✅ ALL TESTS PASSED — Dashboard AI is fully operational")
    elif failed == 0:
        print("  ⚠️  All responded but some had short answers (check report)")
    else:
        print(f"  ⚠️  {failed} test(s) failed — see report for details")

    # Side events
    restarts = sum(1 for r in results if r[0] == "RESTART")
    relogins = sum(1 for r in results if r[0] == "RELOGIN")
    if restarts:
        print(f"  🔄 Server restarted {restarts} time(s) during test")
    if relogins:
        print(f"  🔑 Re-logged in {relogins} time(s) during test")
    print(f"{'=' * 68}")

    # ── Report ──
    if write_report:
        report_path = os.path.join(PROJECT_DIR, "smoke_test_report.md")
        with open(report_path, "w") as f:
            f.write("# Smoke Test Report\n\n")
            f.write(f"**Date**: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}\n\n")
            f.write("## /api/explain\n\n")
            f.write("| # | Question | Result | Chars | Duration | Preview |\n")
            f.write("|---|----------|--------|-------|----------|--------|\n")
            for (i, q, icon, nchars, preview, gen, dur) in explain_results:
                q_safe = q.replace("|", "\\|")
                p_safe = preview.replace("|", "\\|")
                f.write(f"| {i} | {q_safe} | {icon} | {nchars} | {dur}s | {p_safe} |\n")
            f.write("\n## /api/query\n\n")
            f.write("| # | Question | Result | Detail | Duration | Preview |\n")
            f.write("|---|----------|--------|--------|----------|--------|\n")
            for (i, q, icon, detail, preview, gen, dur) in query_results:
                q_safe = q.replace("|", "\\|")
                d_safe = detail.replace("|", "\\|")
                p_safe = preview.replace("|", "\\|")
                f.write(f"| {i} | {q_safe} | {icon} | {d_safe} | {dur}s | {p_safe} |\n")
            f.write(f"\n## Summary\n\n- **Passed**: {passed}/{total}\n- **Failed**: {failed}/{total}\n")
            if restarts:
                f.write(f"- **Server restarts**: {restarts}\n")
            if relogins:
                f.write(f"- **Re-logins**: {relogins}\n")
            f.write(f"- **Status**: {'✅ All passed' if passed == total else '⚠️  Some failures'}\n")
        print(f"\n  📄 Report written to smoke_test_report.md")

    return 0 if passed == total else 1

if __name__ == "__main__":
    sys.exit(main())