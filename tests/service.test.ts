import { afterEach, expect, it, vi } from "vitest";
import { initializeService, configuredAnswer } from "../src/service";
import { colleges } from "../src/game/engine";
afterEach(() => vi.unstubAllGlobals());
it("uses a cached override offline and restores baseline data when a correction is removed", async () => {
  const c = colleges[0],
    baseline = c.enrollment;
  const store = new Map<string, string>([
    [
      "cg-service-v1",
      JSON.stringify({
        corrections: { [c.id]: { enrollment: baseline + 7 } },
        daily: { date: "2027-01-12", id: c.id },
      }),
    ],
  ]);
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
  });
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  await initializeService();
  expect(c.enrollment).toBe(baseline + 7);
  expect(configuredAnswer("2027-01-12")).toBe(c.id);
  expect(configuredAnswer("2027-01-13")).toBeUndefined();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ corrections: {} }), { status: 200 }),
      ),
  );
  await initializeService();
  expect(c.enrollment).toBe(baseline);
  expect(configuredAnswer("2027-01-12")).toBeUndefined();
});
it("ignores invalid remote corrections and unknown answer IDs", async () => {
  const c = colleges[0],
    baseline = c.enrollment;
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {} });
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            corrections: { [c.id]: { enrollment: -20 } },
            daily: { date: "2027-02-01", id: "not-a-school" },
          }),
        ),
      ),
  );
  await initializeService();
  expect(c.enrollment).toBe(baseline);
  expect(configuredAnswer("2027-02-01")).toBeUndefined();
});
