import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ErrorBoundary from "../next/ErrorBoundary.jsx";

function Boom() {
  throw new Error("boom");
}

describe("ErrorBoundary", () => {
  let errSpy;
  beforeEach(() => {
    errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    errSpy.mockRestore();
  });

  it("renders children when no error", () => {
    render(
      <ErrorBoundary fallback={<span>fallback</span>}>
        <span>ok</span>
      </ErrorBoundary>
    );
    expect(screen.getByText("ok")).toBeInTheDocument();
  });

  it("renders fallback when child throws", () => {
    render(
      <ErrorBoundary fallback={<span>fallback</span>}>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByText("fallback")).toBeInTheDocument();
  });

  it("logs the error to console with label", () => {
    render(
      <ErrorBoundary label="test-atom" fallback={<span>fallback</span>}>
        <Boom />
      </ErrorBoundary>
    );
    expect(errSpy).toHaveBeenCalled();
    const labeled = errSpy.mock.calls.some((args) =>
      args.some((a) => typeof a === "string" && a.includes("test-atom"))
    );
    expect(labeled).toBe(true);
  });
});
