/**
 * M5 PDF generation. Isolated wrapper around Puppeteer so a future swap
 * to `puppeteer-core + @sparticuz/chromium` (if Railway image size bites)
 * is one-file.
 *
 * Design: one layout, two outputs. This module launches headless chromium,
 * navigates to /report/:bbl on the same running server, forwards the
 * caller's session token, and captures with emulateMediaType('print').
 * The screen DOM at /report/:bbl is the source of truth — no separate
 * print template.
 *
 * Graceful degradation per roadmap §M5: if this module fails, browser
 * print-to-PDF of /report/:bbl is the deliverable.
 */

import puppeteer from "puppeteer";

// Reuse one browser across requests. Chromium launch is ~2s; per-request
// launches would make report exports painfully slow.
let browserPromise = null;

function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    browserPromise.catch(() => { browserPromise = null; });
  }
  return browserPromise;
}

export async function shutdownBrowser() {
  if (!browserPromise) return;
  const b = await browserPromise.catch(() => null);
  browserPromise = null;
  if (b) await b.close().catch(() => {});
}

/**
 * Render /report/:bbl to a PDF Buffer.
 *
 * @param {string} bbl        Normalized BBL (validated upstream).
 * @param {string} token      Session token to forward via sessionStorage.
 * @param {object} opts
 * @param {string} opts.origin  Base URL of the running server (http://localhost:PORT).
 * @returns {Promise<Buffer>}
 */
export async function renderReportPdf(bbl, token, { origin }) {
  if (!bbl) throw new Error("renderReportPdf: bbl required");
  if (!token) throw new Error("renderReportPdf: token required");
  if (!origin) throw new Error("renderReportPdf: origin required");

  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    // Seed sessionStorage before the SPA loads so useBuildings() sees the
    // token on its first render.
    await page.evaluateOnNewDocument((tok) => {
      try { window.sessionStorage.setItem("coned_token", tok); } catch (_) {}
    }, token);

    const url = `${origin}/report/${encodeURIComponent(bbl)}`;
    await page.goto(url, { waitUntil: "networkidle0", timeout: 30_000 });
    await page.emulateMediaType("print");

    const pdf = await page.pdf({
      format: "Letter",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0.5in", right: "0.5in", bottom: "0.5in", left: "0.5in" },
    });
    return pdf;
  } finally {
    await page.close().catch(() => {});
  }
}
