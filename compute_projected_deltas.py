#!/usr/bin/env python3
"""
Compute projected YoY deltas for buildings missing 2024 data.
Uses cluster-median norm_delta_23_24 from same-cluster peers.
"""
import json
import statistics
from collections import defaultdict

# ── Load data ────────────────────────────────────────────────────────────────
with open("public/yoy_deltas.json") as f:
    yoy = json.load(f)

with open("public/buildingEnrichment.json") as f:
    enrich = json.load(f)

# ── Build cluster lookups ────────────────────────────────────────────────────
# Map address -> cluster_id from enrichment
addr_to_cluster = {}
for addr, e in enrich.items():
    addr_to_cluster[addr] = e.get("cluster_id")

# Group buildings that HAVE norm_delta_23_24 by cluster
cluster_real_deltas = defaultdict(list)   # cluster_id -> list of norm_delta_23_24 values
for addr, d in yoy.items():
    delta = d.get("norm_delta_23_24")
    if delta is not None:
        cid = addr_to_cluster.get(addr)
        if cid is not None:
            cluster_real_deltas[cid].append(delta)

# Compute cluster medians
cluster_median = {}
for cid, deltas in cluster_real_deltas.items():
    cluster_median[cid] = statistics.median(deltas)

# Get cluster names from enrichment
cluster_names = {}
for e in enrich.values():
    cid = e.get("cluster_id")
    cname = e.get("cluster_name")
    if cid is not None and cname:
        cluster_names[cid] = cname

print("=== CLUSTER MEDIAN norm_delta_23_24 ===")
for cid in sorted(cluster_median.keys()):
    count = len(cluster_real_deltas[cid])
    cname = cluster_names.get(cid, f"Cluster {cid}")
    print(f"  Cluster {cid} ({cname}): median={cluster_median[cid]:+.2f}% (from {count} buildings)")

# ── Project missing deltas ───────────────────────────────────────────────────
projected_count = 0
projected_by_cluster = defaultdict(int)

for addr, d in yoy.items():
    # Has 22→23 delta but missing 23→24 delta → candidate for projection
    if d.get("norm_delta_22_23") is not None and d.get("norm_delta_23_24") is None:
        cid = addr_to_cluster.get(addr)
        if cid is not None and cid in cluster_median:
            med = cluster_median[cid]
            d["norm_delta_23_24"] = med
            d["norm_delta_23_24_projected"] = True
            projected_count += 1
            projected_by_cluster[cid] += 1

# ── Write updated file ───────────────────────────────────────────────────────
with open("public/yoy_deltas.json", "w") as f:
    json.dump(yoy, f, indent=2)

print(f"\n=== RESULTS ===")
print(f"Projected buildings: {projected_count}")
print(f"\nProjected by cluster:")
for cid in sorted(projected_by_cluster.keys()):
    cname = cluster_names.get(cid, f"Cluster {cid}")
    print(f"  Cluster {cid} ({cname}): {projected_by_cluster[cid]} buildings (median: {cluster_median[cid]:+.2f}%)")

# Count remaining breakdown
has_both = sum(1 for d in yoy.values() if d.get("norm_delta_23_24") is not None and not d.get("norm_delta_23_24_projected"))
has_projected = sum(1 for d in yoy.values() if d.get("norm_delta_23_24_projected"))
has_22_only = sum(1 for d in yoy.values() if d.get("norm_delta_22_23") is not None and d.get("norm_delta_23_24") is None and not d.get("norm_delta_23_24_projected"))
has_no_22 = sum(1 for d in yoy.values() if d.get("norm_delta_22_23") is None)

print(f"\nFinal breakdown:")
print(f"  Real both-delta buildings: {has_both}")
print(f"  Projected (cluster-median): {has_projected}")
print(f"  Still missing (no 2024 data, no cluster match): {has_22_only}")
print(f"  No 22→23 delta either: {has_no_22}")
print(f"  Total: {has_both + has_projected + has_22_only + has_no_22}")