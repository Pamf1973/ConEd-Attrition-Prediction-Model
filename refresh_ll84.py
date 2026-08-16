#!/usr/bin/env python3
"""
Refresh ll84_latest_matched.json with the latest NYC OpenData LL84 report year.
Dataset: NYC Energy Benchmarking / LL84  —  Socrata ID: 5zyy-y8am

Steps:
  1. Load BBLs from data/steam-buildings-geocoded.csv (same join as pull_ml_features.py)
  2. Discover Socrata field names from a sample record (handles schema changes)
  3. Fetch target year's records for our BBLs, 30/chunk to stay under URL limits
  4. Append new year records to data/ml_features/ll84_latest_matched.json
  5. Update public/yearly.json with steam_<year> for each matched building
  6. Re-run yoy_analysis.py to rebuild yoy_deltas.json (skip with --no-yoy)

Run:
  /opt/homebrew/bin/python3.13 refresh_ll84.py              # default: 2024
  /opt/homebrew/bin/python3.13 refresh_ll84.py --year 2023  # backfill
  /opt/homebrew/bin/python3.13 refresh_ll84.py --dry-run    # fetch only, no writes

After this completes, re-run the full ML pipeline:
  kmeans_model.py -> ll97_model.py -> update_enrichment_risk.py
"""

import csv, json, os, ssl, subprocess, sys, time, argparse
from urllib.request import urlopen
from urllib.parse import urlencode

BASE     = os.path.dirname(__file__)
DATA_DIR = os.path.join(BASE, "../coned-3d-map/data")
ML_DIR   = os.path.join(DATA_DIR, "ml_features")
CSV_FILE = os.path.join(DATA_DIR, "steam-buildings-geocoded.csv")
LL84_FILE  = os.path.join(ML_DIR, "ll84_latest_matched.json")
YEARLY_FILE = os.path.join(BASE, "public/yearly.json")
BBL_COL  = "NYC Borough, Block and Lot (BBL)"
DATASET  = "5zyy-y8am"

ctx = ssl._create_unverified_context()

# ── Field name variants — Socrata column names change between LL84 vintages ──
# Each tuple lists names to try in order; first match wins.
FIELD_CANDIDATES = {
    "address":            ["address_1", "property_name", "address"],
    "bbl":                ["nyc_borough_block_and_lot", "bbl", "nyc_bbl"],
    "report_year":        ["report_year", "year_ending", "reporting_year"],
    "district_steam_kbtu":["district_steam_use_kbtu", "district_steam_kbtu"],
    "energy_star_score":  ["energy_star_score", "energystar_score"],
    "total_ghg_mt":       ["total_location_based_ghg",
                           "net_emissions_metric_tons",
                           "total_ghg_emissions_metric_tons_co2e", "total_ghg_mt"],
    "ghg_intensity":      ["direct_ghg_emissions_intensity",
                           "total_ghg_emissions_intensity_kgco2e_ft2",
                           "ghg_intensity"],
    "site_eui":           ["site_eui_kbtu_ft", "site_energy_use_kbtu_ft",
                           "site_energy_use_intensity_kbtu_ft", "site_eui"],
    "electricity_kwh":    ["electricity_use_grid_purchase",
                           "electricity_kwh", "electricity_kbtu"],
    "natural_gas_kbtu":   ["natural_gas_use_kbtu", "natural_gas_kbtu"],
}

def parse_bbl(raw):
    raw = raw.strip()
    if not raw:
        return None
    if "-" in raw:
        parts = raw.split("-")
        if len(parts) == 3:
            try:
                return int(parts[0]) * 1_000_000_000 + int(parts[1]) * 10_000 + int(parts[2])
            except Exception:
                return None
    try:
        return int(float(raw))
    except Exception:
        return None

def fetch(params, label):
    url = f"https://data.cityofnewyork.us/resource/{DATASET}.json?" + urlencode(params)
    try:
        resp = urlopen(url, context=ctx, timeout=30)
        data = json.loads(resp.read())
        return data
    except Exception as e:
        print(f"  FAILED [{label}]: {e}")
        return []

def discover_field_map(sample_record):
    """Map our normalized field names to whatever column names this vintage uses."""
    available = set(sample_record.keys())
    mapping = {}
    missing = []
    for our_name, candidates in FIELD_CANDIDATES.items():
        found = next((c for c in candidates if c in available), None)
        if found:
            mapping[our_name] = found
        else:
            missing.append(our_name)
    if missing:
        print(f"  WARNING: could not map fields: {missing}")
        print(f"  Available columns: {sorted(available)}")
    return mapping

def normalize_year(raw_year):
    """Extract 4-digit year from date strings like '2024-12-31' or just '2024'."""
    if not raw_year:
        return None
    s = str(raw_year).strip()
    if len(s) >= 4 and s[:4].isdigit():
        return s[:4]
    return s

def extract(record, field_map, our_name, default=None):
    col = field_map.get(our_name)
    if not col:
        return default
    return record.get(col, default)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", type=int, default=2024, help="LL84 report year to fetch")
    parser.add_argument("--dry-run", action="store_true", help="Fetch and preview but do not write files")
    parser.add_argument("--no-yoy", action="store_true", help="Skip re-running yoy_analysis.py")
    args = parser.parse_args()
    target_year = str(args.year)

    print(f"=== LL84 Refresh — report year {target_year} ===\n")

    # ── 1. Load BBLs ──────────────────────────────────────────────────────────
    print("[1/5] Loading BBLs from steam-buildings-geocoded.csv...")
    bbl_numeric = []
    bbl_to_addr = {}
    with open(CSV_FILE) as f:
        for row in csv.DictReader(f):
            addr = row.get("Address 1", "").strip().upper()
            for piece in row.get(BBL_COL, "").split(";"):
                n = parse_bbl(piece)
                if n is None:
                    continue
                if n not in bbl_to_addr:
                    bbl_numeric.append(n)
                bbl_to_addr[n] = addr
    print(f"  {len(bbl_numeric)} BBLs, {len(bbl_to_addr)} buildings")

    # ── 2. Discover field names from one sample record ────────────────────────
    print(f"\n[2/5] Discovering field names from dataset {DATASET}...")
    sample = fetch({"$limit": 1, "$select": "*"}, "field discovery")
    if not sample:
        print("  Could not reach NYC OpenData — check network/VPN and retry.")
        sys.exit(1)
    field_map = discover_field_map(sample[0])
    print(f"  Mapped {len(field_map)}/{len(FIELD_CANDIDATES)} fields")
    for our, theirs in field_map.items():
        if our != theirs:
            print(f"    {our} ← {theirs}")

    # Confirm the year field resolves correctly
    sample_year = normalize_year(extract(sample[0], field_map, "report_year", ""))
    print(f"  Sample record report year: {sample_year!r}")

    # ── 3. Fetch target year data for our BBLs ─────────────────────────────────
    print(f"\n[3/5] Fetching {target_year} records for {len(bbl_numeric)} BBLs...")
    bbl_col = field_map.get("bbl", "nyc_borough_block_and_lot")
    year_col = field_map.get("report_year", "report_year")
    new_rows = []
    chunk_size = 30
    n_chunks = (len(bbl_numeric) + chunk_size - 1) // chunk_size
    for i in range(0, len(bbl_numeric), chunk_size):
        chunk = bbl_numeric[i:i+chunk_size]
        # BBLs are 10-digit strings in Socrata (e.g. '1012720034')
        bbl_clause = " OR ".join(f"{bbl_col}='{str(b)}'" for b in chunk)
        # report_year is stored as plain string '2024' in current dataset vintage
        year_clause = f"{year_col}='{target_year}'"
        params = {
            "$where": f"({bbl_clause}) AND {year_clause}",
            "$limit": 500,
        }
        batch = fetch(params, f"chunk {i//chunk_size+1}/{n_chunks}")
        new_rows.extend(batch)
        if i > 0 and i % (chunk_size * 10) == 0:
            print(f"  ... {i}/{len(bbl_numeric)} BBLs processed, {len(new_rows)} rows so far")
        time.sleep(0.08)

    print(f"  {len(new_rows)} raw rows fetched for {target_year}")

    if not new_rows:
        print("\n  No records found for this year. Either:")
        print(f"    - CY{target_year} data is not yet published on NYC OpenData")
        print(f"    - The year filter did not match (try --year {int(target_year)-1})")
        print(f"    - Our BBLs don't appear in this year's filings")
        sys.exit(0)

    # ── 4. Normalize rows to our schema ───────────────────────────────────────
    print(f"\n[4/5] Normalizing {len(new_rows)} rows to our schema...")
    normalized = []
    matched_addrs = set()
    skipped_no_bbl = 0
    skipped_no_steam = 0
    for r in new_rows:
        raw_bbl = extract(r, field_map, "bbl", "")
        bbl_int = parse_bbl(str(raw_bbl))
        addr = bbl_to_addr.get(bbl_int, "")
        if not bbl_int:
            skipped_no_bbl += 1
            continue
        steam_raw = extract(r, field_map, "district_steam_kbtu", "")
        # Keep records even with no steam data (for energy_star / EUI / GHG fields)
        year_raw = extract(r, field_map, "report_year", target_year)
        norm_year = normalize_year(year_raw) or target_year
        normalized.append({
            "address":             addr,
            "bbl":                 str(bbl_int),
            "report_year":         norm_year,
            "district_steam_kbtu": steam_raw if steam_raw not in ("", None) else "Not Available",
            "energy_star_score":   extract(r, field_map, "energy_star_score", "Not Available"),
            "total_ghg_mt":        extract(r, field_map, "total_ghg_mt", "Not Available"),
            "ghg_intensity":       extract(r, field_map, "ghg_intensity", "Not Available"),
            "site_eui":            extract(r, field_map, "site_eui", "Not Available"),
            "electricity_kwh":     extract(r, field_map, "electricity_kwh", "Not Available"),
            "natural_gas_kbtu":    extract(r, field_map, "natural_gas_kbtu", "Not Available"),
        })
        if addr:
            matched_addrs.add(addr)

    print(f"  {len(normalized)} normalized records")
    print(f"  {len(matched_addrs)} unique buildings matched to our address list")
    if skipped_no_bbl:
        print(f"  {skipped_no_bbl} rows skipped (unparseable BBL)")

    # Preview
    if normalized:
        s = normalized[0]
        print(f"\n  Sample: {s['address']} | steam={s['district_steam_kbtu']} | eui={s['site_eui']}")

    if args.dry_run:
        print("\n[DRY RUN] Stopping before writes. Remove --dry-run to apply.")
        return

    # ── 5a. Update ll84_latest_matched.json ───────────────────────────────────
    print(f"\n[5/5] Writing outputs...")

    with open(LL84_FILE) as f:
        existing = json.load(f)

    # Remove any stale records for this year (idempotent re-run)
    existing_filtered = [r for r in existing if r.get("report_year") != target_year]
    merged = existing_filtered + normalized
    print(f"  ll84_latest_matched.json: {len(existing)} → {len(merged)} records "
          f"({len(normalized)} {target_year} added, {len(existing)-len(existing_filtered)} replaced)")

    tmp = LL84_FILE + ".tmp"
    with open(tmp, "w") as f:
        json.dump(merged, f, indent=2)
    os.replace(tmp, LL84_FILE)

    # ── 5b. Update yearly.json with steam_<year> ──────────────────────────────
    with open(YEARLY_FILE) as f:
        yearly = json.load(f)

    steam_key = f"steam_{target_year}"
    updated_yearly = 0
    for row in normalized:
        addr = row["address"]
        if not addr:
            continue
        steam_raw = row["district_steam_kbtu"]
        if steam_raw in ("Not Available", "", None):
            continue
        try:
            steam_val = float(steam_raw)
        except (ValueError, TypeError):
            continue
        if addr not in yearly:
            yearly[addr] = {}
        if yearly[addr].get(steam_key) != steam_val:
            yearly[addr][steam_key] = steam_val
            updated_yearly += 1

    print(f"  yearly.json: {updated_yearly} buildings updated with {steam_key}")

    tmp = YEARLY_FILE + ".tmp"
    with open(tmp, "w") as f:
        json.dump(yearly, f, separators=(",", ":"))
    os.replace(tmp, YEARLY_FILE)

    # ── 5c. Re-run yoy_analysis.py ────────────────────────────────────────────
    if not args.no_yoy:
        print("\n  Running yoy_analysis.py to rebuild yoy_deltas.json...")
        result = subprocess.run(
            [sys.executable, os.path.join(BASE, "yoy_analysis.py")],
            cwd=BASE,
            capture_output=True,
            text=True,
        )
        if result.returncode == 0:
            print("  yoy_analysis.py completed OK")
            if result.stdout:
                for line in result.stdout.strip().splitlines()[-5:]:
                    print(f"    {line}")
        else:
            print(f"  WARNING: yoy_analysis.py exited {result.returncode}")
            print(result.stderr[-500:] if result.stderr else "(no stderr)")

    print(f"""
=== Done ===

Updated files:
  {LL84_FILE}  ({len(merged)} records, +{len(normalized)} for {target_year})
  {YEARLY_FILE}  ({updated_yearly} buildings with {steam_key})
  public/yoy_deltas.json  (rebuilt by yoy_analysis.py)

Next steps to rebuild ML scores:
  /opt/homebrew/bin/python3.13 kmeans_model.py
  /opt/homebrew/bin/python3.13 ll97_model.py
  /opt/homebrew/bin/python3.13 update_enrichment_risk.py
  /opt/homebrew/bin/python3.13 decline_trend_analysis.py
""")

if __name__ == "__main__":
    main()
