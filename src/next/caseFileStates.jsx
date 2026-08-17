/**
 * Case-file header fixtures. Each entry exercises one of the three
 * ledger fresh-column variants named in system-v1.1.md §5:
 *   CF-1  fresh Δ '24 present (Concordant / High)
 *   CF-2  latest Δ '23, no '24 yet (Medium)
 *   CF-3  no adjacent-yr Δ (Uncertain, "est." percentile per L1)
 *   CF-4  Divergent (base Low → final High per L3 v1.1 two-tier)
 *
 * AUC line is rendered from real `data/model_meta.json` values on main
 * (cv_auc 0.6833, cv_kfold 5, n_positive 54, model_version "XGB v1 · UNVAL")
 * per §7 rules 8 and 9. The container PR sources these from /api/model_meta.
 */

const PROVENANCE = "XGB v1 · unvalidated · AUC 0.68: ranks a true churner above a non-churner about 68% of the time (5-fold CV, 54 positive labels).";
const PROVENANCE_EST = "Legacy heuristic · no XGB score for this row.";

export const CASE_FILE_STATES = [
  {
    id: "CF-1",
    name: "Concordant · fresh Δ '24",
    scenario: "Top-of-queue building with a live 2024 delta crossing the transparent-rule threshold.",
    props: {
      identity: {
        address: "200 East 42nd St.",
        meta: [
          "BBL 1-01296-0021",
          "Office · Built 1956 · 231,000 ft²",
          "SC-5* (Negotiated · est.)",
        ],
        cluster: "Low-Compliance Commercial · Quiet Attrition",
        right: [
          <>Steam '24 <b>76.0 M kBtu</b> · GHG <b>6,184 MT CO₂e</b></>,
          <>Steam share of GHG <b>55%</b> · Energy Star <b>77 / 100</b></>,
          <>Account owner <b>unmapped</b> · Data <b>LL84 2025-05</b></>,
        ],
      },
      ledger: {
        queue: {
          percentile: "99th",
          sub: "#4 of 1,210 · tied w/ 2",
          provenance: PROVENANCE,
        },
        tier: {
          tier: "High",
          sub: <>Δ '24 <b>−66%</b> HDD-normalized, vs the <b>−30%</b> high threshold. Weather-normalized per the method ConEd's own team uses. Vintage: 2024.</>,
        },
        coverage: {
          big: "3",
          unit: "yrs",
          sub: <>History <b>2022–2024</b> · fresh Δ present · EUI <b>54.7 kBtu/ft²</b> (+99% vs office median 27.5) · DOB permits <b>0</b> recent.</>,
        },
      },
      drivers: [
        { rank: 1, name: "LL97 penalty at 2030 caps", value: <><b>$1,190,650</b> / yr est.</>, direction: "up", barPct: 46, contrib: "+2.8" },
        { rank: 2, name: "Steam share of building emissions", value: <><b>55%</b> of GHG</>, direction: "up", barPct: 31, contrib: "+1.9" },
        { rank: 3, name: "Energy Star score", value: <><b>77</b> / 100</>, direction: "up", barPct: 15, contrib: "+0.9" },
        { rank: 4, name: "Steam demand size", value: <><b>76.0 M</b> kBtu</>, direction: "down", barPct: 20, contrib: "−1.2" },
        { rank: 5, name: "Total emissions", value: <><b>6,184</b> MT CO₂e</>, direction: "down", barPct: 10, contrib: "−0.6" },
      ],
      narrative: null,
      status: "In review",
    },
  },
  {
    id: "CF-2",
    name: "Latest Δ '23 · no '24 yet",
    scenario: "Building with LL84 CY2023 reported but no CY2024 delta available. Medium tier via YoY only.",
    props: {
      identity: {
        address: "455 West 34th St.",
        meta: [
          "BBL 1-00707-0038",
          "Multifamily · Built 1978 · 148,500 ft²",
          "SC-3 (Rate class)",
        ],
        cluster: "Mid-Cluster Multifamily · Slow Decline",
        right: [
          <>Steam '23 <b>52.4 M kBtu</b> · GHG <b>4,102 MT CO₂e</b></>,
          <>Steam share of GHG <b>48%</b> · Energy Star <b>62 / 100</b></>,
          <>Account owner <b>unmapped</b> · Data <b>LL84 2024-11</b></>,
        ],
      },
      ledger: {
        queue: {
          percentile: "84th",
          sub: "#193 of 1,210",
          provenance: PROVENANCE,
        },
        tier: {
          tier: "Medium",
          sub: <>Δ '23 <b>−38%</b> HDD-normalized, vs the <b>−15%</b> medium threshold. No '24 delta yet (LL84 CY2024 not filed). Vintage: 2023.</>,
        },
        coverage: {
          big: "2",
          unit: "yrs",
          sub: <>History <b>2022–2023</b> · '24 pending · EUI <b>62.1 kBtu/ft²</b> (multifamily median 58.4) · DOB permits <b>1</b> recent.</>,
        },
      },
      drivers: [
        { rank: 1, name: "YoY steam decline", value: <><b>−38%</b> HDD-normalized</>, direction: "up", barPct: 38, contrib: "+2.1" },
        { rank: 2, name: "LL97 penalty at 2030 caps", value: <><b>$412,000</b> / yr est.</>, direction: "up", barPct: 22, contrib: "+1.3" },
        { rank: 3, name: "Steam share of building emissions", value: <><b>48%</b> of GHG</>, direction: "up", barPct: 18, contrib: "+1.0" },
        { rank: 4, name: "Cluster peer score", value: <><b>0.34</b></>, direction: "down", barPct: 12, contrib: "−0.7" },
        { rank: 5, name: "Building age", value: <><b>1978</b> · 48 yrs</>, direction: "down", barPct: 8, contrib: "−0.4" },
      ],
      narrative: null,
      status: "Unreviewed",
    },
  },
  {
    id: "CF-3",
    name: "No adjacent-yr Δ · Uncertain",
    scenario: "Building without XGB score (missing features or unreported year). Percentile shown as 'est.' per L1; provenance falls back to legacy heuristic.",
    props: {
      identity: {
        address: "1200 Grand Concourse",
        meta: [
          "BBL 2-02845-0011",
          "Multifamily (NYCHA) · Built 1965 · 312,000 ft²",
          "SC-3 (Rate class)",
        ],
        cluster: "NYCHA Multifamily · Insufficient Coverage",
        right: [
          <>Steam '22 <b>68.3 M kBtu</b> · GHG <b>5,240 MT CO₂e</b></>,
          <>Steam share of GHG <b>51%</b> · Energy Star <b>—</b></>,
          <>Account owner <b>unmapped</b> · Data <b>LL84 2023-09</b></>,
        ],
      },
      ledger: {
        queue: {
          percentile: "est.",
          sub: "no XGB score · legacy heuristic",
          provenance: PROVENANCE_EST,
        },
        tier: {
          tier: "Uncertain",
          sub: <>Only <b>1</b> reporting year on file; no adjacent-year Δ to weather-normalize against. NYCHA R² not yet computed for this development.</>,
        },
        coverage: {
          big: "1",
          unit: "yr",
          sub: <>History <b>2022 only</b> · '23/'24 pending · EUI unavailable · DOB permits <b>0</b> recent.</>,
        },
      },
      drivers: [
        { rank: 1, name: "Reporting coverage", value: <><b>1</b> of 3 yrs</>, direction: "down", barPct: 30, contrib: "n/a" },
        { rank: 2, name: "NYCHA fit (R²)", value: <><b>not run</b></>, direction: "down", barPct: 25, contrib: "n/a" },
        { rank: 3, name: "Steam share of building emissions", value: <><b>51%</b> of GHG</>, direction: "up", barPct: 15, contrib: "n/a" },
      ],
      narrative: null,
      status: "Unreviewed",
    },
  },
  {
    id: "CF-4",
    name: "Divergent · base Low → final High",
    scenario: "Two-tier v1.1 promotion (L3): ML base tier is Low but statute/trend modifiers push the final tier to High. Divergence is visible in the ledger sub-line.",
    props: {
      identity: {
        address: "77 Water St.",
        meta: [
          "BBL 1-00040-0022",
          "Office · Built 1970 · 542,000 ft²",
          "SC-5 (Negotiated)",
        ],
        cluster: "Large-Format Office · Statute-Driven Pressure",
        right: [
          <>Steam '24 <b>184.2 M kBtu</b> · GHG <b>14,880 MT CO₂e</b></>,
          <>Steam share of GHG <b>62%</b> · Energy Star <b>71 / 100</b></>,
          <>Account owner <b>unmapped</b> · Data <b>LL84 2025-05</b></>,
        ],
      },
      ledger: {
        queue: {
          percentile: "42nd",
          sub: "#701 of 1,210 · ML base tier: Low",
          provenance: PROVENANCE,
        },
        tier: {
          tier: "High",
          sub: <>Base <b>Low</b> promoted by statute modifier: LL97 penalty <b>$2.1 M</b>/yr at 2030 caps exceeds the promotion threshold. Chain: ML(Low) + LL97 → High.</>,
        },
        coverage: {
          big: "3",
          unit: "yrs",
          sub: <>History <b>2022–2024</b> · fresh Δ present · EUI <b>34.0 kBtu/ft²</b> (office median 27.5) · DOB permits <b>2</b> recent.</>,
        },
      },
      drivers: [
        { rank: 1, name: "LL97 penalty at 2030 caps", value: <><b>$2,102,400</b> / yr est.</>, direction: "up", barPct: 52, contrib: "+3.4" },
        { rank: 2, name: "Steam share of building emissions", value: <><b>62%</b> of GHG</>, direction: "up", barPct: 34, contrib: "+2.0" },
        { rank: 3, name: "Total emissions", value: <><b>14,880</b> MT CO₂e</>, direction: "up", barPct: 20, contrib: "+1.1" },
        { rank: 4, name: "YoY steam decline", value: <><b>−4%</b> HDD-normalized</>, direction: "down", barPct: 28, contrib: "−1.5" },
        { rank: 5, name: "Cluster peer score", value: <><b>0.18</b></>, direction: "down", barPct: 14, contrib: "−0.8" },
      ],
      narrative: null,
      status: "Unreviewed",
    },
  },
];
