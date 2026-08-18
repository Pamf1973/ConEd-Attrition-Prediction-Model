import { describe, it, expect } from "vitest";
import { LL97_BANDS, bandOf } from "../data/ll97Bands.js";

describe("LL97_BANDS constant", () => {
  it("has exactly five bands in the canonical order", () => {
    expect(LL97_BANDS.map((b) => b.key)).toEqual([
      "under-cap", "1-50k", "50-250k", "250k-1m", "1m-plus",
    ]);
  });

  it("labels the zero bucket as 'Under 2030 cap', not '$0'", () => {
    expect(LL97_BANDS[0].label).toBe("Under 2030 cap");
  });
});

describe("bandOf", () => {
  it("routes $0 and non-numeric penalties to Under 2030 cap", () => {
    expect(bandOf(0).key).toBe("under-cap");
    expect(bandOf(null).key).toBe("under-cap");
    expect(bandOf(undefined).key).toBe("under-cap");
    expect(bandOf(NaN).key).toBe("under-cap");
  });

  it("routes penalties by canonical edges", () => {
    expect(bandOf(1).key).toBe("1-50k");
    expect(bandOf(49_999).key).toBe("1-50k");
    expect(bandOf(50_000).key).toBe("50-250k");
    expect(bandOf(249_999).key).toBe("50-250k");
    expect(bandOf(250_000).key).toBe("250k-1m");
    expect(bandOf(999_999).key).toBe("250k-1m");
    expect(bandOf(1_000_000).key).toBe("1m-plus");
    expect(bandOf(1_190_650).key).toBe("1m-plus"); // 200 E 42nd
  });
});
