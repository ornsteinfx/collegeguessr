import fs from "node:fs";
import assert from "node:assert/strict";
const data = JSON.parse(
  fs.readFileSync(new URL("../src/data/colleges.json", import.meta.url)),
);
const athletics = JSON.parse(
  fs.readFileSync(
    new URL("../src/data/athleticsManifest.json", import.meta.url),
  ),
);
const schedule = JSON.parse(
  fs.readFileSync(new URL("../src/data/schedule-v1.json", import.meta.url)),
);
assert.equal(data.length, 500);
assert.equal(new Set(data.map((c) => c.id)).size, data.length);
const states = new Set(
  "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(
    " ",
  ),
);
for (const c of data) {
  assert(c.ipedsId === c.id);
  assert(Number.isInteger(c.enrollment) && c.enrollment > 0);
  assert(states.has(c.state));
  assert(["public", "private"].includes(c.institutionType));
  assert(c.sourceUrls.length >= 2);
  assert(c.rank === null || (c.rankSource && c.rankCategory && c.rankYear));
  if (c.eligibleAsAnswer) {
    assert(
      c.dataVerified &&
        ["I", "II", "III"].includes(c.ncaaDivision) &&
        c.conference &&
        c.athleticsSeason === "2026–27",
    );
    assert(
      athletics.some(
        (m) =>
          m.ipedsId === c.id &&
          m.ncaaId === c.ncaaId &&
          m.division === c.ncaaDivision &&
          m.conference === c.conference,
      ),
    );
  }
}
const eligible = data.filter((c) => c.eligibleAsAnswer).length;
assert.equal(new Set(schedule).size, schedule.length);
for (const id of schedule)
  assert(data.some((c) => c.id === id && c.eligibleAsAnswer));
const report = `# Data quality report\n\nInstitutions: ${data.length}\n\nEligible mystery answers: ${eligible}\n\nEnrollment: IPEDS EF2023A total fall enrollment, Fall 2023. 2024 bulk endpoint returned 404 during collection. Values may include NCES imputations.\n\nAthletics: official NCAA active members directory, academicYear 2027 (2026–27), retrieved October 30, 2026. Unique name/domain plus state matches only. See athleticsManifest.json for each match and source.\n\nMissing: all 500 numeric rankings (no licensed ranking imported); ${data.length - eligible} institutions without an unambiguous current NCAA match. These institutions are guessable but excluded as answers. Historical basketball conferences are audit-only.\n\nProduction dataset minimum: ${eligible >= 250 ? "PASS" : "FAIL"} (250 required). Preferred 500 fully eligible answers: not met. State adjacency is manually encoded, symmetric and tested; authoritative boundary audit remains a limitation. No missing numeric rankings are fabricated; rank comparison is neutral.\n`;
fs.writeFileSync(new URL("../DATA-QUALITY.md", import.meta.url), report);
console.log(report);
if (process.argv.includes("--production") && eligible < 250) process.exit(1);
