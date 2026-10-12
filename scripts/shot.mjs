// Screenshot halaman untuk cek visual: node scripts/shot.mjs <path> <out.png> [width] [fullPage]
import { chromium } from "@playwright/test";

const [, , path = "/", out = "shot.png", width = "390", full = "1"] = process.argv;
const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage({ viewport: { width: Number(width), height: 844 }, deviceScaleFactor: 1 });
await page.goto(`http://localhost:3100${path}`, { waitUntil: "load" });
await page.waitForTimeout(Number(process.env.SHOT_WAIT ?? 2500));
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
await page.screenshot({ path: out, fullPage: full === "1" });
console.log(JSON.stringify({ out, overflowPx: overflow }));
await browser.close();
