#!/usr/bin/env python3
"""
M7: Snapshot diffing → events.json

Pipeline usage:
  python generate_events.py --snapshot   # Before pipeline: copy current → prev
  python generate_events.py --emit       # After pipeline: diff and write events.json

Event kinds (§4.3 grammar):
  TIER_UP / TIER_DOWN — diagnostic_risk changed for a building
  PERMIT              — dob_jobs count increased
  DATA                — aggregate: portfolio scanned, coverage/count summary
  DIVERGE             — aggregate: newly modifier-promoted buildings (base-Low, final-High)

Each event carries: kind, subject, verb, evidence, consequence, run_date
"""

import json, os, sys, shutil, datetime, argparse

BASE_DIR       = os.path.dirname(os.path.abspath(__file__))
ENRICHMENT     = os.path.join(BASE_DIR, "public", "buildingEnrichment.json")
ENRICHMENT_PREV = os.path.join(BASE_DIR, "public", "buildingEnrichment_prev.json")
YOY_DELTAS     = os.path.join(BASE_DIR, "public", "yoy_deltas.json")
EVENTS_JSON    = os.path.join(BASE_DIR, "public", "events.json")
MODEL_META     = os.path.join(BASE_DIR, "data", "model_meta.json")

TIER_RANK = {"Low": 0, "Medium": 1, "High": 2}


def _load(path):
    with open(path) as f:
        return json.load(f)


def _write_atomic(path, data):
    tmp = path + ".tmp"
    try:
        with open(tmp, "w") as f:
            json.dump(data, f, indent=2)
        os.replace(tmp, path)
    except Exception:
        if os.path.exists(tmp):
            os.remove(tmp)
        raise


def _tier_delta(prev_tier, curr_tier):
    """Returns 1 (up), -1 (down), 0 (same/uncertain)."""
    p = TIER_RANK.get(prev_tier)
    c = TIER_RANK.get(curr_tier)
    if p is None or c is None:
        return 0
    return (c > p) - (c < p)


def _is_critical(e):
    """Critical v1.1 filter — matches Q3 sign-off exactly."""
    if not isinstance(e.get("ml_risk"), (int, float)) or e.get("ml_risk", 0) < 0.6:
        return False
    if e.get("norm_delta_23_24") is None:
        return False
    return bool(e.get("outlier_23_24") or e.get("outlier_22_23") or
                e.get("decline_trend_label") == "accelerating")


def _is_divergent(e):
    """Modifier-promoted: ML base Low/Medium but rule tier High."""
    ml = e.get("ml_risk")
    return (isinstance(ml, (int, float)) and ml < 0.6 and
            e.get("diagnostic_risk") == "High")


def _fmt_addr(addr):
    return addr.title()


def _delta_evidence(yoy_e, which_period):
    """Format a delta evidence clause from yoy data."""
    field = f"norm_delta_{which_period}"
    val = yoy_e.get(field)
    if val is None:
        return None
    pct = val
    sign = "+" if pct > 0 else ""
    return f"Δ '{which_period[-2:]} {sign}{pct:.1f}%"


# ── Snapshot ──────────────────────────────────────────────────────────────────

def snapshot():
    try:
        shutil.copy2(ENRICHMENT, ENRICHMENT_PREV)
    except FileNotFoundError:
        print(f"[snapshot] {ENRICHMENT} not found — nothing to snapshot", file=sys.stderr)
        sys.exit(1)
    print(f"[snapshot] saved → {ENRICHMENT_PREV}")


# ── Emit ──────────────────────────────────────────────────────────────────────

def emit():
    curr = _load(ENRICHMENT)
    yoy  = {k.upper(): v for k, v in _load(YOY_DELTAS).items()} if os.path.exists(YOY_DELTAS) else {}

    run_date = None
    if os.path.exists(MODEL_META):
        run_date = _load(MODEL_META).get("run_date")

    generated_at = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    first_run    = not os.path.exists(ENRICHMENT_PREV)

    if first_run:
        _emit_first_run(curr, yoy, run_date, generated_at)
        return

    prev = _load(ENRICHMENT_PREV)
    _emit_diff(curr, prev, yoy, run_date, generated_at)


def _emit_first_run(curr, yoy, run_date, generated_at):
    divergent = [a for a, e in curr.items() if _is_divergent(e)]
    critical  = [a for a, e in curr.items() if _is_critical(e)]

    events = [
        {
            "kind":        "DATA",
            "subject":     f"{len(curr):,} buildings",
            "verb":        "scanned — first pipeline run",
            "evidence":    (f"{len(critical)} Critical, {len(divergent)} modifier-promoted · "
                           f"no prior snapshot to diff against"),
            "consequence": "Review queue",
        }
    ]
    if divergent:
        events.append({
            "kind":        "DIVERGE",
            "subject":     f"{len(divergent)} buildings",
            "verb":        "are modifier-promoted",
            "evidence":    "ML base Low, rule tier High after trend/statute modifiers",
            "consequence": "Review queue",
            "count":       len(divergent),
        })

    _finalize(events, run_date, prev_run_date=None, generated_at=generated_at, first_run=True)


def _emit_diff(curr, prev, yoy, run_date, generated_at):
    tier_ups   = []
    tier_downs = []
    permits    = []
    new_divergent = []
    data_changed_count = 0

    all_addrs = set(curr) | set(prev)

    for addr in all_addrs:
        c = curr.get(addr, {})
        p = prev.get(addr, {})
        if not c or not p:
            continue

        # Tier change
        delta = _tier_delta(p.get("diagnostic_risk"), c.get("diagnostic_risk"))
        if delta == 1:
            tier_ups.append((addr, c, p))
            data_changed_count += 1
        elif delta == -1:
            tier_downs.append((addr, c, p))
            data_changed_count += 1

        # Permit (dob_jobs increase)
        prev_jobs = float(p.get("dob_jobs") or 0)
        curr_jobs = float(c.get("dob_jobs") or 0)
        if curr_jobs > prev_jobs:
            permits.append((addr, c, prev_jobs, curr_jobs))
            data_changed_count += 1

        # Newly divergent
        was_div = _is_divergent(p)
        now_div = _is_divergent(c)
        if now_div and not was_div:
            new_divergent.append(addr)

    new_addrs = set(curr) - set(prev)

    events = []

    # TIER_UP — sorted by ml_risk desc
    tier_ups.sort(key=lambda x: -(x[1].get("ml_risk") or 0))
    for addr, c, p in tier_ups:
        yoy_e   = yoy.get(addr, {})
        now_crit = _is_critical(c)
        ev_parts = []

        if now_crit:
            verb = "entered Critical"
            if c.get("outlier_22_23") and not c.get("outlier_23_24"):
                d = _delta_evidence(yoy_e, "22_23")
                if d:
                    ev_parts.append(d + " was the outlier drop")
            elif c.get("outlier_23_24"):
                d = _delta_evidence(yoy_e, "23_24")
                if d:
                    ev_parts.append(d + " outlier")
            if c.get("decline_trend_label") == "accelerating":
                ev_parts.append("decline accelerating")
            ev_parts.append(f"was {p.get('diagnostic_risk', '—')}")
        else:
            verb = f"moved {p.get('diagnostic_risk')} → {c.get('diagnostic_risk')}"
            ml = c.get("ml_risk")
            if isinstance(ml, (int, float)):
                ev_parts.append(f"ml_risk {ml:.2f}")
            trend = c.get("decline_trend_label")
            if trend:
                ev_parts.append(f"trend {trend}")

        events.append({
            "kind":        "TIER_UP",
            "subject":     _fmt_addr(addr),
            "verb":        verb,
            "evidence":    " · ".join(ev_parts) if ev_parts else f"diagnostic_risk → {c.get('diagnostic_risk')}",
            "consequence": "Open case file",
            "address":     addr,
        })

    # TIER_DOWN
    for addr, c, p in tier_downs:
        events.append({
            "kind":        "TIER_DOWN",
            "subject":     _fmt_addr(addr),
            "verb":        f"moved {p.get('diagnostic_risk')} → {c.get('diagnostic_risk')}",
            "evidence":    f"was {p.get('diagnostic_risk')}",
            "consequence": "Review",
            "address":     addr,
        })

    # PERMIT — individual per building
    for addr, c, prev_jobs, curr_jobs in permits:
        delta_n = int(curr_jobs - prev_jobs)
        cluster = c.get("cluster_name", "")
        ev = f"jobs {int(prev_jobs)} → {int(curr_jobs)}"
        if cluster:
            ev += f" · cluster {cluster}"
        events.append({
            "kind":        "PERMIT",
            "subject":     _fmt_addr(addr),
            "verb":        f"gained {delta_n} DOB filing{'s' if delta_n != 1 else ''}",
            "evidence":    ev,
            "consequence": "Review",
            "address":     addr,
        })

    # DIVERGE aggregate
    if new_divergent:
        events.append({
            "kind":        "DIVERGE",
            "subject":     f"{len(new_divergent)} building{'s' if len(new_divergent) != 1 else ''}",
            "verb":        "newly modifier-promoted",
            "evidence":    "ML base Low, rule tier High after trend/statute modifiers",
            "consequence": "Review queue",
            "count":       len(new_divergent),
            "addresses":   new_divergent,
        })

    # DATA aggregate — always one entry
    if data_changed_count or new_addrs:
        parts = []
        if data_changed_count:
            parts.append(f"{data_changed_count} threshold crossing{'s' if data_changed_count != 1 else ''}")
        if new_addrs:
            parts.append(f"{len(new_addrs)} new building{'s' if len(new_addrs) != 1 else ''}")
        evidence = " · ".join(parts)
    else:
        evidence = "nothing crossed a threshold"

    events.append({
        "kind":        "DATA",
        "subject":     f"{len(curr):,} buildings",
        "verb":        "scanned",
        "evidence":    evidence,
        "consequence": "Review run" if data_changed_count else None,
    })

    _finalize(events, run_date, prev_run_date=None, generated_at=generated_at, first_run=False)


def _finalize(events, run_date, prev_run_date, generated_at, first_run):
    payload = {
        "run_date":      run_date,
        "prev_run_date": prev_run_date,
        "generated_at":  generated_at,
        "first_run":     first_run,
        "events":        events,
    }
    _write_atomic(EVENTS_JSON, payload)
    print(f"[events] {len(events)} event{'s' if len(events) != 1 else ''} → {EVENTS_JSON}")
    for e in events:
        print(f"  [{e['kind']:<10}] {e['subject']} — {e['verb']}")


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    grp = parser.add_mutually_exclusive_group(required=True)
    grp.add_argument("--snapshot", action="store_true",
                     help="Copy current enrichment → prev (run BEFORE pipeline)")
    grp.add_argument("--emit",     action="store_true",
                     help="Diff prev vs current, write events.json (run AFTER pipeline)")
    args = parser.parse_args()

    if args.snapshot:
        snapshot()
    else:
        emit()
