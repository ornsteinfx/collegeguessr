import fs from "node:fs";
import assert from "node:assert/strict";
const read = (name) =>
  JSON.parse(fs.readFileSync(new URL("../src/data/" + name, import.meta.url)));
const data = read("colleges.json"),
  audit = read("academicRanking.json"),
  athletics = read("athleticsManifest.json"),
  schedule = read("schedule-d1-v1.json");
assert.equal(data.length, 150);
assert.equal(new Set(data.map((c) => c.id)).size, 150);
assert.equal(new Set(data.map((c) => c.ncaaId)).size, 150);
assert.equal(new Set(data.map((c) => c.rank)).size, 150);
assert.deepEqual(
  data.map((c) => c.id),
  audit.candidates.slice(0, 150).map((c) => c.id),
);
for (const c of data) {
  assert.equal(c.ncaaDivision, "I");
  assert.equal(c.athleticAssociation, "NCAA");
  assert(c.eligibleAsAnswer && c.dataVerified);
  assert.equal(c.rankYear, "2023-v1");
  assert.equal(c.rankSource, "CollegeGuessr Academic Outcomes Index");
  assert.equal(c.rankCategory, "NCAA Division I academic outcomes");
  assert(c.rank >= 1 && c.rank <= 150);
  assert(c.enrollment > 0 && Number.isInteger(c.enrollment));
  assert(c.conference);
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
        m.division === "I" &&
        m.conference === c.conference,
    ),
  );
  const a = audit.candidates.find((a) => a.id === c.id);
  assert.equal(c.rank, a.rank);
  assert.equal(c.academicScore, a.academicScore);
}
assert.equal(schedule.length, 150);
assert.equal(new Set(schedule).size, 150);
assert.deepEqual([...schedule].sort(), data.map((c) => c.id).sort());
const report = `# Data quality report\n\nActive schools: 150. Eligible answers: 150. NCAA Division I only. All five comparison fields complete.\n\nRanking: CollegeGuessr Academic Outcomes Index, 2023-v1. Score = 65% six-year bachelor graduation rate (2017 cohort) + 35% full-time retention rate (2023), public NCES data. Ordinal ranks 1–150, selected from ${audit.candidates.length} uniquely matched D1 institutions with complete metrics. Ties broken by graduation rate, retention, then UNITID. This is a custom academic outcomes index, not US News or a comprehensive measure of academic quality.\n\nEnrollment: IPEDS total Fall 2023. Conference: official NCAA institutional membership, 2026–27, not football-only. Missing or ambiguous candidate matches excluded. Four explicit main-campus identifier crosswalks are documented in academicRanking.json. Input checksums and full candidate ordering are recorded there.\n\nValidation PASS: exactly 150 unique IPEDS/NCAA IDs, verified D1 membership, complete ranks and conferences, recomputed scores match source manifests, selection and frozen schedule validated. State adjacency remains manually encoded and symmetry-tested, with documented water/point boundary conventions.\n`;
fs.writeFileSync(new URL("../DATA-QUALITY.md", import.meta.url), report);
console.log(report);
