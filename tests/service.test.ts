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
    vi.fn().mockResolvedValue(
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

import { recordPlay } from "../src/service";
it("deduplicates successful play events and sends no guesses or answer IDs", async () => {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
  });
  const post = vi.fn().mockResolvedValue(new Response('{"ok":true}'));
  vi.stubGlobal("fetch", post);
  const roundId = crypto.randomUUID();
  await recordPlay("daily", roundId);
  await recordPlay("daily", roundId);
  expect(post).toHaveBeenCalledTimes(1);
  const body = JSON.parse(post.mock.calls[0][1].body);
  expect(Object.keys(body).sort()).toEqual(["mode", "roundId", "visitorId"]);
  expect(body.mode).toBe("daily");
  await recordPlay("practice", crypto.randomUUID());
  expect(post).toHaveBeenCalledTimes(2);
  expect(JSON.parse(post.mock.calls[1][1].body).visitorId).toBe(body.visitorId);
});
it("retries a failed counting request without throwing into gameplay", async () => {
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {} });
  const post = vi
    .fn()
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce(new Response('{"ok":true}'));
  vi.stubGlobal("fetch", post);
  const id = crypto.randomUUID();
  await expect(recordPlay("practice", id)).resolves.toBeUndefined();
  await recordPlay("practice", id);
  expect(post).toHaveBeenCalledTimes(2);
});
