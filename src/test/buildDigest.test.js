import { describe, it, expect } from "vitest";
import { buildDigest, buildSubject, topOfQueue, computePulseFromBuildings } from "../next/buildDigest.js";

const b = (over = {}) => ({
  address: "200 East 42nd St",
  bbl: "1013000001",
  ml_risk: 0.95,
  diagnostic_risk: "High",
  ll97_penalty_2024: 1190650,
  norm_delta_23_24: -66,
  outlier_23_24: true,
  decline_trend_label: "accelerating",
  ...over,
});

const modelMeta = {
  model_version: "XGB v1 · UNVAL",
  cv_auc: 0.6833,
  validation_status: "unvalidated",
  run_date: "2026-07-06T06:00:00Z",
};

describe("buildDigest", () => {
  it("subject follows D1 format", () => {
    const s = buildSubject({ weekOf: "Jul 6", criticalNew: 3, toReview: 15 });
    expect(s).toBe("Steam attrition · Week of Jul 6 · 3 new Critical · 15 to review");
  });

  it("Critical filter matches Ismael's canonical definition", () => {
    // baseline b() passes: ml_risk 0.95, delta present, outlier true
    expect(topOfQueue([b()]).length).toBe(1);
    // ml_risk below 0.6 → not Critical
    expect(topOfQueue([b({ ml_risk: 0.5 })]).length).toBe(0);
    // norm_delta_23_24 null → not Critical
    expect(topOfQueue([b({ norm_delta_23_24: null })]).length).toBe(0);
    // outlier false + non-accelerating trend → not Critical
    expect(topOfQueue([b({ outlier_23_24: false, decline_trend_label: "stable" })]).length).toBe(0);
    // outlier false but accelerating trend → Critical
    expect(topOfQueue([b({ outlier_23_24: false, decline_trend_label: "accelerating" })]).length).toBe(1);
  });

  it("topOfQueue ranks by ml_risk desc", () => {
    const buildings = [
      b({ address: "A", ml_risk: 0.65 }),
      b({ address: "B", ml_risk: 0.99 }),
      b({ address: "C", ml_risk: 0.75 }),
    ];
    const top = topOfQueue(buildings, 3);
    expect(top.map((x) => x.address)).toEqual(["B", "C", "A"]);
  });

  it("pulse counts by tier and derives critical from Ismael's filter", () => {
    const p = computePulseFromBuildings([
      b(),
      b({ diagnostic_risk: "Medium", ml_risk: 0.4, outlier_23_24: false }),
      b({ diagnostic_risk: "Low", ml_risk: 0.1, outlier_23_24: false }),
      b({ diagnostic_risk: null, ml_risk: null, outlier_23_24: false, norm_delta_23_24: null }),
    ]);
    expect(p).toEqual({ total: 4, high: 1, medium: 1, low: 1, uncertain: 1, critical: 1 });
  });

  it("HTML has no external images (D3)", () => {
    const { html } = buildDigest({ buildings: [b()], modelMeta });
    expect(html).not.toMatch(/<img/i);
    expect(html).not.toMatch(/background-image/i);
  });

  it("plain-text twin includes subject, portfolio, and top-of-queue address", () => {
    const { text, subject } = buildDigest({ buildings: [b()], modelMeta });
    expect(text.startsWith(subject)).toBe(true);
    expect(text).toMatch(/200 East 42nd St/);
    expect(text).toMatch(/PORTFOLIO/);
    expect(text).toMatch(/Critical 1/);
  });

  it("HTML and text carry the same critical count", () => {
    const { html, text, pulse } = buildDigest({
      buildings: [b(), b({ address: "X", ml_risk: 0.72 })],
      modelMeta,
    });
    expect(pulse.critical).toBe(2);
    expect(html).toMatch(/Critical <b>2<\/b>/);
    expect(text).toMatch(/Critical 2/);
  });

  it("quiet-week fallback when events are missing (D2)", () => {
    const { html, text } = buildDigest({ buildings: [b()], modelMeta, events: null });
    expect(text).toMatch(/Nothing crossed a threshold/);
    expect(html).toMatch(/Nothing crossed a threshold/);
  });

  it("uses events when provided", () => {
    const events = [
      { kind: "TIER", to: "Critical", summary: "660 Madison Ave entered Critical." },
      { kind: "PERMIT", summary: "415 E 68 St filed a DOB boiler-work permit Jul 2." },
    ];
    const { subject, text } = buildDigest({ buildings: [b()], modelMeta, events });
    expect(subject).toMatch(/1 new Critical/);
    expect(text).toMatch(/660 Madison Ave entered Critical\./);
    expect(text).toMatch(/DOB boiler-work permit/);
  });

  it("method footer names AUC when available, else states pending", () => {
    const withAuc = buildDigest({ buildings: [b()], modelMeta });
    expect(withAuc.text).toMatch(/AUC 0\.683/);
    const noAuc = buildDigest({ buildings: [b()], modelMeta: { ...modelMeta, cv_auc: null } });
    expect(noAuc.text).toMatch(/AUC pending/);
  });

  it("escapes address to prevent HTML injection", () => {
    const evil = b({ address: '<script>alert(1)</script>' });
    const { html } = buildDigest({ buildings: [evil], modelMeta });
    expect(html).not.toMatch(/<script>alert\(1\)<\/script>/);
    expect(html).toMatch(/&lt;script&gt;/);
  });
});
