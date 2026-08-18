import { describe, it, expect } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import CriticalQueue from "../next/CriticalQueue.jsx";

// Minimal building factory. Fields align with useBuildings' merged shape.
function bldg(overrides = {}) {
  return {
    bbl: "1000000000",
    address: "1 TEST ST",
    ml_risk: 0.7,
    diagnostic_risk: "High",
    norm_delta_23_24: -0.4,
    outlier_23_24: true,
    outlier_22_23: false,
    decline_trend_label: "accelerating",
    steam: 12_000_000,
    ll97_penalty_2024: 0,
    ll97_penalty_2030: 75_000,
    ...overrides,
  };
}

// A rowset engineered so the aggregate math is predictable.
// - 3 Critical rows spanning three LL97 bands
// - 1 non-Critical row (below ml_risk threshold) that must not leak in
const FIXTURE = [
  bldg({ bbl: "1", address: "A", ll97_penalty_2030: 0 }),           // under-cap
  bldg({ bbl: "2", address: "B", ll97_penalty_2030: 120_000 }),      // 50-250k
  bldg({ bbl: "3", address: "C", ll97_penalty_2030: 2_000_000,
         outlier_23_24: false, decline_trend_label: "accelerating" }), // 1m+, accelerating only
  bldg({ bbl: "4", address: "D", ml_risk: 0.2,                       // NOT Critical
         ll97_penalty_2030: 5_000_000,
         outlier_23_24: false, decline_trend_label: "stable",
         diagnostic_risk: "Low" }),
];

function renderQueue(props = {}) {
  return render(
    <CriticalQueue buildings={FIXTURE} runDate="2026-08-01T00:00:00Z" {...props} />
  );
}

describe("CriticalQueue — M11 aggregate view", () => {
  it("defaults to List view", () => {
    renderQueue();
    expect(screen.getByRole("button", { name: "List" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Aggregate" })).toHaveAttribute("aria-pressed", "false");
  });

  it("switches to Aggregate and shows filter expression + n + run stamp", () => {
    renderQueue();
    fireEvent.click(screen.getByRole("button", { name: "Aggregate" }));

    const stamp = screen.getByText(/Filter:/);
    expect(stamp).toHaveTextContent("ml_risk ≥ 0.6");
    expect(stamp).toHaveTextContent("n = 3"); // 3 Critical, not 4
    expect(stamp).toHaveTextContent("run 2026-08-01");
  });

  it("derives band counts from the filtered rowset only — 5M non-Critical row must not leak", () => {
    renderQueue();
    fireEvent.click(screen.getByRole("button", { name: "Aggregate" }));

    // The non-Critical $5M row would land in $1M+ if leaked; assert $1M+ = 1 not 2.
    const bandsSection = screen.getByText("LL97 2030 penalty bands").closest("section");
    const rows = within(bandsSection).getAllByRole("listitem");
    const byLabel = Object.fromEntries(
      rows.map((li) => [li.textContent.replace(/\d+$/, "").trim(), li.textContent.match(/\d+$/)?.[0]])
    );
    expect(byLabel["Under 2030 cap"]).toBe("1");
    expect(byLabel["$50k–250k"]).toBe("1");
    expect(byLabel["$1M+"]).toBe("1");
    expect(byLabel["$1–50k"]).toBe("0");
    expect(byLabel["$250k–1M"]).toBe("0");
  });

  it("renders the 'Under 2030 cap' label, not '$0'", () => {
    renderQueue();
    fireEvent.click(screen.getByRole("button", { name: "Aggregate" }));
    expect(screen.getByText("Under 2030 cap")).toBeTruthy();
    expect(screen.queryByText("$0")).toBeNull();
  });

  it("emits symmetric co-occurrence pairs across the three modifiers (3 choose 2 = 3 pairs)", () => {
    renderQueue();
    fireEvent.click(screen.getByRole("button", { name: "Aggregate" }));
    const coSection = screen.getByText("Co-occurrence").closest("section");
    const items = within(coSection).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    // Fixture: 2 rows are Outlier Δ + Accelerating; 0 are Modifier-promoted.
    const pairText = items.map((li) => li.textContent);
    expect(pairText.some((t) => t.includes("Outlier Δ + Accelerating") && t.endsWith("2"))).toBe(true);
  });
});
