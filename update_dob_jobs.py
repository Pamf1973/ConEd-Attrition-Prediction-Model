#!/usr/bin/env python3
"""
Incremental DOB NOW permit update + dob_jobs recount.

1. Reads existing dob_now_heating_matched.json (last fetch: 2026-05-12)
2. Fetches new records from NYC Open Data since last date
3. Merges, deduplicates, rewrites the file
4. Recounts dob_jobs per building (24-month rolling window)
5. Updates buildingEnrichment.json in-place

Join: block+lot derived from steam-buildings-geocoded.csv BBLs
"""

import csv, json, math, os, ssl, time, datetime
from urllib.request import urlopen
from urllib.parse import urlencode

BASE        = os.path.dirname(__file__)
DATA_DIR    = os.path.join(BASE, "../coned-3d-map/data")
ML_DIR      = os.path.join(DATA_DIR, "ml_features")
DOB_FILE    = os.path.join(ML_DIR, "dob_now_heating_matched.json")
ENRICH_FILE = os.path.join(BASE, "public/buildingEnrichment.json")
CSV_FILE    = os.path.join(DATA_DIR, "steam-buildings-geocoded.csv")
BBL_COL     = "NYC Borough, Block and Lot (BBL)"

CUTOFF_DATE = "2026-05-12"   # last known record date
WINDOW_MONTHS = 24           # rolling window for dob_jobs count

ctx = ssl._create_unverified_context()

# ── 1. Parse BBLs → block+lot sets from geocoded CSV ─────────────────────────

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

block_lot_set = set()   # (block_str, lot_str)
bbl_to_addr   = {}      # (block_str, lot_str) -> canonical uppercase address

print("[1/4] Parsing BBLs from geocoded CSV...")
with open(CSV_FILE) as f:
    for row in csv.DictReader(f):
        addr = row.get("Address 1", "").strip().upper()
        for piece in row.get(BBL_COL, "").split(";"):
            n = parse_bbl(piece)
            if n is None:
                continue
            block = str((n % 1_000_000_000) // 10_000).zfill(5)
            lot   = str(n % 10_000).zfill(4)
                    # API returns unpadded block/lot (e.g. "1172" not "01172")
            block_unpad = str((n % 1_000_000_000) // 10_000)
            lot_unpad   = str(n % 10_000)
            block_lot_set.add((block_unpad, lot_unpad))
            if addr:
                bbl_to_addr[(block_unpad, lot_unpad)] = addr

print(f"  {len(block_lot_set)} block+lot pairs from {len(bbl_to_addr)} buildings")

# ── 2. Load existing DOB data ─────────────────────────────────────────────────

print(f"\n[2/4] Loading existing DOB data from {os.path.basename(DOB_FILE)}...")
with open(DOB_FILE) as f:
    existing = json.load(f)
print(f"  {len(existing)} existing records, last date: {CUTOFF_DATE}")

# Dedupe key: block+lot+filing_date+job_type
def dedup_key(r):
    return (r.get("block",""), r.get("lot",""), r.get("filing_date","")[:10], r.get("job_type",""))

seen = set(dedup_key(r) for r in existing)

# ── 3. Fetch new records from NYC Open Data ───────────────────────────────────
# Dataset: DOB Job Application Filings — ipu4-2q9a
# Fields match existing data structure

DATASET = "w9ak-ipjd"  # DOB NOW: Build – Approved Permits (fields: house_no, street_name, block, lot, job_type, filing_date, filing_status)
FETCH_FROM = CUTOFF_DATE   # records with filing_date > cutoff

print(f"\n[3/4] Fetching new DOB records since {FETCH_FROM}...")

new_records = []
chunk_size  = 20
bl_list     = list(block_lot_set)
total_chunks = (len(bl_list) + chunk_size - 1) // chunk_size

for i in range(0, len(bl_list), chunk_size):
    chunk = bl_list[i:i+chunk_size]
    bl_where = " OR ".join(f"(block='{blk}' AND lot='{lt}' AND borough='MANHATTAN')" for blk, lt in chunk)
    where = f"({bl_where}) AND filing_date > '{FETCH_FROM}T00:00:00'"

    params = {
        "$where":  where,
        "$select": "house_no,street_name,block,lot,job_type,filing_date,filing_status",
        "$limit":  5000,
    }
    url = f"https://data.cityofnewyork.us/resource/{DATASET}.json?" + urlencode(params)

    try:
        resp = urlopen(url, context=ctx, timeout=30)
        batch = json.loads(resp.read())
        added = 0
        for r in batch:
            k = dedup_key(r)
            if k not in seen:
                seen.add(k)
                new_records.append(r)
                added += 1
        chunk_num = i // chunk_size + 1
        if batch:
            print(f"  chunk {chunk_num}/{total_chunks}: {len(batch)} rows, {added} new")
        time.sleep(0.08)
    except Exception as e:
        print(f"  chunk {i//chunk_size+1}/{total_chunks} FAILED: {e}")
        time.sleep(0.5)

print(f"\n  New records fetched: {len(new_records)}")

# ── 4. Merge and rewrite DOB file ─────────────────────────────────────────────

if new_records:
    merged = existing + new_records
    tmp = DOB_FILE + ".tmp"
    with open(tmp, "w") as f:
        json.dump(merged, f)
    os.replace(tmp, DOB_FILE)
    print(f"  dob_now_heating_matched.json updated: {len(existing)} + {len(new_records)} = {len(merged)} records")
else:
    print("  No new records — existing file unchanged")
    merged = existing

# ── 5. Recount dob_jobs per building (24-month rolling window) ────────────────

print(f"\n[4/4] Recounting dob_jobs per building ({WINDOW_MONTHS}-month window)...")

cutoff_dt = datetime.datetime.now() - datetime.timedelta(days=WINDOW_MONTHS * 30)
cutoff_str = cutoff_dt.strftime("%Y-%m-%d")

# Index records by (block, lot)
dob_by_bl = {}
for r in merged:
    date_str = r.get("filing_date", "")[:10]
    if date_str < cutoff_str:
        continue  # outside rolling window
    blk = r.get("block", "").lstrip("0") or "0"
    lt  = r.get("lot",   "").lstrip("0") or "0"
    key = (blk, lt)
    dob_by_bl[key] = dob_by_bl.get(key, 0) + 1

# Map building addresses to dob_jobs count via block+lot
addr_to_dob = {}
for (block, lot), addr in bbl_to_addr.items():
    count = dob_by_bl.get((block, lot), 0)
    if addr in addr_to_dob:
        addr_to_dob[addr] = max(addr_to_dob[addr], count)
    else:
        addr_to_dob[addr] = count

# ── 6. Update buildingEnrichment.json ─────────────────────────────────────────

with open(ENRICH_FILE) as f:
    enrichment = json.load(f)

updated = 0
unchanged = 0
for addr_key in enrichment:
    new_count = addr_to_dob.get(addr_key, None)
    if new_count is None:
        # Try without leading zeros variant
        new_count = 0
    old_count = enrichment[addr_key].get("dob_jobs", 0) or 0
    enrichment[addr_key]["dob_jobs"] = new_count
    enrichment[addr_key]["log_dob_jobs"] = math.log1p(new_count)
    if new_count != old_count:
        updated += 1
    else:
        unchanged += 1

tmp = ENRICH_FILE + ".tmp"
with open(tmp, "w") as f:
    json.dump(enrichment, f, separators=(",", ":"))
os.replace(tmp, ENRICH_FILE)

print(f"  Buildings updated: {updated}")
print(f"  Buildings unchanged: {unchanged}")
print(f"  buildingEnrichment.json rewritten")
print(f"\nDone. Next step: re-run kmeans_model.py then ll97_model.py to rebuild ML scores.")
