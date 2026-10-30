# Data quality report

Active schools: 150. Eligible answers: 150. NCAA Division I only. All five comparison fields complete.

Ranking: CollegeGuessr Academic Outcomes Index, 2023-v1. Score = 65% six-year bachelor graduation rate (2017 cohort) + 35% full-time retention rate (2023), public NCES data. Ordinal ranks 1–150, selected from 359 uniquely matched D1 institutions with complete metrics. Ties broken by graduation rate, retention, then UNITID. This is a custom academic outcomes index, not US News or a comprehensive measure of academic quality.

Enrollment: IPEDS total Fall 2023. Conference: official NCAA institutional membership, 2026–27, not football-only. Missing or ambiguous candidate matches excluded. Four explicit main-campus identifier crosswalks are documented in academicRanking.json. Input checksums and full candidate ordering are recorded there.

Validation PASS: exactly 150 unique IPEDS/NCAA IDs, verified D1 membership, complete ranks and conferences, recomputed scores match source manifests, selection and frozen schedule validated. State adjacency remains manually encoded and symmetry-tested, with documented water/point boundary conventions.
