// Renders the 1200×630 link-preview images (WhatsApp, Instagram DMs, Slack) from the real page heroes.
// Usage: build, serve the build (or run `npm run dev`), then: BASE_URL=http://127.0.0.1:4321 node scripts/og.mjs
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:4321';
const executablePath = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const pages = { home: '/', uluwatu: '/uluwatu', ungasan: '/ungasan', berawa: '/berawa' };

mkdirSync('public/og', { recursive: true });
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
for (const [name, path] of Object.entries(pages)) {
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  // Fixed daytime mood so previews don't depend on when they were rendered.
  await page.evaluate(() => {
    const hero = document.getElementById('hero');
    if (hero) {
      hero.dataset.phase = 'day';
      ['#fbe38e', '#9fd9c9', '#f8f1e3', '#f6a9c4'].forEach((c, i) => hero.style.setProperty(`--c${i}`, c));
    }
    document.querySelectorAll('canvas').forEach((c) => c.remove());
    // A shared preview lives for weeks: never bake a live "Open now"/"Closed" or a clock into it.
    document.querySelectorAll('.status-board').forEach((e) => (e.style.visibility = 'hidden'));
    document.querySelectorAll('span[data-state], [title^="Bali time"]').forEach((e) => (e.style.display = 'none'));
  });
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `public/og/${name}.jpg`, type: 'jpeg', quality: 82 });
  console.log(`public/og/${name}.jpg`);
}
await browser.close();
