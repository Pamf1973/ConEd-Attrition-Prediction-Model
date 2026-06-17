# K-Means Clustering Refocus Plan

## Goal
Remove DOB Jobs and LL97 penalty display from the dashboard. Replace with deeper K-means cluster visibility across all views.

## What Gets Removed
| Component | Remove |
|-----------|--------|
| `BuildingPanel.jsx` | "LL97 Carbon Compliance" section (ll97_penalty_2024/2030, ML Attrition Score), "DOB Activity" section (dob_jobs) |
| `RiskTable.jsx` | `ll97_penalty` column (with penalty year toggle), `dob_jobs` column |
| `TopTargets.jsx` | Entire component — it's LL97-centric (sorts by ll97_penalty_2030) |
| `App.jsx` | Portfolio Dollar Exposure Banner (4 LL97 cards: 2024/2030 exposure, penalty increase, extreme risk) |
| `App.jsx` | Remove `bannerStats` useMemo entirely |

## What Gets Added/Enhanced
| Component | Add/Change |
|-----------|-----------|
| `BuildingPanel.jsx` | **Enhanced "Customer Archetype" section** — add risk rank within cluster, cluster size, top peers, centroid comparison (e.g., "This cluster avg steam: 12.4M kBtu, this building: 8.2M kBtu") |
| **New: `ClusterExplorer.jsx`** | Replace TopTargets tab — shows all 5 clusters with name, risk level, building count, avg steam, top use types, clickable rows to filter the rankings table |
| `RiskTable.jsx` | Replace LL97 column with **Cluster column** (cluster_name with badge), keep dob_jobs removed |
| `App.jsx` | Replace the Portfolio Dollar Exposure banner with **Cluster Stats banner** — 5 cluster cards showing K=5 cluster name, count, avg risk |

## Files Changed
- `src/components/TopTargets.jsx` → Rewrite to `ClusterExplorer.jsx`
- `src/components/BuildingPanel.jsx` — Remove LL97 & DOB sections, enhance cluster section
- `src/components/RiskTable.jsx` — Replace LL97 column with cluster column, remove dob_jobs column
- `src/App.jsx` — Replace banner LL97 stats with cluster stats, update import from TopTargets to ClusterExplorer

## Cluster Data Available
From enrichment: `cluster_id` (1-5), `cluster_name`, `cluster_risk`
We'll compute at render: cluster counts, avg risk, avg steam, use type distribution per cluster.