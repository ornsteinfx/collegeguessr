import schools from "../src/data/colleges.json";
import schedule from "../src/data/schedule-requested-v1.json";
import { analyticsSchema, analyticsSummary } from "./analytics";
import { adminHtml } from "./admin";
interface Env {
  STORE: DurableObjectNamespace;
  ADMIN_PASSWORD: string;
  SESSION_SECRET: string;
  PUBLIC_ORIGIN: string;
  PUBLIC_ORIGINS?: string;
}
function publicOrigin(origin: string | null, env: Env) {
  return (
    !!origin &&
    ([
      env.PUBLIC_ORIGIN,
      ...(env.PUBLIC_ORIGINS || "").split(",").map((s) => s.trim()),
    ].includes(origin) ||
      /^http:\/\/127\.0\.0\.1:\d+$/.test(origin))
  );
}
type Report = {
  id: string;
  title: string;
  description: string;
  category: string;
  created: string;
  status: "open" | "resolved";
  context: Record<string, string>;
};
type Correction = {
  enrollment?: number;
  conference?: string;
  city?: string;
  source?: string;
};
const ids = new Set(schools.map((c) => c.id));
const json = (v: unknown, status = 200) =>
  new Response(JSON.stringify(v), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
const encoder = new TextEncoder();
async function mac(secret: string, text: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return Array.from(
    new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(text))),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
async function equal(a: string, b: string) {
  const aa = await crypto.subtle.digest("SHA-256", encoder.encode(a)),
    bb = await crypto.subtle.digest("SHA-256", encoder.encode(b));
  let d = 0;
  new Uint8Array(aa).forEach((v, i) => (d |= v ^ new Uint8Array(bb)[i]));
  return d === 0;
}
async function authorized(req: Request, env: Env) {
  const token =
    req.headers.get("Cookie")?.match(/(?:^|; )cg_admin=([^;]+)/)?.[1] ?? "";
  const [expiry, nonce, sig] = token.split(".");
  return (
    !!expiry &&
    !!nonce &&
    !!sig &&
    Number(expiry) > Date.now() &&
    (await equal(sig, await mac(env.SESSION_SECRET, expiry + "." + nonce)))
  );
}
function dayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
function validDate(d: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(d) &&
    new Date(d + "T12:00:00Z").toISOString().slice(0, 10) === d
  );
}
function scheduled(d: string) {
  const i = Math.floor(
    (Date.parse(d + "T12:00:00Z") - Date.parse("2026-11-01T12:00:00Z")) /
      86400000,
  );
  return schedule[((i % schedule.length) + schedule.length) % schedule.length];
}
export class CollegeStore {
  constructor(
    private ctx: DurableObjectState,
    private env: Env,
  ) {}
  async fetch(req: Request): Promise<Response> {
    return this.ctx.blockConcurrencyWhile(async () => {
      try {
        return await this.route(req);
      } catch {
        return json({ error: "Request could not be processed" }, 400);
      }
    });
  }
  async route(req: Request): Promise<Response> {
    const url = new URL(req.url),
      p = url.pathname;
    const admin = p.startsWith("/api/admin/");
    if (req.method !== "GET" && req.method !== "HEAD") {
      if (!req.headers.get("Content-Type")?.startsWith("application/json"))
        return json({ error: "JSON required" }, 415);
      if (Number(req.headers.get("Content-Length") || 0) > 16000)
        return json({ error: "Request too large" }, 413);
      const origin = req.headers.get("Origin");
      if (admin && origin !== url.origin)
        return json({ error: "Origin rejected" }, 403);
      if (
        !admin &&
        ["/api/reports", "/api/play"].includes(p) &&
        !publicOrigin(origin, this.env)
      )
        return json({ error: "Origin rejected" }, 403);
    }
    if (p === "/api/admin/login" && req.method === "POST") {
      if (!(await this.limit(req, "login", 10)))
        return json({ error: "Too many attempts. Try again in an hour." }, 429);
      const body = await this.body(req);
      if (
        !this.env.ADMIN_PASSWORD ||
        !this.env.SESSION_SECRET ||
        !(await equal(String(body.password || ""), this.env.ADMIN_PASSWORD))
      )
        return json({ error: "Incorrect password" }, 401);
      const value = String(Date.now() + 86400000) + "." + crypto.randomUUID();
      return new Response('{"ok":true}', {
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": `cg_admin=${value}.${await mac(this.env.SESSION_SECRET, value)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`,
          "Cache-Control": "no-store",
        },
      });
    }
    if (admin && !(await authorized(req, this.env)))
      return json({ error: "Sign in required" }, 401);
    if (p === "/api/admin/logout" && req.method === "POST")
      return new Response('{"ok":true}', {
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie":
            "cg_admin=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0",
        },
      });
    if (p === "/api/config" && req.method === "GET") {
      const overrides =
        (await this.ctx.storage.get<Record<string, string>>("daily")) || {};
      const today = dayKey();
      // Never expose future answer overrides through the public configuration.
      return json({
        corrections: (await this.ctx.storage.get("corrections")) || {},
        daily: { date: today, id: overrides[today] || scheduled(today) },
      });
    }
    if (p === "/api/play" && req.method === "POST") {
      if (!(await this.limit(req, "play", 600)))
        return json({ error: "Rate limit reached" }, 429);
      const b = await this.body(req),
        uuid =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (
        typeof b.visitorId !== "string" ||
        !uuid.test(b.visitorId) ||
        typeof b.roundId !== "string" ||
        !uuid.test(b.roundId) ||
        !["daily", "practice"].includes(b.mode)
      )
        return json({ error: "Invalid play event" }, 400);
      const today = dayKey(),
        visitor = await mac(
          this.env.SESSION_SECRET,
          today + ":visitor:" + b.visitorId,
        ),
        round = await mac(
          this.env.SESSION_SECRET,
          today + ":round:" + b.roundId,
        );
      analyticsSchema(this.ctx.storage.sql);
      this.ctx.storage.sql.exec(
        "INSERT OR IGNORE INTO plays(day,visitor,round,mode) VALUES (?,?,?,?)",
        today,
        visitor,
        round,
        b.mode,
      );
      const cutoff = new Date(Date.parse(today + "T12:00:00Z") - 90 * 86400000)
        .toISOString()
        .slice(0, 10);
      this.ctx.storage.sql.exec("DELETE FROM plays WHERE day < ?", cutoff);
      return json({ ok: true });
    }
    if (p === "/api/reports" && req.method === "POST") {
      if (!(await this.limit(req, "report", 5)))
        return json(
          { error: "Report limit reached. Please try again later." },
          429,
        );
      const b = await this.body(req);
      if (b.website) return json({ error: "Report rejected" }, 400);
      const title = String(b.title || "").trim(),
        description = String(b.description || "").trim();
      if (
        title.length < 3 ||
        title.length > 120 ||
        description.length < 10 ||
        description.length > 4000
      )
        return json(
          {
            error:
              "Add a title (3–120 characters) and description (10–4,000 characters).",
          },
          400,
        );
      const context: Record<string, string> = {};
      for (const k of ["mode", "date", "viewport", "browser"])
        if (typeof b.context?.[k] === "string")
          context[k] = b.context[k].slice(0, 250);
      const report: Report = {
        id: crypto.randomUUID(),
        created: new Date().toISOString(),
        status: "open",
        title,
        description,
        category: ["Gameplay", "College data", "Map", "Other"].includes(
          b.category,
        )
          ? b.category
          : "Other",
        context,
      };
      const reports = (await this.ctx.storage.get<Report[]>("reports")) || [];
      if (reports.length >= 2000)
        return json({ error: "Inbox full. Please try again later." }, 503);
      reports.unshift(report);
      await this.ctx.storage.put("reports", reports);
      return json({ ok: true, id: report.id }, 201);
    }
    if (p === "/api/admin/analytics" && req.method === "GET")
      return json(analyticsSummary(this.ctx.storage.sql, dayKey()));
    if (p === "/api/admin/state" && req.method === "GET")
      return json({
        reports: (await this.ctx.storage.get("reports")) || [],
        corrections: (await this.ctx.storage.get("corrections")) || {},
        daily: (await this.ctx.storage.get("daily")) || {},
        schools: schools.map((c) => ({
          id: c.id,
          name: c.name,
          enrollment: c.enrollment,
          city: c.city,
          conference: c.conference,
        })),
        schedule,
        epoch: "2026-11-01",
        today: dayKey(),
        analytics: analyticsSummary(this.ctx.storage.sql, dayKey()),
      });
    if (p === "/api/admin/report" && req.method === "POST") {
      const b = await this.body(req);
      let reports = (await this.ctx.storage.get<Report[]>("reports")) || [];
      if (!reports.some((r) => r.id === b.id))
        return json({ error: "Report not found" }, 404);
      if (b.action === "delete") reports = reports.filter((r) => r.id !== b.id);
      else if (["open", "resolved"].includes(b.status))
        reports = reports.map((r) =>
          r.id === b.id ? { ...r, status: b.status } : r,
        );
      else return json({ error: "Invalid action" }, 400);
      await this.ctx.storage.put("reports", reports);
      return json({ ok: true });
    }
    if (p === "/api/admin/daily" && req.method === "POST") {
      const b = await this.body(req);
      if (
        !validDate(b.date) ||
        b.date < "2026-11-01" ||
        b.date > "2036-11-02" ||
        (b.id !== null && !ids.has(b.id))
      )
        return json({ error: "Choose a valid date and college" }, 400);
      const daily =
        (await this.ctx.storage.get<Record<string, string>>("daily")) || {};
      if (b.id === null) delete daily[b.date];
      else daily[b.date] = b.id;
      await this.ctx.storage.put("daily", daily);
      return json({ ok: true });
    }
    if (p === "/api/admin/college" && req.method === "POST") {
      const b = await this.body(req);
      if (!ids.has(b.id)) return json({ error: "Unknown college" }, 400);
      const corrections =
        (await this.ctx.storage.get<Record<string, Correction>>(
          "corrections",
        )) || {};
      if (b.reset) delete corrections[b.id];
      else {
        if (
          !Number.isInteger(b.enrollment) ||
          b.enrollment < 1 ||
          b.enrollment > 250000 ||
          typeof b.conference !== "string" ||
          !b.conference.trim() ||
          b.conference.length > 150 ||
          typeof b.city !== "string" ||
          !b.city.trim() ||
          b.city.length > 100 ||
          typeof b.source !== "string" ||
          b.source.length > 1000 ||
          !/^https:\/\//.test(b.source)
        )
          return json(
            {
              error:
                "Use a valid undergraduate count, city, primary conference and HTTPS source URL",
            },
            400,
          );
        corrections[b.id] = {
          enrollment: b.enrollment,
          conference: b.conference.trim(),
          city: b.city.trim(),
          source: b.source,
        };
      }
      await this.ctx.storage.put("corrections", corrections);
      return json({ ok: true });
    }
    return json({ error: "Not found" }, 404);
  }
  async body(req: Request) {
    const text = await req.text();
    if (text.length > 16000) throw new Error("Too large");
    return JSON.parse(text);
  }
  async limit(req: Request, kind: string, max: number) {
    const bucket = Math.floor(Date.now() / 3600000);
    const hash = await mac(
      this.env.SESSION_SECRET,
      req.headers.get("CF-Connecting-IP") || "local",
    );
    const key = `limit:${kind}:${hash}`;
    const previous = await this.ctx.storage.get<{
      bucket: number;
      count: number;
    }>(key);
    const count = previous?.bucket === bucket ? previous.count + 1 : 1;
    await this.ctx.storage.put(key, { bucket, count });
    return count <= max;
  }
}
export default {
  async fetch(req: Request, env: Env) {
    const u = new URL(req.url);
    let response: Response;
    if (u.pathname === "/admin" || u.pathname === "/admin/")
      response = new Response(adminHtml, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "Content-Security-Policy":
            "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
        },
      });
    else if (req.method === "OPTIONS")
      response = new Response(null, { status: 204 });
    else
      response = await env.STORE.get(
        env.STORE.idFromName("collegeguessr"),
      ).fetch(req);
    const headers = new Headers(response.headers);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "no-referrer");
    headers.set("X-Frame-Options", "DENY");
    const origin = req.headers.get("Origin");
    if (publicOrigin(origin, env)) {
      headers.set("Access-Control-Allow-Origin", origin!);
      headers.set("Vary", "Origin");
      headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      headers.set("Access-Control-Allow-Headers", "Content-Type");
    }
    return new Response(response.body, { status: response.status, headers });
  },
} satisfies ExportedHandler<Env>;
