import { describe, it, expect } from "vitest";
import {
  colleges,
  compare,
  numeric,
  guess,
  status,
  share,
  dailyAnswer,
  dateKey,
  states,
  type College,
  type Round,
} from "../src/game/engine";
const a = () =>
  ({
    ...colleges[0],
    state: "NY",
    institutionType: "public",
    enrollment: 30000,
    rank: 50,
    rankSource: "Test",
    rankYear: "2026",
    rankCategory: "Universities",
    athleticAssociation: "NCAA",
    ncaaDivision: "I",
    conference: "A",
  }) as unknown as College;
describe("comparison boundaries", () => {
  it.each([
    [2500, "green"],
    [2501, "yellow"],
    [10000, "yellow"],
    [10001, "gray"],
  ])("enrollment %i", (d, c) =>
    expect(numeric(30000, 30000 + Number(d), 2500, 10000).color).toBe(c),
  );
  it.each([
    [10, "green"],
    [11, "yellow"],
    [25, "yellow"],
    [26, "gray"],
  ])("rank %i", (d, c) =>
    expect(numeric(50, 50 + Number(d), 10, 25).color).toBe(c),
  );
  it.each([
    [20, 30, "↑"],
    [30, 20, "↓"],
    [20, 20, ""],
  ])("arrow %i %i", (x, y, s) =>
    expect(numeric(Number(x), Number(y), 1, 2).arrow).toBe(s),
  );
  it.each([
    ["NY", "green"],
    ["NJ", "yellow"],
    ["CA", "gray"],
  ])("state %s", (s, c) =>
    expect(compare(a(), { ...a(), state: s })[0].color).toBe(c),
  );
  it("type has no yellow", () => {
    expect(compare(a(), a())[1].color).toBe("green");
    expect(compare(a(), { ...a(), institutionType: "private" })[1].color).toBe(
      "gray",
    );
  });
  it("incompatible and missing rankings are neutral", () => {
    expect(
      compare(a(), { ...a(), rankCategory: "Liberal arts" })[3].color,
    ).toBe("neutral");
    expect(compare(a(), { ...a(), rank: null })[3].value).toBe("N/A");
  });
  it("conference is exact-match only in a D1 pool", () => {
    expect(compare(a(), a())[4].color).toBe("green");
    expect(compare(a(), { ...a(), conference: "B" })[4].color).toBe("gray");
    expect(compare({ ...a(), conference: null }, a())[4].color).toBe("neutral");
  });
  it("all requested schools and liberal arts colleges have comparable ranks", () => {
    expect(colleges).toHaveLength(169);
    expect(new Set(colleges.map((c) => c.rank)).size).toBe(169);
    for (const c of colleges) {
      expect(["I", "II", "III"]).toContain(c.ncaaDivision);
      expect(c.rank).toBeGreaterThan(0);
      expect(c.rank).toBeLessThanOrEqual(169);
      expect(compare(c, colleges[0])[3].color).not.toBe("neutral");
      expect(compare(c, colleges[0])).toHaveLength(6);
    }
  });
  it("state map symmetric", () => {
    for (const [s, ns] of Object.entries(states))
      for (const n of ns.split(" ").filter(Boolean))
        expect(states[n].split(" ")).toContain(s);
  });
});
describe("rounds", () => {
  const round = (): Round => ({
    answer: colleges[0].id,
    guesses: [],
    mode: "daily",
    date: "2026-10-30",
  });
  it("exact ID wins", () =>
    expect(status(guess(round(), colleges[0].id))).toBe("won"));
  it("invalid IDs ignored", () =>
    expect(guess(round(), "invalid")).toEqual(round()));
  it("duplicates ignored", () => {
    const r = guess(round(), colleges[1].id);
    expect(guess(r, colleges[1].id)).toEqual(r);
  });
  it("eight misses lose", () => {
    let r = round();
    for (const c of colleges.slice(1, 9)) r = guess(r, c.id);
    expect(status(r)).toBe("lost");
    expect(guess(r, colleges[0].id)).toEqual(r);
  });
  it("practice attempts unlimited", () => {
    let r = { ...round(), mode: "practice" } as Round;
    for (const c of colleges.slice(1, 12)) r = guess(r, c.id);
    expect(status(r)).toBe("playing");
  });
  it("share conceals answer and has six tiles", () => {
    const r = guess(round(), colleges[1].id);
    const s = share(r);
    expect(s).not.toContain(colleges[0].name);
    expect([...s.split("\n")[2]].length).toBe(6);
  });
  it("daily deterministic", () =>
    expect(dailyAnswer("2026-10-30")).toEqual(dailyAnswer("2026-10-30")));
  it("Eastern date respects midnight", () => {
    expect(dateKey(new Date("2026-10-31T03:59:00Z"))).toBe("2026-10-30");
    expect(dateKey(new Date("2026-10-31T04:00:00Z"))).toBe("2026-10-31");
  });
  it("serialize progress", () =>
    expect(JSON.parse(JSON.stringify(guess(round(), colleges[1].id)))).toEqual(
      guess(round(), colleges[1].id),
    ));
});

describe("no exact numerical giveaways", () => {
  it("enrollment explanations contain only threshold bands", () => {
    const r = compare(
      { ...a(), enrollment: 30000 },
      { ...a(), enrollment: 34219 },
    );
    expect(r[2].hint).toBe(
      "Undergraduate enrollment More than 2,500 and within 10,000",
    );
    expect(r[2].hint).not.toContain("4,219");
  });
  it("rank clues show the guessed rank without exposing the answer rank or gap", () => {
    const r = compare({ ...a(), rank: 53 }, { ...a(), rank: 71 });
    expect(r[3].value).toBe("#53 ↑");
    expect(r[3].hint).toContain("within 25");
    expect(r[3].hint).not.toMatch(/71|18/);
  });
  it("the exact-equality case remains a range, not a zero-difference giveaway", () => {
    const r = numeric(10000, 10000, 2500, 10000);
    expect(r.hint).toBe("Within 2,500");
    expect(r.arrow).toBe("");
  });
});

import schedule from "../src/data/schedule-requested-v1.json";
describe("annual schedule", () => {
  it("covers 365 days with a full pool before repeats", () => {
    expect(schedule).toHaveLength(365);
    for (let start = 0; start < 338; start += 169)
      expect(new Set(schedule.slice(start, start + 169)).size).toBe(169);
    for (let i = 1; i < 365; i++) expect(schedule[i]).not.toBe(schedule[i - 1]);
    for (let i = 0; i < 365; i++) {
      const date = new Date(Date.UTC(2026, 10, 1 + i))
        .toISOString()
        .slice(0, 10);
      expect(dailyAnswer(date).id).toBe(schedule[i]);
    }
  });
});
