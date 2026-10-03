// Full-page screenshots at phone (390px) and desktop (1440px) widths, plus a report of console errors,
// horizontal overflow and clipped content (text cut off by an overflow:hidden box, images hanging off-screen).
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
    const clipped = await page.evaluate(findClipped);
    if (clipped.length) {
      problems++;
      console.log(`[${vp.name}] ${p}: ${clipped.length} clipped\n  ${clipped.slice(0, 12).join('\n  ')}`);
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

/**
 * Runs in the page. Flags visible text that an overflow:hidden/clip ancestor cuts off, and images that hang
 * past the viewport edge. Scrollable rows (overflow:auto/scroll), decorative aria-hidden parts and
 * screen-reader-only text are intentional and skipped.
 */
function findClipped() {
  const out = [];
  const describe = (el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.classList.length ? '.' + [...el.classList].slice(0, 3).join('.') : ''}`;
  const skip = (el) => el.closest('[aria-hidden="true"], .sr-only, [hidden], [inert], script, style, noscript') || !el.checkVisibility({ visibilityProperty: true, opacityProperty: true });
  const cuts = (r, el) => {
    for (let a = el; a && a !== document.documentElement; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.webkitLineClamp && cs.webkitLineClamp !== 'none') return null;
      const ar = a.getBoundingClientRect();
      const x = /hidden|clip/.test(cs.overflowX) && (r.left < ar.left - 1 || r.right > ar.right + 1);
      const y = /hidden|clip/.test(cs.overflowY) && (r.top < ar.top - 1 || r.bottom > ar.bottom + 1);
      if (x || y) return a;
      // Inside a scroll container the content is reachable by scrolling (note: overflow-x:hidden alone computes y to auto).
      if (/auto|scroll/.test(cs.overflowX + cs.overflowY)) return null;
    }
    return null;
  };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!el || !n.textContent.trim() || skip(el)) continue;
    range.selectNodeContents(n);
    const r = range.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const a = cuts(r, el);
    if (a) out.push(`text "${n.textContent.trim().slice(0, 40)}" in ${describe(el)} cut by ${describe(a)}`);
  }
  for (const img of document.querySelectorAll('img, svg')) {
    if (skip(img)) continue;
    const r = img.getBoundingClientRect();
    if (!r.width) continue;
    let scroller = false;
    for (let a = img.parentElement; a; a = a.parentElement) if (/auto|scroll/.test(getComputedStyle(a).overflowX)) scroller = true;
    if (!scroller && (r.left < -1 || r.right > innerWidth + 1)) out.push(`image ${describe(img)} off-screen (${Math.round(r.left)}→${Math.round(r.right)})`);
  }
  return out;
}
