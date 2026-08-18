import { describe, it, expect } from "vitest";
import { buildStatusEvents } from "../../api/mergeStatusEvents.mjs";

const BBL_TO_ADDR = {
  "1000010001": "1 W 34TH ST",
  "1000010002": "200 E 42ND ST",
  "1000010003": "500 5TH AVE",
};

const NOW = new Date("2026-08-18T12:00:00Z").getTime();

function row(bbl, status, actor, iso) {
  return { bbl, status, actor, created_at: iso };
}

describe("buildStatusEvents", () => {
  it("returns [] on empty input", () => {
    expect(buildStatusEvents([], BBL_TO_ADDR, NOW)).toEqual([]);
  });

  it("emits one STATUS event per BBL (dedupes to latest, since input is newest-first)", () => {
    const rows = [
      row("1000010001", "Confirmed at-risk", "edwin", "2026-08-17T10:00:00Z"),
      row("1000010001", "Contacted",         "edwin", "2026-08-15T09:00:00Z"), // older, same BBL — dropped
      row("1000010002", "Dismissed",         "ismael", "2026-08-16T14:00:00Z"),
    ];
    const events = buildStatusEvents(rows, BBL_TO_ADDR, NOW);
    expect(events).toHaveLength(2);
    expect(events[0].verb).toBe("moved to Confirmed at-risk");
    expect(events[1].verb).toBe("moved to Dismissed");
  });

  it("uses address from lookup, falls back to BBL when unknown", () => {
    const rows = [
      row("1000010001", "Contacted", "edwin", "2026-08-17T10:00:00Z"),
      row("9999999999", "Contacted", "edwin", "2026-08-17T09:00:00Z"),
    ];
    const events = buildStatusEvents(rows, BBL_TO_ADDR, NOW);
    expect(events[0].subject).toBe("1 W 34TH ST");
    expect(events[1].subject).toBe("BBL 9999999999");
  });

  it("formats 'evidence' with actor and human day count", () => {
    const rows = [row("1000010001", "Contacted", "edwin", "2026-08-15T12:00:00Z")];
    const events = buildStatusEvents(rows, BBL_TO_ADDR, NOW);
    expect(events[0].evidence).toBe("by edwin · 3 days ago");
  });

  it("rolls the tail into an aggregate row when > MAX individual events", () => {
    // 22 distinct BBLs — 20 individual + 2 in overflow aggregate.
    // Use large-offset BBLs so String(i) doesn't collide under padding.
    const rows = Array.from({ length: 22 }, (_, i) =>
      row(String(2_000_000_000 + i), "Contacted", "edwin", `2026-08-${17 - Math.floor(i / 5)}T10:00:00Z`)
    );
    const events = buildStatusEvents(rows, BBL_TO_ADDR, NOW);
    expect(events).toHaveLength(21); // 20 individual + 1 aggregate
    const agg = events[events.length - 1];
    expect(agg.subject).toMatch(/^2 more building/);
    expect(agg.verb).toBe("had status updates");
    expect(agg.evidence).toContain("Contacted");
  });

  it("each individual event carries the consequence 'Open case file'", () => {
    const rows = [row("1000010001", "Contacted", "edwin", "2026-08-17T10:00:00Z")];
    const events = buildStatusEvents(rows, BBL_TO_ADDR, NOW);
    expect(events[0].consequence).toBe("Open case file");
    expect(events[0].address).toBe("1 W 34TH ST");
    expect(events[0].bbl).toBe("1000010001");
  });
});
