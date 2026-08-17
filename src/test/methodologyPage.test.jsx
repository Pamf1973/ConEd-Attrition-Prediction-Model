import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MethodologyPage from "../next/MethodologyPage.jsx";

const META = {
  model_name: "XGBoost Classifier",
  model_version: "XGB v1 · UNVAL",
  params_hash: "d4b0279a7ba6",
  commit: "9afa92b",
  cv_auc: 0.6833,
  cv_std: 0.0511,
  cv_kfold: 5,
  n_labeled: 1003,
  n_positive: 54,
  label_definition: ">=50% weather-normalized steam demand decline in LL84 CY2022 or CY2023",
  run_date: "2026-07-15T20:41:52Z",
  validation_status: "unvalidated",
};

function renderPage() {
  return render(
    <MemoryRouter>
      <MethodologyPage />
    </MemoryRouter>
  );
}

describe("MethodologyPage", () => {
  beforeEach(() => {
    sessionStorage.setItem("coned_token", "test-token");
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(META) })
    );
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders all nine numbered sections", async () => {
    renderPage();
    await waitFor(() => {
      for (let n = 1; n <= 9; n++) {
        expect(document.getElementById(`s${n}`)).toBeInTheDocument();
      }
    });
  });

  it("renders the title and Critical definition", async () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: /Methodology/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/23 buildings/i)).toBeInTheDocument();
    });
  });

  it("stamps sections with model_version on the model clock", async () => {
    renderPage();
    await waitFor(() => {
      const stamps = document.querySelectorAll(".mp-stamp--model .mp-stamp-val");
      expect(stamps.length).toBeGreaterThanOrEqual(5);
      stamps.forEach((el) => expect(el.textContent).toBe("XGB v1 · UNVAL"));
    });
  });

  it("stamps sections with run_date on the run clock", async () => {
    renderPage();
    await waitFor(() => {
      const stamps = document.querySelectorAll(".mp-stamp--run .mp-stamp-val");
      expect(stamps.length).toBeGreaterThanOrEqual(2);
      stamps.forEach((el) => expect(el.textContent).toMatch(/2026-07-15/));
    });
  });

  it("marks section 8 with the research-pending stamp", async () => {
    renderPage();
    await waitFor(() => {
      const el = document.querySelector(".mp-stamp--research .mp-stamp-val");
      expect(el).toBeInTheDocument();
      expect(el.textContent).toMatch(/research track pending/i);
    });
  });

  it("shows AUC line templated from model_meta per §7 rule 8", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/68% of the time/)).toBeInTheDocument();
      expect(screen.getByText(/5-fold CV/)).toBeInTheDocument();
      expect(screen.getByText(/54 positive labels/)).toBeInTheDocument();
    });
  });

  it("shows validation-rerun copy when cv_auc is null", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ ...META, cv_auc: null }) })
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Validation rerun in progress/i)).toBeInTheDocument();
    });
  });

  it("falls back to placeholder when model_meta fetch fails", async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 500 }));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/model_meta fetch failed/i)).toBeInTheDocument();
    });
  });
});
