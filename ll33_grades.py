#!/usr/bin/env python3
"""
LL33 energy grade derivation for ConEd dashboard building panel.

NYC Local Law 33 of 2018 (amended by LL95 of 2019) requires covered buildings
to post a letter grade derived from their Energy Star score:

  A: Energy Star score >= 85
  B: 70 - 84
  C: 55 - 69
  D: < 55
  F: did not submit benchmarking
  N: not covered

Reads:  public/buildingEnrichment.json
Writes: public/buildingEnrichment.json  (adds `ll33` field)

Run:    /opt/homebrew/bin/python3.13 ll33_grades.py
"""

import json
import os

ENRICHMENT_JSON = "public/buildingEnrichment.json"


def energy_star_to_ll33(score):
    if score is None:
        return None
    try:
        s = float(score)
    except (TypeError, ValueError):
        return None
    if s >= 85:
        return "A"
    if s >= 70:
        return "B"
    if s >= 55:
        return "C"
    if s >= 0:
        return "D"
    return None


def main():
    with open(ENRICHMENT_JSON) as f:
        enrichment = json.load(f)

    counts = {"A": 0, "B": 0, "C": 0, "D": 0, "missing": 0}
    for addr, rec in enrichment.items():
        grade = energy_star_to_ll33(rec.get("energy_star"))
        if grade is None:
            counts["missing"] += 1
            continue
        rec["ll33"] = grade
        counts[grade] += 1

    tmp = ENRICHMENT_JSON + ".tmp"
    with open(tmp, "w") as f:
        json.dump(enrichment, f)
    os.replace(tmp, ENRICHMENT_JSON)

    total = sum(counts.values())
    print(f"Updated {ENRICHMENT_JSON} with LL33 grades")
    print(f"  Total buildings:  {total}")
    for g in ("A", "B", "C", "D"):
        print(f"  Grade {g}:          {counts[g]:>5}  ({100*counts[g]//total}%)")
    print(f"  No Energy Star:   {counts['missing']:>5}  ({100*counts['missing']//total}%)")


if __name__ == "__main__":
    main()
