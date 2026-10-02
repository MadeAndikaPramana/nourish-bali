// Full-page screenshots at phone (390px) and desktop (1440px) widths, plus a console-error report.
// Usage: BASE_URL=http://127.0.0.1:4321 node scripts/screenshots.mjs [/path ...]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:4321';
const OUT = process.env.OUT_DIR ?? 'screenshots';
const paths = process.argv.slice(2).length ? process.argv.slice(2) : ['/', '/uluwatu', '/ungasan', '/berawa', '/menu', '/404'];
const executablePath = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const viewports = [
  { name: 'phone', width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { name: 'desktop', width: 1440, height: 900, deviceScaleFactor: 1 },
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath });
let problems = 0;

for (const vp of viewports) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor, isMobile: vp.isMobile, hasTouch: vp.hasTouch, reducedMotion: 'no-preference' });
  for (const p of paths) {
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(BASE + p, { waitUntil: 'networkidle' });
    // Scroll through so lazy images, observers and count-ups run.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 500) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(800);
    // On phones, content wider than the device makes the layout viewport grow, so compare against the device width.
    const overflow = await page.evaluate((w) => Math.max(window.innerWidth, document.documentElement.scrollWidth) - w, vp.width);
    if (overflow > 0) {
      problems++;
      console.log(`[${vp.name}] ${p}: horizontal overflow ${overflow}px`);
    }
    const file = `${OUT}/${vp.name}${p === '/' ? '-home' : p.replaceAll('/', '-')}.png`;
    await page.screenshot({ path: file, fullPage: true });
    if (errors.length) {
      problems++;
      console.log(`[${vp.name}] ${p}: console errors\n  ${errors.join('\n  ')}`);
    }
    console.log(`saved ${file}`);
    await page.close();
  }
  await ctx.close();
}
await browser.close();
process.exit(problems ? 1 : 0);
