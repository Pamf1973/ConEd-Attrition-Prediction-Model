// Smoke tests for pure utility functions from api/utils.js.
import { describe, it, expect } from "vitest";
import { csvCell, validateSpec, _isRetryable } from "./utils.js";

describe("csvCell", () => {
  it("returns number as string (no quotes)", () => {
    expect(csvCell(42)).toBe("42");
  });
  it("returns float as string", () => {
    expect(csvCell(3.14)).toBe("3.14");
  });
  it("wraps plain strings in double quotes", () => {
    expect(csvCell("hello")).toBe('"hello"');
  });
  it("escapes internal double quotes by doubling them", () => {
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
  });
  it("prefixes = to block formula injection", () => {
    expect(csvCell("=SUM(A1)")).toBe('"\'=SUM(A1)"');
  });
  it("prefixes + to block formula injection", () => {
    expect(csvCell("+cmd")).toBe('"\'+cmd"');
  });
  it("prefixes - to block formula injection", () => {
    expect(csvCell("-1+2")).toBe('"\'-1+2"');
  });
  it("prefixes @ to block formula injection", () => {
    expect(csvCell("@NOW()")).toBe('"\'@NOW()"');
  });
  it("handles null as empty quoted string", () => {
    expect(csvCell(null)).toBe('""');
  });
  it("handles undefined as empty quoted string", () => {
    expect(csvCell(undefined)).toBe('""');
  });
  it("handles empty string as empty quoted string", () => {
    expect(csvCell("")).toBe('""');
  });
  it("does NOT quote Infinity (non-finite number falls through to string path)", () => {
    expect(csvCell(Infinity)).toBe('"Infinity"');
  });
  it("does NOT quote NaN (non-finite, goes through string path)", () => {
    expect(csvCell(NaN)).toBe('"NaN"');
  });
  it("zero is a valid finite number — returned as '0'", () => {
    expect(csvCell(0)).toBe("0");
  });
  it("negative number returned without quotes", () => {
    expect(csvCell(-99)).toBe("-99");
  });
});

describe("validateSpec", () => {
  it("clamps risk_min to [0, 1]", () => {
    expect(validateSpec({ risk_min: -0.5 }).risk_min).toBe(0);
    expect(validateSpec({ risk_min: 1.5 }).risk_min).toBe(1);
    expect(validateSpec({ risk_min: 0.6 }).risk_min).toBe(0.6);
  });
  it("clamps risk_max to [0, 1]", () => {
    expect(validateSpec({ risk_max: 2 }).risk_max).toBe(1);
  });
  it("returns null for non-finite risk values", () => {
    expect(validateSpec({ risk_min: "abc" }).risk_min).toBeNull();
    expect(validateSpec({ risk_min: null }).risk_min).toBeNull();
  });
  it("accepts valid use types", () => {
    expect(validateSpec({ use: "Office" }).use).toBe("Office");
    expect(validateSpec({ use: "Hotel" }).use).toBe("Hotel");
  });
  it("rejects unknown use types", () => {
    expect(validateSpec({ use: "Warehouse" }).use).toBeNull();
    expect(validateSpec({ use: "" }).use).toBeNull();
  });
  it("accepts valid signals", () => {
    expect(validateSpec({ signal: "big_drop" }).signal).toBe("big_drop");
    expect(validateSpec({ signal: "mod_drop" }).signal).toBe("mod_drop");
    expect(validateSpec({ signal: null }).signal).toBeNull();
  });
  it("rejects unknown signals", () => {
    expect(validateSpec({ signal: "mystery" }).signal).toBeNull();
  });
  it("defaults sort_by to 'risk' for unknown sort fields", () => {
    expect(validateSpec({ sort_by: "address" }).sort_by).toBe("risk");
    expect(validateSpec({ sort_by: "risk" }).sort_by).toBe("risk");
    expect(validateSpec({ sort_by: "steam" }).sort_by).toBe("steam");
  });
  it("defaults sort_dir to 'desc' for unknown directions", () => {
    expect(validateSpec({ sort_dir: "random" }).sort_dir).toBe("desc");
    expect(validateSpec({ sort_dir: "asc" }).sort_dir).toBe("asc");
  });
  it("truncates explanation to 200 chars", () => {
    const long = "x".repeat(300);
    expect(validateSpec({ explanation: long }).explanation).toHaveLength(200);
  });
  it("returns empty string for non-string explanation", () => {
    expect(validateSpec({ explanation: 42 }).explanation).toBe("");
    expect(validateSpec({ explanation: null }).explanation).toBe("");
  });
});

describe("_isRetryable", () => {
  it("retries on 402 payment errors", () => {
    expect(_isRetryable("Claude API 402: payment required")).toBe(true);
  });
  it("retries on 429 rate limit", () => {
    expect(_isRetryable("Groq API 429: rate limit exceeded")).toBe(true);
  });
  it("retries on credit balance errors", () => {
    expect(_isRetryable("insufficient credit balance")).toBe(true);
  });
  it("retries on 5xx server errors", () => {
    expect(_isRetryable("API 500: internal server error")).toBe(true);
    expect(_isRetryable("API 503: service unavailable")).toBe(true);
  });
  it("does NOT retry on 401 auth errors", () => {
    expect(_isRetryable("Claude API 401: unauthorized")).toBe(false);
  });
  it("does NOT retry on 400 validation errors", () => {
    expect(_isRetryable("Claude API 400: bad request")).toBe(false);
  });
  it("does NOT retry on generic errors", () => {
    expect(_isRetryable("network timeout")).toBe(false);
  });
});
