import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ThisWeekPage from "../next/ThisWeekPage.jsx";

const META = {
  model_version: "XGB v1 · UNVAL",
  run_date: "2026-07-15T20:41:52Z",
  cv_auc: 0.6833,
};

const BUILDINGS = [
  { address: "A", bbl: "1", ghg: 100 },
  { address: "B", bbl: "2", ghg: 100 },
  { address: "C", bbl: "3", ghg: 100 },
];
const ENRICHMENT = {
  A: { ml_risk: 0.95, diagnostic_risk: "High" },
  B: { ml_risk: 0.3,  diagnostic_risk: "Medium" },
  C: { ml_risk: 0.05, diagnostic_risk: "Low" },
};

function jsonResp(body) {
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
    json: () => Promise.resolve(body),
  };
}

function mockFetch() {
  global.fetch = vi.fn((url) => {
    if (url.includes("/api/data/buildings")) return Promise.resolve(jsonResp(BUILDINGS));
    if (url.includes("/api/data/enrichment")) return Promise.resolve(jsonResp(ENRICHMENT));
    if (url.includes("/api/data/yearly")) return Promise.resolve(jsonResp({}));
    if (url.includes("/api/data/yoy-deltas")) return Promise.resolve(jsonResp({}));
    if (url.includes("/api/model_meta")) return Promise.resolve(jsonResp(META));
    return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve("") });
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ThisWeekPage />
    </MemoryRouter>
  );
}

describe("ThisWeekPage", () => {
  beforeEach(() => {
    sessionStorage.setItem("coned_token", "test-token");
    mockFetch();
  });
  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("prompts login when no session token", async () => {
    sessionStorage.clear();
    renderPage();
    expect(screen.getByText(/Sign in at/i)).toBeInTheDocument();
  });

  it("renders the topbar with the pipeline run anchor", async () => {
    renderPage();
    await waitFor(() => {
      const anchor = document.querySelector(".tw-anchor");
      expect(anchor).toBeInTheDocument();
      expect(anchor.textContent).toMatch(/Pipeline run/i);
      expect(anchor.textContent).toMatch(/Jul 15, 2026/);
    });
  });

  it("computes portfolio pulse from diagnostic_risk tiers", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/portfolio/i)).toBeInTheDocument();
    });
    const stats = document.querySelector(".tw-pulse-stats");
    expect(stats.textContent).toMatch(/High\s*1/);
    expect(stats.textContent).toMatch(/Med\s*1/);
    expect(stats.textContent).toMatch(/Low\s*1/);
  });

  it("renders placeholders for delta feed and queue", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Delta feed pending M7/i)).toBeInTheDocument();
      expect(screen.getByText(/Critical queue pending M8/i)).toBeInTheDocument();
    });
  });

  it("omits WoW parentheticals until second diffed run", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/portfolio/i)).toBeInTheDocument();
    });
    const stats = document.querySelector(".tw-pulse-stats");
    expect(stats.textContent).not.toMatch(/WoW/);
    expect(stats.textContent).not.toMatch(/\+\d/);
  });
});
