// Checks every link in the built site:
// - internal links and #anchors resolve to real pages/ids
// - every WhatsApp link uses one of the three branch numbers, and its pre-filled text names the same branch
// - every Directions link points at a branch's Maps query, and each branch page links its own number + directions
// - Instagram/Facebook links point at @nourishbali
// Usage: npm run build && npm run check:links [-- --live]   (--live also requests wa.me / Google Maps)
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = ['.vercel/output/static', 'dist'].find((d) => existsSync(join(d, 'index.html')));
if (!ROOT) {
  console.error('No build output found. Run `npm run build` first.');
  process.exit(1);
}
const live = process.argv.includes('--live');

const branches = ['uluwatu', 'ungasan', 'berawa'].map((s) => JSON.parse(readFileSync(`src/content/branches/${s}.json`, 'utf8')));
const site = JSON.parse(readFileSync('src/content/site.json', 'utf8'));
const waDigits = (d) => d.replace(/\D/g, '').replace(/^0/, '62');
const byNumber = new Map(branches.map((b) => [waDigits(b.whatsapp), b]));
const byQuery = new Map(branches.map((b) => [b.maps.query, b]));

const pages = [];
const walk = (dir) =>
  readdirSync(dir).forEach((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.html')) pages.push(p);
  });
walk(ROOT);

const decode = (s) => s.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'");
const idsOf = new Map();
const routeOf = (file) => '/' + relative(ROOT, file).replace(/index\.html$/, '').replace(/\.html$/, '').replace(/\/$/, '');
for (const f of pages) idsOf.set(routeOf(f) || '/', new Set([...readFileSync(f, 'utf8').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));

const errors = [];
const external = new Set();
let checked = 0;

for (const file of pages) {
  const route = routeOf(file) || '/';
  const html = readFileSync(file, 'utf8');
  const hrefs = [...html.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)].map((m) => decode(m[1]));
  const pageBranch = branches.find((b) => route === `/${b.slug}`);
  let ownWa = false;
  let ownDir = false;

  for (const href of hrefs) {
    checked++;
    if (href.startsWith('#')) {
      if (href.length > 1 && !idsOf.get(route)?.has(href.slice(1))) errors.push(`${route}: missing anchor ${href}`);
      continue;
    }
    if (href.startsWith('/')) {
      const [path, hash] = href.split('#');
      const clean = path.split('?')[0].replace(/\/$/, '') || '/';
      const target = idsOf.has(clean) ? clean : null;
      const asset = existsSync(join(ROOT, clean));
      if (!target && !asset) errors.push(`${route}: broken internal link ${href}`);
      else if (hash && target && !idsOf.get(target).has(hash)) errors.push(`${route}: ${href} → no element #${hash}`);
      continue;
    }
    const url = new URL(href);
    if (url.hostname === 'wa.me') {
      const num = url.pathname.slice(1);
      const b = byNumber.get(num);
      if (!b) errors.push(`${route}: WhatsApp link to unknown number ${num}`);
      const text = url.searchParams.get('text');
      if (b && text && !text.startsWith(`Hi Nourish ${b.name}`)) errors.push(`${route}: WhatsApp ${num} (${b.name}) has text for another café: "${text}"`);
      if (pageBranch && b === pageBranch) ownWa = true;
      external.add(`https://wa.me/${num}`);
    } else if (url.hostname === 'www.google.com' && url.pathname.startsWith('/maps')) {
      const q = url.searchParams.get('destination') ?? url.searchParams.get('query') ?? url.searchParams.get('q');
      const b = byQuery.get(q);
      if (!b) errors.push(`${route}: Maps link with unknown place "${q}"`);
      if (url.pathname === '/maps/dir/' && url.searchParams.get('api') !== '1') errors.push(`${route}: Directions link missing api=1`);
      if (pageBranch && b === pageBranch && url.pathname === '/maps/dir/') ownDir = true;
      external.add(href);
    } else if (url.hostname === 'www.instagram.com') {
      if (url.pathname !== `/${site.instagram}/`) errors.push(`${route}: Instagram link ${href}`);
      external.add(href);
    } else if (url.hostname === 'www.facebook.com') {
      if (url.pathname !== `/${site.facebook}`) errors.push(`${route}: Facebook link ${href}`);
      external.add(href);
    } else if (!['unsplash.com', 'github.com'].includes(url.hostname)) {
      errors.push(`${route}: unexpected external link ${href}`);
    }
  }
  if (pageBranch && !ownWa) errors.push(`${route}: no WhatsApp link for ${pageBranch.name}`);
  if (pageBranch && !ownDir) errors.push(`${route}: no Directions link for ${pageBranch.name}`);
}

if (live) {
  for (const href of external) {
    try {
      const res = await fetch(href, { redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0 link-check' } });
      const loc = res.headers.get('location') ?? '';
      if (href.startsWith('https://wa.me/')) {
        const num = href.split('/').pop();
        if (res.status !== 302 || !loc.includes(`phone=${num}`)) errors.push(`live: ${href} → ${res.status} ${loc}`);
      } else if (href.includes('google.com/maps') && res.status !== 200) errors.push(`live: ${href} → ${res.status}`);
      console.log(`live ${res.status} ${href}`);
    } catch (e) {
      console.log(`live (network error, skipped) ${href}: ${e.message}`);
    }
  }
}

console.log(`Checked ${checked} links on ${pages.length} pages (${external.size} unique external).`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('All links OK.');
