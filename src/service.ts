import raw from "./data/colleges.json";
export const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://collegeguessr-admin.pickle-pal-online.workers.dev";
type Config = {
  corrections?: Record<
    string,
    { enrollment?: number; conference?: string; city?: string; source?: string }
  >;
  daily?: { date: string; id: string };
};
let config: Config = {};
const defaults = new Map(
  raw.map((c) => [
    c.id,
    { enrollment: c.enrollment, conference: c.conference, city: c.city },
  ]),
);
export function configuredAnswer(date: string) {
  return config.daily?.date === date ? config.daily.id : undefined;
}
function apply(value: Config) {
  if (!value || typeof value !== "object") return;
  config.daily = undefined;
  for (const c of raw) {
    Object.assign(c, defaults.get(c.id));
    const v = value.corrections?.[c.id];
    if (!v) continue;
    if (
      Number.isInteger(v.enrollment) &&
      v.enrollment! > 0 &&
      v.enrollment! <= 250000
    )
      c.enrollment = v.enrollment!;
    if (typeof v.conference === "string" && v.conference.length <= 150)
      c.conference = v.conference;
    if (typeof v.city === "string" && v.city.length <= 100) c.city = v.city;
  }
  if (
    value.daily &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.daily.date) &&
    raw.some((c) => c.id === value.daily!.id)
  )
    config.daily = value.daily;
}
export async function initializeService() {
  try {
    apply(JSON.parse(localStorage.getItem("cg-service-v1") || "{}"));
  } catch {}
  try {
    const r = await fetch(API_URL + "/api/config", {
      signal: AbortSignal.timeout(3500),
      cache: "no-store",
    });
    if (!r.ok) return;
    const v = await r.json();
    apply(v);
    try {
      localStorage.setItem("cg-service-v1", JSON.stringify(v));
    } catch {}
  } catch {
    /* Bundled schedule and data keep the game playable offline. */
  }
}
