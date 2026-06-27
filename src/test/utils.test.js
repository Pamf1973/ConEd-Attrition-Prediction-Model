import { describe, it, expect } from "vitest";
import { riskTier, signalMeta } from "../data/useBuildings";

describe("riskTier", () => {
  it("returns High for risk > 0.7", () => {
    const t = riskTier(0.85);
    expect(t.label).toBe("High");
  });
  it("returns Medium for risk 0.4-0.7", () => {
    const t = riskTier(0.55);
    expect(t.label).toBe("Medium");
  });
  it("returns Low for risk < 0.4", () => {
    const t = riskTier(0.1);
    expect(t.label).toBe("Low");
  });
  it("handles boundary 0.7 exactly", () => {
    expect(riskTier(0.7).label).not.toBe("High"); // 0.7 is not > 0.7
  });
  it("handles null/undefined gracefully", () => {
    const t = riskTier(null);
    expect(t).toBeDefined();
    expect(t.label).toBeDefined();
  });
});

describe("signalMeta", () => {
  it("returns a color and label for big_drop", () => {
    const s = signalMeta("big_drop");
    expect(s.color).toBeTruthy();
    expect(s.label).toBeTruthy();
  });
  it("returns something for unknown signal", () => {
    const s = signalMeta("unknown_signal");
    expect(s).toBeDefined();
    expect(s.label).toBeDefined();
    expect(s.color).toBeDefined();
  });
  it("returns a different label for mod_drop vs big_drop", () => {
    const big = signalMeta("big_drop");
    const mod = signalMeta("mod_drop");
    expect(big.label).not.toBe(mod.label);
  });
});
