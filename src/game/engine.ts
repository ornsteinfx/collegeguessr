import raw from "../data/colleges.json";
export interface College {
  id: string;
  ipedsId: string;
  name: string;
  shortName: string;
  aliases: string[];
  state: string;
  city: string;
  institutionType: string;
  enrollment: number;
  enrollmentYear: string;
  rank: number | null;
  rankCategory: string | null;
  rankSource: string | null;
  rankYear: string | null;
  athleticAssociation: string | null;
  ncaaDivision: string | null;
  conference: string | null;
  footballConference: string | null;
  officialWebsite: string;
  sourceUrls: string[];
  eligibleAsAnswer: boolean;
  dataVerified: boolean;
  classification: number;
  selectionReason: string;
  reportedBasketballConference: string | null;
}
export const colleges: College[] = raw;
export const answerPool = colleges.filter(
  (c) => c.eligibleAsAnswer && c.dataVerified,
);
export type Tile = {
  value: string;
  color: "green" | "yellow" | "gray" | "neutral";
  hint: string;
};
export const states: Record<string, string> = {
  AL: "FL GA MS TN",
  AK: "",
  AZ: "CA CO NM NV UT",
  AR: "LA MS MO OK TN TX",
  CA: "AZ NV OR",
  CO: "AZ KS NE NM OK UT WY",
  CT: "MA NY RI",
  DE: "MD NJ PA",
  DC: "MD VA",
  FL: "AL GA",
  GA: "AL FL NC SC TN",
  HI: "",
  ID: "MT NV OR UT WA WY",
  IL: "IN IA KY MI MO WI",
  IN: "IL KY MI OH",
  IA: "IL MN MO NE SD WI",
  KS: "CO MO NE OK",
  KY: "IL IN MO OH TN VA WV",
  LA: "AR MS TX",
  ME: "NH",
  MD: "DC DE PA VA WV",
  MA: "CT NH NY RI VT",
  MI: "IL IN MN OH WI",
  MN: "IA MI ND SD WI",
  MS: "AL AR LA TN",
  MO: "AR IL IA KS KY NE OK TN",
  MT: "ID ND SD WY",
  NE: "CO IA KS MO SD WY",
  NV: "AZ CA ID OR UT",
  NH: "ME MA VT",
  NJ: "DE NY PA",
  NM: "AZ CO OK TX",
  NY: "CT MA NJ PA RI VT",
  NC: "GA SC TN VA",
  ND: "MN MT SD",
  OH: "IN KY MI PA WV",
  OK: "AR CO KS MO NM TX",
  OR: "CA ID NV WA",
  PA: "DE MD NJ NY OH WV",
  RI: "CT MA NY",
  SC: "GA NC",
  SD: "IA MN MT NE ND WY",
  TN: "AL AR GA KY MS MO NC VA",
  TX: "AR LA NM OK",
  UT: "AZ CO ID NV WY",
  VT: "MA NH NY",
  VA: "DC KY MD NC TN WV",
  WA: "ID OR",
  WV: "KY MD OH PA VA",
  WI: "IA IL MI MN",
  WY: "CO ID MT NE SD UT",
};
export function numeric(
  a: number | null,
  b: number | null,
  lo: number,
  hi: number,
) {
  if (a === null || b === null)
    return {
      color: "neutral" as const,
      arrow: "",
      hint: "Verified data unavailable",
    };
  const d = Math.abs(a - b);
  return {
    color: (d <= lo ? "green" : d <= hi ? "yellow" : "gray") as Tile["color"],
    arrow: b > a ? "↑" : b < a ? "↓" : "=",
    hint: `Difference: ${d.toLocaleString()}`,
  };
}
export function compare(a: College, b: College, hard = false): Tile[] {
  const en = numeric(a.enrollment, b.enrollment, 2500, 10000);
  const rankOK =
    !!a.rankSource &&
    !!a.rankYear &&
    !!a.rankCategory &&
    a.rank !== null &&
    b.rank !== null &&
    a.rankSource === b.rankSource &&
    a.rankYear === b.rankYear &&
    a.rankCategory === b.rankCategory;
  const rk = numeric(rankOK ? a.rank : null, rankOK ? b.rank : null, 10, 25);
  const sameDivision =
    !!a.ncaaDivision &&
    a.athleticAssociation === "NCAA" &&
    b.athleticAssociation === "NCAA" &&
    a.ncaaDivision === b.ncaaDivision;
  const divMissing =
    !a.athleticAssociation ||
    !b.athleticAssociation ||
    (a.athleticAssociation === "NCAA" && !a.ncaaDivision) ||
    (b.athleticAssociation === "NCAA" && !b.ncaaDivision);
  const ord: Record<string, number> = { I: 1, II: 2, III: 3 };
  const dc = divMissing
    ? "neutral"
    : sameDivision
      ? "green"
      : a.athleticAssociation === "NCAA" &&
          b.athleticAssociation === "NCAA" &&
          Math.abs(ord[a.ncaaDivision!] - ord[b.ncaaDivision!]) === 1
        ? "yellow"
        : "gray";
  return [
    {
      value: a.state,
      color:
        a.state === b.state
          ? "green"
          : states[a.state]?.split(" ").includes(b.state)
            ? "yellow"
            : "gray",
      hint:
        a.state === b.state
          ? "Same state"
          : states[a.state]?.split(" ").includes(b.state)
            ? "Neighboring states"
            : "Different, non-neighboring states",
    },
    {
      value: a.institutionType,
      color: a.institutionType === b.institutionType ? "green" : "gray",
      hint:
        a.institutionType === b.institutionType
          ? "Same institution type"
          : "Different institution type",
    },
    {
      value: `${a.enrollment?.toLocaleString() ?? "N/A"} ${hard ? "" : en.arrow}`,
      color: en.color,
      hint: `Enrollment ${en.hint}`,
    },
    {
      value: rankOK ? `#${a.rank} ${hard ? "" : rk.arrow}` : "N/A",
      color: rk.color,
      hint: rankOK
        ? `Rank ${rk.hint}`
        : "Comparable verified rankings unavailable",
    },
    {
      value: a.ncaaDivision ? `NCAA ${a.ncaaDivision}` : "N/A",
      color: dc,
      hint: divMissing
        ? "Current division not verified"
        : sameDivision
          ? "Same NCAA division"
          : "Different athletic divisions or associations",
    },
    {
      value: a.conference ?? "N/A",
      color:
        divMissing || !a.conference || !b.conference
          ? "neutral"
          : a.conference === b.conference && sameDivision
            ? "green"
            : sameDivision
              ? "yellow"
              : "gray",
      hint:
        divMissing || !a.conference || !b.conference
          ? "Current primary conference or division not verified"
          : a.conference === b.conference && sameDivision
            ? "Same athletic conference"
            : sameDivision
              ? "Different conferences, same division"
              : "Different divisions",
    },
  ];
}
export const dateKey = (d = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
export const puzzleNumber = (date = dateKey()) =>
  Math.floor(
    (Date.parse(date + "T12:00:00Z") - Date.parse("2026-10-30T12:00:00Z")) /
      86400000,
  ) + 1;
// Frozen ID order is committed independently of future dataset ordering.
import schedule from "../data/schedule-v1.json";
export const dailyAnswer = (date = dateKey()) =>
  colleges.find(
    (c) =>
      c.id ===
      schedule[
        (((puzzleNumber(date) - 1) % schedule.length) + schedule.length) %
          schedule.length
      ],
  )!;
export type Round = {
  roundId?: string;
  answer: string;
  guesses: string[];
  mode: "daily" | "practice";
  date: string;
};
export const status = (r: Round) =>
  r.guesses.includes(r.answer)
    ? "won"
    : r.mode === "daily" && r.guesses.length >= 8
      ? "lost"
      : "playing";
export function guess(r: Round, id: string): Round {
  if (
    status(r) !== "playing" ||
    r.guesses.includes(id) ||
    !colleges.some((c) => c.id === id)
  )
    return r;
  return { ...r, guesses: [...r.guesses, id] };
}
export function share(r: Round) {
  const a = colleges.find((c) => c.id === r.answer)!;
  return (
    `COLLEGEGUESSR ${r.mode === "daily" ? "#" + puzzleNumber(r.date) : "PRACTICE"}\n${status(r) === "won" ? "Solved in" : "Guesses:"} ${r.guesses.length}${r.mode === "daily" ? "/8" : ""}\n` +
    r.guesses
      .map((id) =>
        compare(
          colleges.find((c) => c.id === id)!,
          a,
        )
          .map(
            (t) =>
              ({ green: "🟩", yellow: "🟨", gray: "⬛", neutral: "⬜" })[
                t.color
              ],
          )
          .join(""),
      )
      .join("\n") +
    "\nGuess the school. Decode the clues."
  );
}
export function load<T>(
  key: string,
  fallback: T,
  valid: (v: unknown) => boolean = () => true,
): T {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "null");
    return v !== null && valid(v) ? v : fallback;
  } catch {
    return fallback;
  }
}
export function save(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* Private browsing and full storage: session remains playable. */
  }
}
