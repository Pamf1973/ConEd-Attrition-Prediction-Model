"""
Generates coned-data-comparison.csv on the Desktop.
ConEd uses BBL as the primary matching key against their billing records.
"""

import csv
import json
import math
import os

STEAM_CSV   = "../coned-3d-map/data/steam-buildings.csv"
BLDGS_JSON  = "public/buildings.json"
ENRICH_JSON = "public/buildingEnrichment.json"
OUT_CSV     = os.path.expanduser("~/Desktop/coned-data-comparison.csv")
OUT_COVER   = os.path.expanduser("~/Desktop/coned-data-comparison-cover.txt")

os.chdir(os.path.dirname(os.path.abspath(__file__)))

# ── Estimate ConEd tariff class from public data ──────────────────────────────
# Based on SC-1–SC-5 definitions (ConEd internal tariff classification).
# All values marked * = estimated from LL84 public data, not a verified tariff code.
# ConEd should verify against actual billing records via BBL match.
def estimate_sc_class(use_type, steam_kbtu, dob_jobs):
    steam = steam_kbtu or 0
    jobs  = int(dob_jobs or 0)
    use   = (use_type or "").strip()

    # SC-3: Residential multifamily (≥50% residential, ≥3 units per tariff definition)
    if any(x in use for x in ["Multifamily", "Apartment", "Residence Hall", "Dormitory"]):
        return "SC-3* (Residential)"

    # SC-5 candidates: large buildings with active boiler permit activity
    # Indicator: steam > 50M kBtu AND ≥2 DOB HVAC/boiler job filings
    # These buildings demonstrably have on-site boiler alternatives → negotiated service
    if steam > 50_000_000 and jobs >= 2:
        return "SC-5* (Negotiated — est.)"

    # SC-4 candidates: dual-supply / backup indicators
    # Indicator: any DOB boiler filings + meaningful steam demand
    # These buildings have backup infrastructure installed alongside ConEd steam
    if jobs >= 1 and steam > 5_000_000:
        return "SC-4* (Dual-Supply — est.)"

    # SC-1: small users — low steam demand or small-format use types
    if steam < 5_000_000 or use in ["Retail Store", "Other"]:
        return "SC-1* (Small Commercial)"

    # SC-2: large commercial / institutional (year-round demand, no backup signals)
    return "SC-2* (Annual Power)"

# ── Load JSON sources ─────────────────────────────────────────────────────────
with open(BLDGS_JSON) as f:
    bldgs_list = json.load(f)

with open(ENRICH_JSON) as f:
    enrich_raw = json.load(f)

# Both dicts keyed by UPPERCASE address for consistent lookup
bldgs_by_addr  = {b["address"].upper(): b for b in bldgs_list if b.get("address")}
enrich_by_addr = {k.upper(): v for k, v in enrich_raw.items()}

# ── Load steam-buildings.csv ──────────────────────────────────────────────────
def clean(v):
    """Return None for LL84 sentinel strings, else strip whitespace."""
    if v is None:
        return None
    s = str(v).strip()
    return None if s.lower() in {"not available", "n/a", "", "none"} else s

def to_num(v):
    try:
        return float(clean(v))
    except (TypeError, ValueError):
        return None

rows = []
with open(STEAM_CSV, encoding="utf-8-sig") as f:
    reader = csv.DictReader(f)
    for row in reader:
        addr_raw = clean(row.get("Address 1", ""))
        if not addr_raw:
            continue
        addr_key = addr_raw.upper()

        bldg   = bldgs_by_addr.get(addr_key, {})
        enrich = enrich_by_addr.get(addr_key, {})

        steam_kbtu = to_num(row.get("District Steam Use (kBtu)"))
        if steam_kbtu is None:
            steam_kbtu = bldg.get("steam")

        ml_risk   = enrich.get("ml_risk")
        heur_risk = bldg.get("risk")
        has_ml    = ml_risk is not None
        risk_val  = ml_risk if has_ml else heur_risk
        risk_pct  = f"{round(risk_val * 100, 1)}%" if risk_val is not None else ""

        if not has_ml:
            tier = "Uncertain"
        elif risk_val is None:
            tier = ""
        elif risk_val > 0.7:
            tier = "High"
        elif risk_val > 0.4:
            tier = "Medium"
        else:
            tier = "Low"

        energy_star = enrich.get("energy_star") if enrich.get("energy_star") is not None else to_num(row.get("ENERGY STAR Score"))

        ll97_penalty = enrich.get("ll97_penalty_2024")
        ll97_status  = "Over Cap" if enrich.get("ll97_over_2024") == 1 else "Compliant" if ll97_penalty is not None else ""

        steam_m   = round(steam_kbtu / 1_000_000, 2) if steam_kbtu is not None else None
        use_type  = clean(row.get("Largest Property Use Type")) or bldg.get("use", "")
        dob_count = enrich.get("dob_jobs", 0) or 0
        sc_class  = estimate_sc_class(use_type, steam_kbtu, dob_count)

        rows.append({
            "Address":               addr_raw,
            "BBL":                   clean(row.get("NYC Borough, Block and Lot (BBL)")) or bldg.get("bbl", ""),
            "Heuristic SC Segment*":   sc_class,
            "Steam Use (kBtu)":      steam_kbtu,
            "Steam Use (M kBtu)":    steam_m,
            "Natural Gas Use (kBtu)": to_num(row.get("Natural Gas Use (kBtu)")) or bldg.get("gas"),
            "Electricity Use (kWh)": to_num(row.get("Electricity Use - Grid Purchase (kWh)")),
            "GHG Emissions (MT CO2e)": to_num(row.get("Total GHG Emissions (Metric Tons CO2e)")) or bldg.get("ghg"),
            "Energy Star Score":     energy_star,
            "Steam EUI (kBtu/ft²)":  enrich.get("eui"),
            "Building Type":         use_type,
            "Floor Area (ft²)":      to_num(row.get("Property GFA - Self-Reported (ft²)")) or enrich.get("floor_sqft"),
            "Year Built":            clean(row.get("Year Built")) or bldg.get("yr", ""),
            "DOB HVAC/Boiler Jobs":  dob_count,
            "Attrition Risk Score":  risk_pct,
            "Attrition Tier":        tier,
            "LL97 2024 Annual Penalty ($)": ll97_penalty,
            "LL97 2024 Compliance Status":  ll97_status,
            "Latitude":              bldg.get("lat", ""),
            "Longitude":             bldg.get("lon", ""),
            "Data Year":             "Calendar Year 2022 (LL84 filing 2023)",
        })

# Sort by steam demand descending (largest customers first)
rows.sort(key=lambda r: r["Steam Use (kBtu)"] or 0, reverse=True)

# ── Write CSV ─────────────────────────────────────────────────────────────────
COLS = [
    "Address", "BBL", "Heuristic SC Segment*",
    "Steam Use (kBtu)", "Steam Use (M kBtu)",
    "Natural Gas Use (kBtu)", "Electricity Use (kWh)",
    "GHG Emissions (MT CO2e)", "Energy Star Score",
    "Steam EUI (kBtu/ft²)", "Building Type", "Floor Area (ft²)", "Year Built",
    "DOB HVAC/Boiler Jobs",
    "Attrition Risk Score", "Attrition Tier",
    "LL97 2024 Annual Penalty ($)", "LL97 2024 Compliance Status",
    "Latitude", "Longitude", "Data Year",
]

def safe_cell(v):
    """Sanitize for CSV — neutralize formula injection in string fields only."""
    if v is None:
        return ""
    if isinstance(v, (int, float)):
        return v
    s = str(v).lstrip()
    if s and s[0] in "=+-@\t\r\n":
        return "'" + str(v)
    return s

with open(OUT_CSV, "w", newline="", encoding="utf-8-sig") as f:  # utf-8-sig for Excel BOM
    writer = csv.writer(f, quoting=csv.QUOTE_MINIMAL)
    writer.writerow(COLS)
    for r in rows:
        writer.writerow([safe_cell(r.get(c)) for c in COLS])

print(f"Wrote {len(rows)} rows → {OUT_CSV}")

# ── Write cover note ──────────────────────────────────────────────────────────
bbl_filled  = sum(1 for r in rows if r["BBL"])
high_risk   = sum(1 for r in rows if r["Attrition Tier"] == "High")
over_cap    = sum(1 for r in rows if r["LL97 2024 Compliance Status"] == "Over Cap")

sc_counts = {}
for r in rows:
    sc = r["Heuristic SC Segment*"]
    sc_counts[sc] = sc_counts.get(sc, 0) + 1
sc_summary = "  " + "\n  ".join(f"{k}: {v}" for k, v in sorted(sc_counts.items()))

cover = f"""ConEd Steam Attrition Dashboard — Data Comparison Export
Data Year: Calendar Year 2022 (LL84 benchmarking filing, submitted 2023)
Buildings: {len(rows)} Manhattan steam customers below 90th Street
BBL coverage: {bbl_filled} of {len(rows)} buildings have a BBL identifier

How to use this file:
The BBL (Borough-Block-Lot) column is the primary field for matching our records against
ConEd's internal account database. Sort by BBL to align rows with your billing system.

About "Heuristic SC Segment*":
The SC class column is our estimate derived from public LL84 data — NOT the verified ConEd
tariff code. All values are marked * to indicate they are approximate.
Estimation logic (based on ConEd SC-1 through SC-5 tariff definitions):
  SC-3* — LL84 use type is Multifamily/Residential
  SC-5* — steam demand > 50M kBtu AND ≥2 DOB boiler/HVAC permit filings (viable alternatives)
  SC-4* — any DOB boiler filings + steam demand > 5M kBtu (dual-supply indicators)
  SC-1* — steam demand < 5M kBtu or small-format use type
  SC-2* — all other large commercial / institutional buildings
Estimated SC class breakdown:
{sc_summary}
We recommend verifying these estimates against your internal tariff classifications using BBL.
SC-5* buildings are the highest-priority segment for attrition outreach.

About the Attrition Risk Score and Tier:
This is our model's output — it is NOT from LL84 or any ConEd data. The score is derived
from a Gradient Boosting model trained on observed steam demand drops in public LL84 data.
  High risk (>70%): {high_risk} buildings — converging signals (LL97 pressure, DOB permits, peer behavior)
  Data does not include ConEd billing history or meter-level consumption.

About LL97 2024 Annual Penalty:
Estimated fine under NYC Local Law 97 of 2019. Calculated from LL84-reported GHG emissions
and publicly available intensity limits. These are estimates — not legal or compliance advice.
  Buildings over the 2024 cap: {over_cap}

All source data is public: NYC LL84 Benchmarking (NYC Open Data 5zyy-y8am),
DOB NOW Permits (w9ak-ipjd), MapPLUTO (NYC DCP).

Questions: Ismael Caraballo — ismael.caraballo@pursuit.org
"""

with open(OUT_COVER, "w", encoding="utf-8") as f:
    f.write(cover)

print(f"Wrote cover note → {OUT_COVER}")
print(f"\nSnapshot: {high_risk} High risk | {over_cap} over LL97 cap | {bbl_filled} with BBL")
