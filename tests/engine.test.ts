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
    [20, 20, "="],
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
  it("all 150 schools are D1 and have comparable ranks", () => {
    expect(colleges).toHaveLength(150);
    expect(new Set(colleges.map((c) => c.rank)).size).toBe(150);
    for (const c of colleges) {
      expect(c.ncaaDivision).toBe("I");
      expect(c.rank).toBeGreaterThan(0);
      expect(c.rank).toBeLessThanOrEqual(150);
      expect(compare(c, colleges[0])[3].color).not.toBe("neutral");
      expect(compare(c, colleges[0])).toHaveLength(5);
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
  it("share conceals answer and has five tiles", () => {
    const r = guess(round(), colleges[1].id);
    const s = share(r);
    expect(s).not.toContain(colleges[0].name);
    expect([...s.split("\n")[2]].length).toBe(5);
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
