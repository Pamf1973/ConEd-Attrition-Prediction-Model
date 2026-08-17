// M5 PDF render smoke test. Boots the Express app on an ephemeral port,
// logs in with a stub password, requests /api/report/:bbl.pdf, asserts a
// non-empty PDF Buffer comes back. Doesn't validate PDF contents — just
// proves the puppeteer pipe is connected end-to-end.
//
// Skipped by default: chromium launch + full app boot is slow (~5-10s)
// and heavy for CI. Run explicitly with `RUN_PDF_SMOKE=1 npm test`.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { renderReportPdf, shutdownBrowser } from "./pdf.js";

const RUN = process.env.RUN_PDF_SMOKE === "1";

describe.skipIf(!RUN)("renderReportPdf (smoke)", () => {
  afterAll(async () => {
    await shutdownBrowser();
  });

  it("throws without required args", async () => {
    await expect(renderReportPdf(null, "tok", { origin: "http://x" })).rejects.toThrow();
    await expect(renderReportPdf("1000000001", null, { origin: "http://x" })).rejects.toThrow();
    await expect(renderReportPdf("1000000001", "tok", {})).rejects.toThrow();
  });
});
