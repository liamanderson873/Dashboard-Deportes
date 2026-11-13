// Generates the README screenshots and the demo frames.
// Usage: node scripts/capture-screenshots.mjs [baseUrl]   (default http://localhost:3000)
// Needs Microsoft Edge installed and the web app running with real data.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const imgDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../docs/img");
const framesDir = path.join(imgDir, "frames");
mkdirSync(framesDir, { recursive: true });

const HIDE_DEV_BADGE = "nextjs-portal { display: none !important; }";

async function settle(page) {
  await page.addStyleTag({ content: HIDE_DEV_BADGE });
  await page.waitForLoadState("networkidle", { timeout: 60000 });
  // The section tabs only exist once the streamed page has replaced the skeleton.
  await page.locator('nav[aria-label="Secciones"], nav[aria-label="Secciones NBA"]').first().waitFor({ timeout: 60000 });
  await page.waitForFunction(() => !document.body.innerText.includes("Cargando…"), null, {
    timeout: 60000,
  });
  // Lazy images only load once scrolled into view: scroll through, then wait.
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page
    .waitForFunction(() => [...document.images].every((img) => img.complete), null, { timeout: 20000 })
    .catch(() => console.warn("  some images did not finish loading:", page.url()));
  // Web fonts (Inter / Archivo / JetBrains Mono) load asynchronously; capture only once they are applied.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
}

async function open(page, route) {
  await page.goto(base + route, { waitUntil: "load", timeout: 90000 });
  await settle(page);
}

const browser = await chromium.launch({ channel: "msedge" });
try {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: "es-ES",
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);

  const shots = [
    ["nba-standings.png", "/nba/2026", {}],
    ["nba-models.png", "/nba/2026/modelos", {}],
    ["nba-lineup.png", "/nba/2026/quinteto", {}],
    ["nba-shots.png", "/nba/2026/jugador/201939", { nbaShotRegion: true }],
    ["matches-2026.png", "/pd/2026/partidos", {}],
    ["players-2026.png", "/pd/2026/jugadores", {}],
    ["lineup-2026.png", "/pd/2026/mi-once", {}],
    ["standings.png", "/pd/2024", {}],
    ["results.png", "/pd/2024/resultados/38", {}],
    ["scorers.png", "/pd/2024/goleadores", {}],
    ["team.png", "/pd/2024/equipo/81", { clip: { x: 0, y: 0, width: 1280, height: 1600 }, fullPage: true }],
    ["compare.png", "/pd/2024/comparar?a=81&b=86", {}],
  ];
  for (const [file, route, opts] of shots) {
    await open(page, route);
    if (opts.nbaShotRegion) {
      await page.getByRole("region", { name: "Mapa y calidad de tiro NBA" }).screenshot({ path: path.join(imgDir, file) });
    } else {
      await page.screenshot({ path: path.join(imgDir, file), ...opts });
    }
    console.log("saved", file);
  }

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "es-ES",
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const mpage = await mobile.newPage();
  mpage.setDefaultTimeout(60000);
  await open(mpage, "/pd/2024");
  await mpage.screenshot({ path: path.join(imgDir, "mobile.png") });
  console.log("saved mobile.png");

  // Demo tour frames: standings -> Barça -> chart -> comparator -> results.
  await ctx.close();
  const tour = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: "es-ES",
  });
  const tp = await tour.newPage();
  tp.setDefaultTimeout(60000);
  let n = 0;
  const frame = async (heading) => {
    await settle(tp);
    if (heading) {
      await tp.getByRole("heading", { level: 2, name: heading }).scrollIntoViewIfNeeded();
      await tp.waitForTimeout(300);
    }
    await tp.screenshot({ path: path.join(framesDir, `frame-${String(n++).padStart(2, "0")}.png`) });
  };
  await open(tp, "/pd/2024");
  await frame();
  await tp.getByRole("link", { name: "Barça", exact: true }).first().click();
  await tp.waitForURL("**/equipo/81");
  await frame();
  await frame("Evolución");
  await frame("Estadísticas por partido");
  await open(tp, "/pd/2024/comparar?a=81&b=86");
  await frame();
  await tp.getByRole("link", { name: "Resultados" }).first().click();
  await tp.waitForURL("**/resultados**");
  await frame();
  console.log("saved", n, "frames");
} finally {
  await browser.close();
}
