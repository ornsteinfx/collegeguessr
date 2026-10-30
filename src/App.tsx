import { useEffect, useState } from "react";
import {
  BarChart3,
  Settings,
  HelpCircle,
  ArrowUpRight,
  CalendarDays,
  Infinity as InfinityIcon,
} from "lucide-react";
import { Board } from "./components/Board";
import { Search } from "./components/Search";
import { Modal } from "./components/Modal";
import {
  colleges,
  answerPool,
  dailyAnswer,
  dateKey,
  puzzleNumber,
  guess,
  status,
  share,
  load,
  save,
  type Round,
} from "./game/engine";
import manifest from "./data/dataManifest.json";
type SettingsType = { dark: boolean; motion: boolean; hard: boolean };
const defaultSettings = {
  dark: matchMedia("(prefers-color-scheme: dark)").matches,
  motion: !matchMedia("(prefers-reduced-motion: reduce)").matches,
  hard: false,
};
const validRound = (v: unknown): v is Round => {
  const r = v as Round;
  return (
    !!r &&
    answerPool.some((c) => c.id === r.answer) &&
    Array.isArray(r.guesses) &&
    r.guesses.every((id) => colleges.some((c) => c.id === id)) &&
    new Set(r.guesses).size === r.guesses.length &&
    ["daily", "practice"].includes(r.mode) &&
    typeof r.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(r.date) &&
    Number.isFinite(Date.parse(r.date)) &&
    (r.mode === "practice" || r.guesses.length <= 8)
  );
};
function fresh(mode: "daily" | "practice", previous = ""): Round {
  const pool = answerPool.filter((c) => c.id !== previous);
  return {
    roundId: crypto.randomUUID(),
    mode,
    date: dateKey(),
    answer:
      mode === "daily"
        ? dailyAnswer().id
        : pool[Math.floor(Math.random() * pool.length)].id,
    guesses: [],
  };
}
export function App() {
  const [page, setPage] = useState(
    location.hash === "#practice"
      ? "practice"
      : location.hash === "#daily"
        ? "daily"
        : "home",
  );
  const [modal, setModal] = useState("");
  const [settings, setSettings] = useState(() =>
    load<SettingsType>(
      "cg-v1-settings",
      defaultSettings,
      (v) =>
        !!v &&
        typeof (v as SettingsType).dark === "boolean" &&
        typeof (v as SettingsType).motion === "boolean" &&
        typeof (v as SettingsType).hard === "boolean",
    ),
  );
  const [round, setRound] = useState(() =>
    load<Round>(
      `cg-v1-${page === "practice" ? "practice" : dateKey()}`,
      fresh(page === "practice" ? "practice" : "daily"),
      validRound,
    ),
  );
  const [history, setHistory] = useState(() =>
    load<Record<string, Round>>(
      "cg-v1-history",
      {},
      (v) => !!v && typeof v === "object" && Object.values(v).every(validRound),
    ),
  );
  const [notice, setNotice] = useState("");
  const [onboarding, setOnboarding] = useState(
    () => !load("cg-onboarded", false),
  );
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = settings.dark ? "dark" : "light";
    document.documentElement.dataset.motion = settings.motion ? "on" : "off";
    save("cg-v1-settings", settings);
  }, [settings]);
  useEffect(() => {
    save(`cg-v1-${round.mode === "daily" ? round.date : "practice"}`, round);
    if (status(round) !== "playing") {
      setHistory((h) => {
        const next = {
          ...h,
          [round.mode === "daily"
            ? round.date
            : `practice-${round.roundId ?? round.answer + "-" + round.date + "-" + round.guesses.join(".")}`]:
            round,
        };
        save("cg-v1-history", next);
        return next;
      });
    }
  }, [round]);
  useEffect(() => {
    const sync = (e: StorageEvent) => {
      if (
        e.key === `cg-v1-${round.mode === "daily" ? round.date : "practice"}` &&
        e.newValue
      ) {
        try {
          const r = JSON.parse(e.newValue);
          if (validRound(r)) setRound(r);
        } catch {}
      }
      if (e.key === "cg-v1-history")
        setHistory(
          load(
            "cg-v1-history",
            {},
            (v) =>
              !!v &&
              typeof v === "object" &&
              Object.values(v).every(validRound),
          ),
        );
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [round.mode, round.date]);
  useEffect(() => {
    if (round.mode === "daily" && round.date !== dateKey(new Date(now)))
      setRound(load(`cg-v1-${dateKey()}`, fresh("daily"), validRound));
  }, [now, round]);
  function navigate(p: string) {
    setPage(p);
    location.hash = p === "home" ? "" : p;
    if (p === "daily" || p === "practice") {
      const r = load<Round>(
        `cg-v1-${p === "daily" ? dateKey() : "practice"}`,
        fresh(p),
        validRound,
      );
      setRound(r);
    }
    setModal("");
  }
  const answer = colleges.find((c) => c.id === round.answer)!;
  const end = status(round);
  const records = Object.values(history).filter((r) => r.mode === "daily");
  const wins = records.filter((r) => status(r) === "won");
  const practice = Object.values(history).filter(
    (r) => r.mode === "practice" && status(r) === "won",
  ).length;
  const dates = wins.map((r) => r.date).sort();
  let longest = 0,
    run = 0,
    prev = "";
  for (const d of dates) {
    run = Date.parse(d) - Date.parse(prev) === 86400000 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  let streak = 0;
  let cursor = Date.parse(dateKey());
  if (!dates.includes(dateKey())) cursor -= 86400000;
  while (dates.includes(new Date(cursor).toISOString().slice(0, 10))) {
    streak++;
    cursor -= 86400000;
  }
  // Advance the calendar date, then find the next Eastern midnight using Intl offset iteration (DST safe).
  const today = dateKey(new Date(now));
  let midnight = Date.parse(today + "T00:00:00Z") + 86400000 + 4 * 3600000;
  for (let i = 0; i < 3; i++) {
    const eastern = new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/New_York",
      hourCycle: "h23",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(midnight));
    const [h, m, s] = eastern.split(":").map(Number);
    midnight -= (h * 3600 + m * 60 + s) * 1000;
    if (midnight <= now) midnight += 86400000;
  }
  const remaining = Math.max(0, Math.floor((midnight - now) / 1000));
  const countdown = [
    Math.floor(remaining / 3600),
    Math.floor(remaining / 60) % 60,
    remaining % 60,
  ]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
  async function copy() {
    const text = share(round);
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
      setNotice("Results shared.");
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        setNotice("Results copied.");
      } catch {
        setNotice(text);
      }
    }
  }
  function newPractice() {
    setRound(fresh("practice", round.answer));
    setModal("");
  }
  return (
    <>
      <header>
        <button className="brand" onClick={() => navigate("home")}>
          <img src="/branding/crest.svg" alt="CollegeGuessr crest" />
          <span>
            CollegeGuessr<small>THE DAILY COLLEGE CHALLENGE</small>
          </span>
        </button>
        <nav aria-label="Main navigation">
          <button
            className={page === "daily" ? "selected" : ""}
            onClick={() => navigate("daily")}
          >
            Daily puzzle
          </button>
          <button
            className={page === "practice" ? "selected" : ""}
            onClick={() => navigate("practice")}
          >
            Practice
          </button>
          <span className="nav-divider" />
          <button aria-label="How to play" onClick={() => setModal("rules")}>
            <HelpCircle size={19} />
          </button>
          <button aria-label="Statistics" onClick={() => setModal("stats")}>
            <BarChart3 size={19} />
          </button>
          <button aria-label="Settings" onClick={() => setModal("settings")}>
            <Settings size={19} />
          </button>
        </nav>
      </header>
      <main>
        {page === "home" ? (
          <>
            <section className="hero">
              <div className="eyebrow">
                <span /> A LITTLE KNOWLEDGE. A NEW DISCOVERY.
              </div>
              <h1>
                How well do you know
                <br />
                America’s <em>colleges?</em>
              </h1>
              <p>
                Guess the mystery university using clues about enrollment,
                <br className="desktop" /> rankings, location, and college
                sports.
              </p>
              <div className="hero-actions">
                <button className="primary" onClick={() => navigate("daily")}>
                  Play Today’s College <ArrowUpRight size={17} />
                </button>
                <button
                  className="secondary"
                  onClick={() => navigate("practice")}
                >
                  Practice Unlimited <span>→</span>
                </button>
              </div>
              <div className="hero-meta">
                <span>
                  <CalendarDays size={14} /> One new school every day
                </span>
                <i />
                Free to play. No account needed.
              </div>
            </section>
            <section className="feature-board">
              <div className="feature-title">
                <div>
                  <span className="eyebrow">THE ART OF THE EDUCATED GUESS</span>
                  <h2>Follow the clues. Find your college.</h2>
                </div>
                <span className="mini-crest">✦</span>
              </div>
              <div className="example">
                <strong>
                  YOUR GUESS
                  <br />
                  <b>Boston University</b>
                </strong>
                <div className="tile yellow">
                  <small>STATE</small>
                  <b>MA ≈</b>
                </div>
                <div className="tile green">
                  <small>TYPE</small>
                  <b>Private ✓</b>
                </div>
                <div className="tile yellow">
                  <small>STUDENTS</small>
                  <b>36,624 ↑</b>
                </div>
                <div className="tile neutral">
                  <small>RANK</small>
                  <b>N/A —</b>
                </div>
              </div>
              <p className="example-note">
                Illustrative color example · Schools and figures in actual
                rounds come from IPEDS.
              </p>
              <div className="how">
                <div>
                  <span className="dot green" />
                  <strong>A match</strong>
                  <p>
                    You’re right on target,
                    <br />
                    or very close.
                  </p>
                </div>
                <div>
                  <span className="dot yellow" />
                  <strong>Getting warmer</strong>
                  <p>
                    A neighboring state
                    <br />
                    or a similar number.
                  </p>
                </div>
                <div>
                  <span className="dot gray" />
                  <strong>Keep exploring</strong>
                  <p>
                    Use the differences
                    <br />
                    to guide your next guess.
                  </p>
                </div>
              </div>
            </section>
            <div className="below">
              <span>500 real institutions. Countless connections.</span>
              <button onClick={() => setModal("data")}>
                Explore our data methodology →
              </button>
            </div>
          </>
        ) : (
          <>
            <section className="game-heading">
              <div className="eyebrow">
                {page === "daily"
                  ? "A NEW DISCOVERY, EVERY DAY"
                  : "CURIOSITY HAS NO LIMIT"}
              </div>
              <h1>
                {page === "daily"
                  ? `Daily College #${String(puzzleNumber()).padStart(3, "0")}`
                  : "The practice grounds"}
              </h1>
              <p>
                {page === "daily"
                  ? "One mystery school. Eight educated guesses."
                  : "A fresh school. As many guesses as you need."}
              </p>
            </section>
            <section className="game-card">
              <div className="game-toolbar">
                <span>
                  {page === "daily" ? (
                    <CalendarDays size={16} />
                  ) : (
                    <InfinityIcon size={18} />
                  )}{" "}
                  {page === "daily"
                    ? `Guess ${Math.min(round.guesses.length + 1, 8)} of 8`
                    : `${round.guesses.length} guesses`}
                </span>
                <div className="progress">
                  {page === "daily" &&
                    Array.from({ length: 8 }, (_, i) => (
                      <i
                        key={i}
                        className={i < round.guesses.length ? "filled" : ""}
                      />
                    ))}
                </div>
                {page === "practice" && (
                  <button onClick={newPractice}>New College ↻</button>
                )}
              </div>
              {onboarding && (
                <div className="onboarding">
                  <p>
                    <b>Your first educated guess.</b> Pick any college you know.
                    Submit it, then use the colors and arrows to narrow your
                    search.
                  </p>
                  <button
                    onClick={() => {
                      setOnboarding(false);
                      save("cg-onboarded", true);
                    }}
                  >
                    Got it
                  </button>
                </div>
              )}
              <Search
                excluded={round.guesses}
                disabled={end !== "playing"}
                onGuess={(id) => {
                  const r = guess(round, id);
                  setRound(r);
                  if (status(r) !== "playing") setModal("result");
                }}
              />
              <div className="legend">
                <span>
                  <i className="dot green" />
                  Match / close
                </span>
                <span>
                  <i className="dot yellow" />
                  Similar
                </span>
                <span>
                  <i className="dot gray" />
                  Far away
                </span>
                <span>↑ Higher · ↓ Lower · — Unavailable</span>
              </div>
              <Board ids={round.guesses} answer={answer} hard={settings.hard} />
              {end !== "playing" && (
                <div className="completed">
                  <strong>
                    {end === "won" ? "You found it!" : "Better luck tomorrow."}{" "}
                    {answer.name}
                  </strong>
                  <button
                    className="primary"
                    onClick={() => setModal("result")}
                  >
                    View results
                  </button>
                </div>
              )}
            </section>
            <div className="game-bottom">
              <button onClick={() => setModal("rules")}>
                ⓘ A little help with the clues
              </button>
              {page === "daily" && (
                <span>
                  Next college in <b>{countdown}</b> ET
                </span>
              )}
            </div>
          </>
        )}
        <div className="data-banner">
          <b>THE COLLEGE POOL</b> {colleges.length} sourced schools ·{" "}
          {colleges.filter((c) => c.eligibleAsAnswer).length} eligible answers ·
          Fall 2023 enrollment · 2026–27 NCAA membership. Rankings unavailable.{" "}
          <button onClick={() => setModal("data")}>Details</button>
        </div>
      </main>
      <footer>
        <span>
          CollegeGuessr <i>✦</i> Guess the school. Decode the clues.
        </span>
        <button onClick={() => setModal("data")}>Sources & methodology</button>
        <small>Independent. Not affiliated with any university.</small>
      </footer>
      {modal && (
        <Modal
          title={
            modal === "rules"
              ? "An educated guess starts here."
              : modal === "stats"
                ? "Your college record"
                : modal === "settings"
                  ? "Make yourself at home"
                  : modal === "data"
                    ? "Behind the clues"
                    : end === "won"
                      ? "You found it!"
                      : "Better luck tomorrow."
          }
          onClose={() => setModal("")}
        >
          {modal === "rules" && (
            <div className="prose">
              <p>
                Search for a college, choose a suggestion, and submit your
                guess. Identify the exact school to win; matching clues alone
                doesn’t win.
              </p>
              <p>
                <b>✓ Green:</b> same state or type; enrollment within 2,500;
                comparable rank within 10; same NCAA division or primary
                conference.
              </p>
              <p>
                <b>≈ Gold:</b> neighboring states; enrollment within 10,000;
                rank within 25; adjacent NCAA divisions; different conference in
                the same division.
              </p>
              <p>
                <b>× Gray:</b> farther away or different. <b>— Neutral:</b>{" "}
                verified data unavailable or incompatible rankings.
              </p>
              <p>
                Arrows point toward the answer’s number: ↑ means more students
                or a higher (worse) rank. The tile displays your guessed
                college’s value. Tap a tile for an explanation.
              </p>
              <p>
                Daily gives you eight attempts, resetting at midnight Eastern.
                Practice has unlimited attempts. Rank clues are neutral where
                licensed comparable rankings are unavailable. Some guessed
                schools have unverified athletics; those clues remain neutral.
              </p>
              <button
                className="primary"
                onClick={() => {
                  save("cg-onboarded", true);
                  setModal("");
                }}
              >
                Ready to explore
              </button>
            </div>
          )}
          {modal === "stats" && (
            <>
              <div className="stat-grid">
                {[
                  [records.length, "Played"],
                  [
                    `${records.length ? Math.round((wins.length / records.length) * 100) : 0}%`,
                    "Win rate",
                  ],
                  [streak, "Current streak"],
                  [longest, "Best streak"],
                  [
                    wins.length
                      ? (
                          wins.reduce((s, r) => s + r.guesses.length, 0) /
                          wins.length
                        ).toFixed(1)
                      : "—",
                    "Average / win",
                  ],
                  [practice, "Practice solved"],
                ].map(([n, l]) => (
                  <div key={l}>
                    <b>{n}</b>
                    <span>{l}</span>
                  </div>
                ))}
              </div>
              <h3>Guess distribution</h3>
              {Array.from({ length: 8 }, (_, i) => {
                const n = wins.filter((r) => r.guesses.length === i + 1).length;
                return (
                  <div className="bar-row" key={i}>
                    <span>{i + 1}</span>
                    <div
                      style={{
                        width: `${Math.max(5, (n / Math.max(1, wins.length)) * 90)}%`,
                      }}
                    >
                      {n}
                    </div>
                  </div>
                );
              })}
              <p className="muted">Your statistics are saved on this device.</p>
            </>
          )}
          {modal === "settings" && (
            <>
              <div className="settings">
                {(
                  [
                    ["dark", "Dark appearance"],
                    ["motion", "Reveal animations"],
                    ["hard", "Hard mode · hide arrows"],
                  ] as const
                ).map(([k, l]) => (
                  <label key={k}>
                    {l}
                    <input
                      type="checkbox"
                      checked={settings[k]}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, [k]: e.target.checked }))
                      }
                    />
                  </label>
                ))}
              </div>
              <p>Color clues always include symbols for accessibility.</p>
              <button
                className="secondary"
                onClick={() => {
                  if (
                    confirm(
                      "Reset all saved statistics? Current round progress will remain.",
                    )
                  ) {
                    setHistory({});
                    save("cg-v1-history", {});
                  }
                }}
              >
                Reset statistics
              </button>
            </>
          )}
          {modal === "data" && (
            <div className="prose">
              <p>
                <b>
                  {manifest.total} real colleges; {manifest.eligible}{" "}
                  production-eligible answers.
                </b>{" "}
                Mystery answers require verified enrollment, location, type and
                current NCAA division and conference. Schools without athletics
                matches can be guessed but cannot become answers.
              </p>
              <p>{manifest.selection}</p>
              <p>
                Enrollment: {manifest.enrollment}. The 2024 bulk fall enrollment
                endpoint returned 404 during collection; 2023 is the reliably
                accessible snapshot used here.
              </p>
              <p>
                {manifest.missing} Current athletics come from the official NCAA
                active-member directory, academic year 2027 (2026–27).
                Historical basketball membership is retained only for audit,
                never substituted for primary conference.
              </p>
              {manifest.sources.map((s) => (
                <p key={s}>
                  <a href={s} target="_blank" rel="noreferrer">
                    {s.split("/").pop()} ↗
                  </a>
                </p>
              ))}
              <p>
                Static client-side answers can be inspected. CollegeGuessr is
                independently developed and is not affiliated with any
                institution, conference, or ranking organization.
              </p>
            </div>
          )}
          {modal === "result" && (
            <>
              <div className="reveal">
                <img src="/branding/crest.svg" alt="" />
                <span>
                  {end === "won"
                    ? `Solved in ${round.guesses.length} guesses`
                    : "The mystery college was"}
                </span>
                <h3>{answer.name}</h3>
                <p>
                  {answer.city}, {answer.state} · {answer.institutionType}
                </p>
                <p>{answer.enrollment.toLocaleString()} students · Fall 2023</p>
                <p>
                  {answer.ncaaDivision
                    ? `NCAA Division ${answer.ncaaDivision}`
                    : "Not verified"}{" "}
                  · {answer.conference ?? "Not verified"}
                </p>
                <p className="muted">
                  2026–27 NCAA membership · Rank unavailable
                </p>
                <a
                  href={answer.officialWebsite}
                  target="_blank"
                  rel="noreferrer"
                >
                  Visit university website ↗
                </a>
              </div>
              <div className="result-actions">
                <button className="primary" onClick={copy}>
                  Share Results
                </button>
                <button className="secondary" onClick={() => setModal("stats")}>
                  View Statistics
                </button>
                {page === "practice" && (
                  <button className="secondary" onClick={newPractice}>
                    Play Again
                  </button>
                )}
              </div>
              <p role="status" className="share-fallback">
                {notice}
              </p>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
