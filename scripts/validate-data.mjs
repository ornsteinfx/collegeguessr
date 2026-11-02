import fs from "node:fs";
import assert from "node:assert/strict";
const read = (name) =>
  JSON.parse(fs.readFileSync(new URL("../src/data/" + name, import.meta.url)));
const data = read("colleges.json"),
  audit = read("academicRanking.json"),
  athletics = read("athleticsManifest.json"),
  schedule = read("schedule-requested-v1.json"),
  locations = read("campusLocations.json"),
  requested = read("requestedColleges.json");
assert.equal(data.length, 169);
assert.equal(new Set(data.map((c) => c.id)).size, 169);
assert.equal(new Set(data.map((c) => c.rank)).size, 169);
for (const r of requested) assert(data.some((c) => c.name === r.name));
assert.equal(data.filter((c) => c.liberalArts).length, 20);
assert.deepEqual(
  data.map((c) => c.id),
  audit.candidates.map((c) => c.id),
);
for (const c of data) {
  assert(c.eligibleAsAnswer && c.dataVerified);
  assert.equal(c.enrollmentMetric, "undergraduate");
  assert(c.enrollment > 0 && Number.isInteger(c.enrollment));
  assert(c.conference);
  assert(["I", "II", "III"].includes(c.ncaaDivision));
  assert.equal(c.rankCategory, "Selected college academic outcomes");
  assert.equal(c.rankYear, "2023-ug-v1");
  assert(c.rank >= 1 && c.rank <= 169);
  assert(c.graduationRate >= 0 && c.graduationRate <= 100);
  assert(c.retentionRate >= 0 && c.retentionRate <= 100);
  assert.equal(
    c.academicScore,
    Math.round((0.65 * c.graduationRate + 0.35 * c.retentionRate) * 100) / 100,
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
  const p = locations[c.id];
  assert(
    p &&
      p.latitude >= 18 &&
      p.latitude <= 72 &&
      p.longitude >= -180 &&
      p.longitude <= -60,
  );
}
assert.equal(schedule.length, 365);
for (const id of schedule) assert(data.some((c) => c.id === id));
for (let start = 0; start < 338; start += 169)
  assert.equal(new Set(schedule.slice(start, start + 169)).size, 169);
for (let i = 1; i < 365; i++) assert.notEqual(schedule[i], schedule[i - 1]);
const report = `# Data quality report\n\n169 schools: every one of the 149 supplied universities plus 20 liberal arts colleges. Includes Divisions I, II and III.\n\nEnrollment: undergraduate only, Fall 2023. Builder requires IPEDS DRVEF2023 EFUG to equal EF2023A EFALEVEL=2 EFTOTLT for every school. Approximate total counts and unsourced ranks in the user input are never used as game metrics.\n\nAcademic outcomes: 65% six-year bachelor graduation rate + 35% full-time retention rate. Ordinal positions relative to the selected pool; guessed ranks displayed, raw scores omitted. Not a published national ranking.\n\nConference: official NCAA primary all-sports membership, 2026–27. Claremont McKenna and Harvey Mudd share a verified joint athletics program; Pomona uses Pomona-Pitzer membership.\n\n365 generated daily answers from November 1, 2026. Each complete 169-school cycle contains every school exactly once. No adjacent repeat across cycle boundaries. Year cycles thereafter; admin date overrides are optional.\n\nMap: all 169 campuses have NCES coordinates.\n\nValidation PASS: pool coverage, undergraduate metric, unique IDs and positions, outcomes scores, conferences, map locations, and annual schedule.\n`;
fs.writeFileSync(new URL("../DATA-QUALITY.md", import.meta.url), report);
console.log(report);
