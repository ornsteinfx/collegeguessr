# College Guessr

[Play CollegeGuessr](https://ornsteinfx.github.io/collegeguessr/) · [Admin](https://collegeguessr-admin.pickle-pal-online.workers.dev/admin)

169 universities and liberal arts colleges: all 149 user-requested universities plus 20 liberal arts colleges. White background, original red academic crest, vibrant clue colors, staggered flip reveals, and an interactive US campus map. Enrollment means **undergraduate students only**.

## Development

Node 24 recommended. Run `npm ci`, `npm run dev`. Verify with `npm test`, `npm run audit:data`, `npm run test:e2e`, and `npx tsc -p server/tsconfig.json`. Install the browser with `npx playwright install chromium`. `npm run build -- --base=/collegeguessr/` produces GitHub Pages assets. The main-branch Pages workflow tests, audits, builds and publishes automatically.

## Data

The pool includes NCAA Divisions I, II and III. Supplied approximate total enrollments and unsourced rank numbers are retained in `requestedColleges.json` as provenance only; they are not gameplay values.

- Undergraduate enrollment: [NCES DRVEF2023](https://nces.ed.gov/ipeds/datacenter/data/DRVEF2023.zip), EFUG. The importer independently requires equality with [EF2023A](https://nces.ed.gov/ipeds/datacenter/data/EF2023A.zip), EFALEVEL=2, EFTOTLT, for every school. This is a pinned Fall 2023 snapshot; records may include NCES imputations.
- Academic outcomes: user-approved CollegeGuessr index, 65% six-year bachelor graduation rate ([DRVGR2023](https://nces.ed.gov/ipeds/datacenter/data/DRVGR2023.zip), GBA6RTT, 2017 entering cohort) + 35% full-time retention (DRVEF2023, RET_PCF). Descending score, graduation rate, retention rate, then UNITID determines ordinal position within this selected pool. This is not a published national ranking or a comprehensive measure of academic quality. Guessed ranks are displayed; raw index scores are not.
- Identity and coordinates: [HD2023](https://nces.ed.gov/ipeds/datacenter/data/HD2023.zip), matched to individual campuses by UNITID.
- Conferences: [official NCAA directory](https://web3.ncaa.org/directory/api/directory/memberList?type=1), academicYear 2027, primary all-sports membership for 2026–27. Explicit crosswalks document jointly operated Claremont-Mudd-Scripps and Pomona-Pitzer athletics. Football-only conference names are not substituted for primary membership.

Reproduce using `python3 scripts/build-requested-pool.py` and `python3 scripts/build-map-data.py`. The first script needs the four official source archives and NCAA snapshot in ignored `scripts/cache` (hd.zip, ef.zip, retention.zip, graduation.zip, ncaa-members.json); source URLs and hashes are recorded in the manifests. Preserve published editions and schedules when refreshing data. `npm run audit:data` checks all requested schools, liberal arts additions, metric definitions, rankings, athletics, map coverage and schedule integrity.

## Gameplay and schedule

Daily: eight guesses, resets at midnight Eastern. Practice: unlimited guesses. Six clues: state, institution type, undergraduate enrollment, academic rank, primary conference, and campus distance. Green enrollment is within 2,500; yellow is over 2,500 and within 10,000. Academic proximity thresholds are 10 and 25 positions. Same conference and division is green, different is gray. Guessed ranks are visible; enrollment and rank differences use threshold bands. The direction clue has an eight-point compass arrow from the guess toward the answer. Exact mileage is hidden: green within 150 miles, yellow over 150 and within 300 miles, gray labeled Outside 300 miles. Thresholds use unrounded great-circle distance (mean Earth radius 3,958.7613 miles). Hard mode hides compass arrows and direction text while keeping the distance band. Shared grids contain six color tiles per guess. Reduced motion reveals immediately; other guesses flip sequentially.

`schedule-requested-v1.json` contains **365 frozen generated daily answers**, starting November 1, 2026. Each full 169-school shuffled cycle uses every school once; adjacent repeats across cycles are prevented. Schools necessarily recur in a year because the pool has 169 members. The annual schedule cycles automatically afterward. Admin overrides are optional, persisted by date and can be restored to the generated answer. Existing started rounds retain their answer, preserving their clues and progress. Public configuration returns today's selection only, never future overrides. The bundled static schedule remains inspectable; this game is not cheat-proof.

This dataset edition uses `cg-requested-ug-v1-*` browser storage. Older edition progress remains isolated. Browser storage failure does not prevent session play. Concurrent tabs use last-write-wins. Daily/practice statistics remain local to each browser.

Map search uses gray Census/us-atlas state boundaries, white water, red campus pins/clusters, state names and contextual Natural Earth city labels on zoom. Pin selection fills the guess input without submitting. All 169 campus coordinates and geographic assets are bundled; no tile service or key is needed. Keyboard name search and map pin selection are supported. Data attribution and checksums are in `mapManifest.json`; the us-atlas license is in `public/map`.

## Bug reports and private administration

A separate Cloudflare Worker and SQLite-backed Durable Object power the bug inbox, college corrections and daily overrides. This does not modify PicklePal. Deploy backend code with `npx wrangler deploy --config server/wrangler.jsonc`. Configure `ADMIN_PASSWORD` and `SESSION_SECRET` with `npx wrangler secret put NAME --config server/wrangler.jsonc`. Never commit passwords or dev-vars. The frontend API URL defaults to the deployed service; `VITE_API_URL` can replace it for local development.

The admin panel has a password login and signed 24-hour Secure, HttpOnly, SameSite=Strict cookie. Admin mutations require same-origin JSON requests. Login attempts and report submissions are rate-limited, report sizes are bounded, and all displayed report text is treated as text. Bug reports include title, description, category, date, game mode, browser and viewport; guesses and target IDs are excluded. Submission errors preserve the draft and never claim successful delivery. Reports can be resolved, reopened, deleted and exported. No email or account is required.

College corrections allow Fall 2023 undergraduate count, city and primary conference with a required HTTPS source URL. Changes load before gameplay, with a cached fallback; the verified bundled dataset and generated schedule remain playable when the backend is unavailable. Correct the pinned metric rather than mixing enrollment years. Changes do not alter academic outcomes or pool membership. Backend changes are deployed separately from GitHub Pages. Runtime state persists across deployments in the Durable Object. Admin passwords are not recoverable from the frontend; rotate through Wrangler secrets.

Original branding is inspired by academic design and does not use Cornell's crest. Independent; not affiliated with any university, NCES, conference or ranking publisher.

## Player counts

Admin → Players shows today's unique playing browsers, daily players, practice players and distinct rounds played, plus 14 days of history. A play is recorded only after a valid guess; simply opening the site does not count. Dates reset at midnight America/New_York. Repeat guesses and reloads deduplicate by browser and round. Counts begin with this release without historical backfill. Different devices or cleared storage can overcount people; blocked or offline events can undercount. Daily and practice players overlap.

The client sends only random browser/round identifiers and mode. The server derives the Eastern date and stores day-specific HMACs rather than raw identifiers, guesses, answers or IP addresses in the analytics table. Event records older than 90 days are pruned on new plays and admin reads. Counts require authenticated admin access, refresh every 30 seconds and persist across deployments. Tracking failures never block the game.

Custom domains can keep using GitHub Pages. After a domain is chosen, configure its CNAME/DNS and HTTPS and add its exact HTTPS origin to the backend's comma-separated PUBLIC_ORIGINS variable, keeping the GitHub Pages origin supported. No domain is purchased or configured by this change.

## Search indexing

The homepage has descriptive title/description, canonical and social metadata, WebApplication structured data, static introductory content and a one-URL sitemap at `/collegeguessr/sitemap.xml`. Hash-based practice/settings views are not separate indexable pages. No Search Console ownership verification or indexing submission has been performed. After a custom domain is connected, update the absolute URLs in `index.html` and `public/sitemap.xml`, verify the domain in Google Search Console using its supplied DNS TXT record, submit the sitemap, and use URL Inspection → Request indexing for the homepage. Google determines whether and when to index; the sitemap is not a ranking guarantee.
