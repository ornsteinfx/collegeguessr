# CollegeGuessr

Guess the school. Decode the clues.

A React + TypeScript + Vite static college guessing game, with an original SVG academic crest, ivory/navy design, responsive clue cards, fuzzy college search, Daily preview and unlimited Practice preview.

**Status: functional preview, not production-ready.** The requested production minimum of 250 complete, verified answer records is not met. There are 500 real IPEDS institutions, but **zero production-eligible answers**. The UI explicitly labels preview rounds, which use sourced location, ownership and enrollment. Rankings and current athletics remain neutral, not invented. Do not remove the release gate without completing verification.

## Run locally

Node 22.12+ recommended.

```sh
npm ci
npm run dev
npm run build
npm run preview
npm test
npm run test:e2e
npm run audit:data
node scripts/validate-data.mjs --production
```

The last command intentionally fails until at least 250 complete production answers are available. Install Chromium for browser tests with `npx playwright install chromium`. Tests run desktop and 375px mobile viewports. Screenshots are saved under `screenshots/`.

## Features

- Daily preview: eight guesses, Eastern calendar, deterministic frozen schedule, next-midnight countdown, local saved rounds, cross-tab progress updates.
- Practice preview: unlimited guesses and new rounds, avoiding immediate repeats.
- Search: fuzzy names and aliases, eight results, keyboard arrows/Enter/Escape, duplicate filtering. Ambiguous abbreviations require explicit selection.
- Six comparison functions, with unavailable data rendered neutral. Enrollment/rank arrows and hard mode preference.
- Win/loss reveal, native share or clipboard, answer-free emoji grids, manual text fallback.
- Daily win distribution, win-only average, Eastern streaks, practice solved counts.
- Dark appearance, animation preference, system reduced-motion support, permanent non-color symbols, modal focus handling, reset confirmation.
- Original vector crest, horizontal wordmark variants, favicon and social artwork.

Not implemented: speedrun, conference challenge, audio, accounts, backend, verified current athletics, licensed numeric rankings. First-time tutorial is available in the help menu but does not automatically interrupt play. Search results do not yet highlight matching substrings.

## Data and selection

Sources: [IPEDS HD2023](https://nces.ed.gov/ipeds/datacenter/data/HD2023.zip), [EF2023A](https://nces.ed.gov/ipeds/datacenter/data/EF2023A.zip), [IC2023](https://nces.ed.gov/ipeds/datacenter/data/IC2023.zip), and its published [dictionary](https://nces.ed.gov/ipeds/datacenter/data/IC2023_Dict.zip).

Enrollment is **Fall 2023 total fall enrollment**, EF2023A EFALEVEL=1, EFTOTLT. This historical snapshot is not represented as the newest data available. Ownership and institutional identity come from HD2023. Stable IDs are IPEDS UNITIDs. IPEDS enrollment values can include NCES imputations; the current import does not label imputation flags separately, which needs attention before production verification.

This is a **curated college pool**, not an official top-500 ranking. Filter HD2023 for four-year undergraduate institutions with public/private nonprofit control, in the states/DC, Carnegie 2021 basic classifications 15–23, and positive enrollment. Prioritize classification 21 (baccalaureate arts/sciences), then 15/16 (R1/R2), then remaining classifications. Within priority groups sort descending enrollment, UNITID breaks ties. Take 500. This favors recognized research institutions and liberal arts colleges while retaining regional institutions; it does not guarantee every example in the original brief. The per-record selectionReason and classification fields form the reproducible inclusion manifest.

All rank fields are null: no licensed comparable ranking source was imported. Historical basketball conference labels come from IC2023 CONFNO2 and the NCES dictionary and are retained **only for audit**. They are not primary all-sports membership and are not displayed as current athletics. NCAA association records are historical. Current division and primary conference fields remain null. See DATA-QUALITY.md and src/data/dataManifest.json.

To update, create a Python virtual environment, install `openpyxl`, then run `python scripts/import-ipeds.py`. It downloads the specified public NCES files to ignored scripts/cache/. The importer is pinned to the documented 2023 edition. Update field mappings and source year together when adopting a newer edition. Independently verify NCAA division and primary conference against official membership sources, recording season and per-field provenance before enabling answers. Never infer primary conference from football or basketball without verification. Re-run audits and review diffs. The importer does not overwrite schedule.json: preserve that published schedule and its referenced records.

## Comparison rules

- State: same green, adjacent gold, other gray. DC neighbors MD/VA. The adjacency map includes shared water boundaries for IL/MI, MI/MN and NY/RI, and Four Corners contacts AZ/CO and NM/UT; excludes RI/NJ and MI/OH lake-only additions beyond their existing land boundary. The map is manually encoded and symmetry tested; an authoritative source audit remains required before production.
- Type: same green, different gray.
- Enrollment: absolute difference ≤2,500 green, ≤10,000 gold, otherwise gray. Arrow points toward mystery value.
- Rank: same source/year/category only; ≤10 green, ≤25 gold, otherwise gray. ↑ means higher numeric/worse rank. Missing/incompatible rankings are neutral.
- NCAA division: same green, I/II or II/III gold, I/III gray. Different known associations gray; unknown fields neutral.
- Conference: same verified conference and NCAA division green; different conference in same division gold; different divisions gray. Missing fields neutral.

Only an exact ID wins. Invalid or repeated guesses consume no attempts. Tooltip differences disclose relative distances, never the hidden school's direct value. A static game is not cheat-proof.

## Daily schedule and persistence

Epoch: October 30, 2026, puzzle #1. America/New_York defines the date. `schedule.json` is a committed, fixed permutation of the 500 preview IDs, generated with Python Random(827631). The index advances once per Eastern calendar day, cycling after 500 days, with no repeats within a cycle. Preserve the file and all referenced institution IDs across future imports; production should freeze a separate verified schedule/version and storage namespace. Preview progress uses localStorage `cg-*`; no account or server sync is provided. LocalStorage failures leave the session playable. Concurrent tab submissions are last-write-wins; the app synchronizes storage events but does not provide transactional locking.

## Deployment preparation

`vercel.json` sets the Vite build and dist output; hash routes avoid deep-link routing requirements. Connect the private GitHub repository to Vercel, use `npm ci` / `npm run build`, and publish only after data verification and explicit authorization. No environment variables are required. No domain has been purchased or assumed available. No production site is deployed.

The SVG social artwork is included; several social platforms require PNG/JPEG Open Graph images, so generate a 1200×630 PNG and configure an absolute canonical deployment URL before public launch. Fonts load from Google Fonts with system fallbacks. CSS is custom rather than Tailwind; animations use CSS rather than Motion to keep runtime dependencies small.

CollegeGuessr is independently developed and is not affiliated with any listed university, conference, ranking organization or NCES. NCES source data is attributed above. Branding artwork is original to this project.
