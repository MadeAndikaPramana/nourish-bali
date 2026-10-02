# NOURISH Bali: concept website

A private, unsolicited concept site for **NOURISH**, the healthy all-day café brand with three cafés in Badung, Bali
(Uluwatu, Ungasan, Berawa). Built by Andika as a proposal: if the owner likes it, the site and this repo are handed
over. Until then it is `noindex`, every photo is labelled stock, and every price is labelled a sample.

**Why it exists.** NOURISH has no website. The Uluwatu Google listing (3,740 reviews) links to a third-party
directory page (Placejoys), Ungasan links to Facebook and Berawa links to nothing. The menus are Google Drive PDFs
behind a linktree. This site gives the three cafés one home: live open/closed status in Bali time, the menus as fast
HTML pages with dietary filters, and one-tap WhatsApp and Directions, plus a simple admin so staff can keep hours and
prices current themselves.

---

## What's in it

| Page | What it does |
|---|---|
| `/` | Hero with a Bali-time colour mood (WebGL mesh gradient, CSS fallback), live "Open now / Closing soon / Closed" board for all three cafés, signature dishes, branch cards, an illustrated South Bali map, public Google review counts, Instagram CTA |
| `/uluwatu` `/ungasan` `/berawa` | Branch hero, live status with countdown, weekly hours (today highlighted, special days), click-to-load Google Map, WhatsApp "Ask for a table" composer, mobile action dock, and the full menu as HTML |
| `/menu` | Both menus with a switch: Uluwatu & Ungasan share one, Berawa has its own |
| `/admin` | One-password staff admin: hours, special days, temporary closure, menu items, prices, sold out, dietary marks, announcement bar, café info. One **Save** = one GitHub commit = one Vercel deploy |
| ⌘K / "Find a dish" | Searches every dish across the cafés and shows which branch has it ("pizza" → Uluwatu, Ungasan) |

Menu features: section tabs (Food, Sweets, Drinks, Bar), sticky category chips with scroll-spy, filters for the four
marks the café prints (V vegan, VG vegetarian, GF gluten free, VO vegan option), search, "Serving now" per section in
Bali time, a shareable filter URL (`/berawa?diet=V`), the tax/service note, allergen note and payment note from the
menus.

Copy is plain English. All dish names, descriptions and dietary marks come from the café's own menu PDFs
(dated 2 Mar 2026). **Prices are not copied**: every amount is a generated sample and is labelled as one.

## Stack

- **Astro 7** (static output, prerendered pages) + **React 19 islands** + **Tailwind CSS v4** + `@astrojs/vercel`.
- Only `/api/admin/*` runs on demand (one Vercel function). Everything else is static HTML.
- Content is JSON in `src/content/`, validated at build time and in the admin by one zod schema (`src/lib/schema.ts`).
- Motion (`motion`), smooth scroll on desktop (`lenis`), WebGL hero (`@paper-design/shaders-react`, Apache-2.0),
  cross-document View Transitions (branch photo morphs from card to page), ⌘K search (`cmdk`), bottom sheet (`vaul`),
  drag-and-drop in the admin (`@dnd-kit`).
- Fonts are self-hosted (Archivo, Plus Jakarta Sans, Instrument Serif; all OFL).

```
src/
  content/            branches/*.json, menus/{bukit,berawa}.json, site.json   ← what /admin edits
  lib/                schema, hours (WITA logic), links (wa.me / Maps), diff, photos, seo
  lib/server/         auth (password + signed cookie), store (GitHub Git Data API / local files)
  islands/            React islands for the public site
  admin/              the /admin app
  components/ pages/  Astro components and routes
scripts/              screenshots, link checker, OG image renderer
tests/                vitest: hours, links, content, diff, GitHub store (in-memory fake), credits
```

### Opening hours logic

Pages are prerendered, so open/closed is computed in the visitor's browser in **WITA (UTC+8, no daylight saving)**,
never baked into HTML. It handles closing in the last 30 minutes ("Closing soon"), ranges past midnight, split shifts,
special days (e.g. Nyepi, set in the admin), temporary closures and finding the next opening across closed days.
Tested in `tests/hours.test.ts`.

## Run it

```bash
nvm use            # Node 22.12+
npm install
npm run dev        # http://localhost:4321
npm test           # unit tests
npm run build      # astro check + production build
npm run check:links            # after a build: every internal link/anchor, WhatsApp, Directions, IG
npm run check:links -- --live  # also requests wa.me and Google Maps
npm run shots      # full-page screenshots at 390px and 1440px (needs the dev server running)
npm run og         # re-render the link-preview images in public/og (needs a running server)
```

Try the admin locally without any GitHub setup: `ADMIN_PASSWORD=something npm run dev`, open `/admin`. With no token,
Save writes the JSON files in `src/content` directly (the dev server reloads afterwards).

## Admin setup on Vercel

1. Import the repo in Vercel (framework preset: Astro).
2. Create a **fine-grained GitHub token**: *only this repository*, permissions **Contents: Read and write** and
   **Commit statuses: Read-only** (used to show "Publishing… → Live").
3. In Vercel → Project → Settings → Environment Variables (Production):

   | Variable | Value |
   |---|---|
   | `ADMIN_PASSWORD` | a long passphrase shared with the staff |
   | `GITHUB_TOKEN` | the token from step 2 |
   | `GITHUB_REPO` | `owner/repo`, e.g. `madeandikapramana/nourish-bali` |
   | `GITHUB_BRANCH` | the branch Vercel deploys to production, usually `main` |
   | `SESSION_SECRET` | optional; otherwise derived from the password |
   | `PUBLIC_INDEXABLE` | `false` until go-live |
   | `PUBLIC_CONCEPT` | `true` while it's a demo |
   | `SITE_URL` | the final domain, e.g. `https://nourishbali.com` |

4. Redeploy. Staff log in at `/admin`.

How Save works: the admin shows a plain-English list of changes ("Berawa · Sunday: 6am–9pm → 7am–9pm",
"Poke Bowl · Sashimi tuna: 145K → 140K"), the server re-validates everything, writes only the changed JSON files as
**one commit** (message = that list), and Vercel redeploys in about a minute. If someone else saved the same files in
the meantime, it refuses instead of overwriting. History lists the last 20 content commits and can load any of them
back into the editor. Unsaved drafts survive a closed tab. The session is an HMAC-signed, HttpOnly, SameSite=Strict
cookie that expires after 8 hours; changing the password signs everyone out.

## To confirm with the owner (before go-live)

Nothing below was invented. Each item is either unverified, inferred from a source, or a choice made for the demo.

**Hours and service times**
- [ ] **Opening hours, all three cafés.** Sources disagree. Used for the demo: Uluwatu and Ungasan 07:00–22:30 daily,
      Berawa 06:00–21:00 daily. Every page says "to be confirmed" until the admin toggle "owner has confirmed these
      hours" is switched on (that also adds opening hours to the structured data).
- [ ] **Serving windows.** Uluwatu & Ungasan menu: the "7 AM – 4 PM" page heading was applied to All Day Breakfast,
      Breakfast in a Bowl and Rolls/Toasties/Bagels, and "FROM 11 AM" to Bigger Stuff, Salad Bowls, Sides, Burgers +
      Wraps and Gourmet Pizzas. Berawa: "Until 5PM" applied to All Day Breakfast only. The bakery is not time-limited.
- [ ] Holidays: no special days are entered. Add Nyepi and any others in the admin.

**Names and places**
- [ ] **Ungasan naming**: "Ungasan" (brand) vs the address in Pecatu vs the Maps names "NOURISH CAFE & PIZZERIA" /
      "NOURISH CAFE WHOLEFOODS PIZZERIA…". The site says "Ungasan" and shows the Maps name next to the rating.
- [ ] **Google place IDs** for Directions (more precise than a search). Checked on 2 Oct 2026, the Maps searches resolve to:
      Uluwatu `/g/11sn3s04kk` (-8.8146, 115.1123), Ungasan `/g/11fnpx8kqt` (-8.8251, 115.1413),
      Berawa `/g/11tdtc99fz` (-8.6675, 115.1473). For Berawa, a search with the street address returns **two**
      candidates (`/g/11tdtc99fz` and `/g/11q3dsnk94`), possibly a duplicate listing, so the site searches
      "NOURISH CAFE BERAWA", which goes straight to the first. Ask which listing is theirs.
- [ ] The Uluwatu Google listing's **website field points to Placejoys** (`nourishcafeuluwatu.shop`). After go-live,
      the owner should change all three listings' website fields to this site.
- [ ] Relationship between **@nourishbali** and **@nourishwholefoodsbali**. The site links @nourishbali only and
      doesn't show a follower count (the ~25K figure came from a search snippet).
- [ ] **Pet-friendly**: taken from Google Maps attributes. Confirm it applies to all three cafés.

**Menu**
- [ ] **Real prices.** Every price on the demo is a generated sample. Enter real prices in the admin, then switch off
      "Prices are samples" per menu.
- [ ] Are the menus (PDFs dated 2 Mar 2026) still current?
- [ ] **Pizza and bakery at Uluwatu.** They're on the shared "Ulu & Ungasan" menu, while Google reviews mention pizza at
      Ungasan. If Uluwatu doesn't serve them, set "Available at → Ungasan" in the admin (no code change).
- [ ] **Dietary marks copied exactly as printed, including ones that look wrong:** Morning Glory has bacon but is marked
      VG (Berawa: VG VO); Big Brekkie (bacon) is VO; Breakfast Burrito is VO at Bukit but VG VO at Berawa; Fill Me Up
      Protein is GF but contains oats (gluten-free oats?). Worth fixing on their PDFs too.
- [ ] **Unlabelled double prices**: pizzas ("115|185") and wines ("90/400") show both prices without labels, as on the
      menu. Labels such as size or glass/bottle can be added per item in the admin.
- [ ] Add-ons placement: on the Bukit menu "salmon / grilled chicken / pulled jackfruit" sit under Salad Bowls; on the
      Berawa menu they sit under Rolls. Kept where printed.
- [ ] **Spelling tidied from the PDFs** (meaning unchanged): sauted→sautéed, brule/brulee→brûlée, laquer→lacquer,
      chimicuri→chimichurri, tumermic→turmeric, Chardonay→Chardonnay, Proseco→Prosecco, Chille→Chile, Pinot Grish→Pinot
      Gris, Trempanillo→Tempranillo, Delle Venesie→Delle Venezie, Tres Medalas→Tres Medallas, Early Grey→Earl Grey,
      equill→Equil, Kura - Kura→Kura Kura. Kept on purpose: "mylk", "cheeze", "vayo", "fetta".
- [ ] Tax and payment notes are from the menus: "+10% government tax + 6% service charge", "All major credit cards
      accepted". Confirm they're current.

**Brand and copy**
- [ ] **Brand look** is inferred from the menu PDFs (black bold sans "NOURISH." with an "N." mark), not from Instagram.
      Typed wordmark, no logo file used. Ask for the logo, brand colours and fonts.
- [ ] Taglines and short descriptions were written for the demo ("Surf, cliffs and a long breakfast on the Bukit",
      "Breakfast with a ricefield view in Canggu", the hero line and the About paragraph). Approve or replace.
- [ ] **Google ratings and review counts** (4.5 / 3,740; 4.5 / 3,769; 4.9 / 2,297) were checked on 2 Oct 2026.
      Refresh in the admin before go-live. No reviews are quoted on the site.
- [ ] **Photos**: all 15 are labelled Unsplash placeholders (see `CREDITS.md`). Replace with the café's own photos.

## Go-live checklist

1. Owner confirms the items above; real prices entered; "hours confirmed" switched on per café.
2. Replace photos in `src/assets/photos/` (keep file names or update `src/lib/photos.ts`) and remove the placeholder
   labels (`tag={false}` or drop `.placeholder-tag`), then `npm run og` to refresh link previews.
3. Set `PUBLIC_INDEXABLE=true`, `PUBLIC_CONCEPT=false` and `SITE_URL` to the real domain in Vercel; redeploy.
   (`robots.txt` then allows crawling and adds the sitemap; `/admin` and `/api` stay `noindex`.)
4. Optional: add Google place IDs in the admin; switch the click-to-load map to the Maps Embed API with a key.
5. Update the three Google Business Profiles' website field to the new domain.
6. Move the repo to the owner's GitHub (or add them), rotate `ADMIN_PASSWORD` and the token.

## Quality checks done

- `npm run build` passes (`astro check`: 0 errors). 34 unit tests pass.
- Looked at every page in a real browser at **390px** and **1440px** (dev and production build): no horizontal
  overflow, no console errors.
- `npm run check:links -- --live`: 237 links on 7 pages. All three WhatsApp numbers match the linktree
  (`wa.me/6281337772517`, `wa.me/6287759743987`, `wa.me/6282146452189`), each pre-filled message names the right café,
  each branch page links its own WhatsApp and Directions, internal anchors resolve, Instagram/Facebook point at
  @nourishbali.
- Admin tested end to end in local mode (login, wrong password, cross-origin rejection, edit, review, save → minimal
  JSON diff). The GitHub save path is tested against an in-memory fake of the Git Data API (single commit, conflict,
  unrelated push, ref race), not against the live repo.

## Known limits

- The login throttle is per serverless instance (no database). With a long passphrase that's fine for a café.
- The click-to-load map uses Google's keyless embed URL. Switch to the Maps Embed API at go-live if Google changes it.
- `npm audit` flags `path-to-regexp` inside `@astrojs/vercel`'s build-time routing utils (not shipped to visitors).
- In local admin mode the dev server reloads after Save because the content files change. Production doesn't.
- Not done: reading the 213 one-star Uluwatu reviews by hand (the brief recommends skimming them before the pitch).
