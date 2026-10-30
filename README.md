# College Guessr

A daily guessing game featuring **150 NCAA Division I institutions**, ranked by a transparent, reproducible academic outcomes index. White backgrounds, red academic branding, vibrant green/yellow clue tiles, and sequential flip reveals.

Live: https://ornsteinfx.github.io/collegeguessr/

## Run

Node 24 recommended.

```sh
npm ci
npm run dev
npm run build
npm test
npm run test:e2e
npm run audit:data
```

Install the test browser with `npx playwright install chromium`. Browser tests use compiled production assets on desktop and mobile. GitHub Actions builds with `--base=/collegeguessr/` and deploys `dist`; never publish uncompiled React source. Vercel uses the default root base with the included configuration.

## Pool and academic ranking

This edition replaces the larger mixed-division pool at the user's request. **Only 150 schools can be searched, guessed or selected as answers. All are verified NCAA Division I institutions.** Selection and ranks use the user-approved **CollegeGuessr Academic Outcomes Index, 2023-v1**, not a US News or other publisher's national ranking.

`score = 0.65 × six-year bachelor graduation rate + 0.35 × full-time retention rate`

Both inputs are NCES percentages on a 0–100 scale. Rank 359 qualifying D1 institutions by descending score, then graduation rate, retention rate, and UNITID to break exact ties; keep the first 150. Ranks are ordinal within this qualified D1 candidate population. They are not national ranks among all US colleges. The index measures two student outcomes; it does not measure faculty quality, academic rigor, selectivity, student learning or research. Rates reflect institutional resources, student mix and statutory exclusions. The full candidate ordering, rejected matches, reviewed campus crosswalks, source URLs and input checksums are committed in `src/data/academicRanking.json`.

Source definitions:

- [IPEDS DRVGR2023](https://nces.ed.gov/ipeds/datacenter/data/DRVGR2023.zip): GBA6RTT, six-year graduation rate for the full-time, first-time bachelor-seeking **2017 cohort**. The [NCES dictionary](https://nces.ed.gov/ipeds/datacenter/data/DRVGR2023_Dict.zip) documents allowable cohort exclusions.
- [IPEDS DRVEF2023](https://nces.ed.gov/ipeds/datacenter/data/DRVEF2023.zip): RET_PCF, full-time retention in Fall 2023 from the prior fall's full-time cohort. See the [retention dictionary](https://nces.ed.gov/ipeds/datacenter/data/DRVEF2023_Dict.zip).
- [IPEDS EF2023A](https://nces.ed.gov/ipeds/datacenter/data/EF2023A.zip): EFALEVEL=1, EFTOTLT, total Fall 2023 enrollment. This is a pinned historical snapshot; NCES records can include imputations.
- [IPEDS HD2023](https://nces.ed.gov/ipeds/datacenter/data/HD2023.zip): UNITID, official name, location, ownership, institutional website and aliases.
- [Official NCAA active-member directory](https://web3.ncaa.org/directory/api/directory/memberList?type=1): division and institutional conference, academicYear=2027 (**2026–27**), retrieved October 30, 2026. Conference is primary institutional membership, not a football-only conference. The identifiers, division and canonical conference are retained in the per-school manifest. Familiar display abbreviations such as ACC, SEC and Big Ten are presentation labels; matching uses canonical conference names.

Identity joins require matching state and a unique normalized exact name or exact institutional website host. Multiple NCES campuses cannot share a single NCAA identity. Explicitly reviewed main-campus crosswalks handle Rutgers–New Brunswick, Kent State at Kent, Miami University–Oxford and Ohio University–Main Campus; branch campuses are excluded. Missing or ambiguous identities/metrics are excluded rather than inferred. Four active D1 records do not qualify; this is a top 150 **among the 359 documented qualified institutions**, not a claim that every current D1 institution has complete inputs.

## Reproduce/update data

```sh
python3 scripts/build-d1-pool.py
npm run audit:data
```

The standard-library-only Python importer downloads pinned public NCES ZIPs and the NCAA feed into ignored `scripts/cache`. It preserves the committed schedule; never delete or regenerate that file after publication. Review NCAA season before refreshing its cached feed. The script records source checksums, computes the complete ranking, selects the top 150, and writes comparison data and manifests. The audit verifies exactly 150 unique IPEDS/NCAA identities, Division I eligibility, rank completeness, score arithmetic, selection ordering and schedule integrity. The versioned snapshot is the comparison source; changing it requires deliberate review and a new edition if the selected pool changes.

## Five clue rules

1. **State:** same green, neighboring yellow, other gray. DC neighbors MD/VA. The manually encoded adjacency map includes shared water boundaries IL/MI, MI/MN and NY/RI, and Four Corners point contacts AZ/CO and NM/UT. It is symmetry tested; an authoritative boundary audit remains a limitation.
2. **Type:** same green, different gray.
3. **Students:** absolute difference ≤2,500 green, ≤10,000 yellow, otherwise gray. ↑ means the answer has more students.
4. **Academic rank:** same source/year/category required. Difference ≤10 green, ≤25 yellow, otherwise gray. ↓ points toward a smaller, better numeric rank; ↑ toward a larger rank. Every active school has a comparable rank. N/A remains a defensive fallback for invalid future data.
5. **Conference:** same canonical primary conference green, different gray. Division is not a displayed clue because the entire pool is D1.

An exact institutional ID wins; all-green clues alone do not. Daily allows eight guesses, Practice unlimited. Submitting a new row turns over five clue tiles at 320ms intervals with 620ms flips. Input is disabled during the reveal, and results open after the final tile. Saved rows do not replay; animation settings and reduced-motion preferences are respected. Colors also have symbols and tap/focus explanations. Shared grids now have five squares per guess and never expose the school name.

## Daily schedule, progress and statistics

`schedule-d1-v1.json` is the fixed permutation of the 150 active IDs (Python Random(827631), IDs sorted before shuffling). The Eastern calendar advances its index each day from October 30, 2026, puzzle #1, cycling after 150 days. The app uses America/New_York for puzzles, countdown and streaks.

The deliberate pool/ranking change starts a new **D1 edition** under `cg-d1-2023-v1-*` localStorage keys. Old edition progress remains stored separately and does not contaminate the smaller pool or its statistics. Earlier schedules/data remain available in Git history. No accounts/server sync; localStorage failures leave the session playable. Concurrent tab submissions are last-write-wins. Static client-side answers are inspectable; this is not cheat-proof.

Local statistics include daily plays/wins, win rate, streaks, win-only average, guess distribution and practice solves. Settings retain animation and hard-mode preferences. The site is white by design. Optional speedrun, conference challenge, accounts and sound are not implemented.

Original College Guessr branding is inspired by academic design, with a red shield/book/compass seal. It does not use Cornell's crest or claim Cornell affiliation. Independently developed; not affiliated with Cornell, any listed university, conference, NCES, or ranking publisher.
