import { useEffect, useState } from "react";
import {
  BarChart3,
  Settings,
  HelpCircle,
  CalendarDays,
  Infinity as InfinityIcon,
} from "lucide-react";
import { BugReport } from "./components/BugReport";
import {
  API_URL,
  initializeService,
  configuredAnswer,
  recordPlay,
} from "./service";
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
type SettingsType = { motion: boolean; hard: boolean };
const defaultSettings = {
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
    roundId:
      globalThis.crypto?.randomUUID?.() ??
      `round-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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
    location.hash === "#practice" ? "practice" : "daily",
  );
  const [modal, setModal] = useState("");
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const [settings, setSettings] = useState(() =>
    load<SettingsType>(
      "cg-requested-ug-v1-settings",
      defaultSettings,
      (v) =>
        !!v &&
        typeof (v as SettingsType).motion === "boolean" &&
        typeof (v as SettingsType).hard === "boolean",
    ),
  );
  const [round, setRound] = useState(() =>
    load<Round>(
      `cg-requested-ug-v1-${page === "practice" ? "practice" : dateKey()}`,
      fresh(page === "practice" ? "practice" : "daily"),
      validRound,
    ),
  );
  const [history, setHistory] = useState(() =>
    load<Record<string, Round>>(
      "cg-requested-ug-v1-history",
      {},
      (v) => !!v && typeof v === "object" && Object.values(v).every(validRound),
    ),
  );
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = "light";
    document.documentElement.dataset.motion = settings.motion ? "on" : "off";
    save("cg-requested-ug-v1-settings", settings);
  }, [settings]);
  useEffect(() => {
    save(
      `cg-requested-ug-v1-${round.mode === "daily" ? round.date : "practice"}`,
      round,
    );
    if (status(round) !== "playing") {
      setHistory((h) => {
        const next = {
          ...h,
          [round.mode === "daily"
            ? round.date
            : `practice-${round.roundId ?? round.answer + "-" + round.date + "-" + round.guesses.join(".")}`]:
            round,
        };
        save("cg-requested-ug-v1-history", next);
        return next;
      });
    }
  }, [round]);
  useEffect(() => {
    const sync = (e: StorageEvent) => {
      if (
        e.key ===
          `cg-requested-ug-v1-${round.mode === "daily" ? round.date : "practice"}` &&
        e.newValue
      ) {
        try {
          const r = JSON.parse(e.newValue);
          if (validRound(r)) setRound(r);
        } catch {}
      }
      if (e.key === "cg-requested-ug-v1-history")
        setHistory(
          load(
            "cg-requested-ug-v1-history",
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
    let active = true;
    if (round.mode === "daily" && round.date !== dateKey(new Date(now))) {
      initializeService().then(() => {
        if (active)
          setRound(
            load(`cg-requested-ug-v1-${dateKey()}`, fresh("daily"), validRound),
          );
      });
    }
    return () => {
      active = false;
    };
  }, [dateKey(new Date(now)), round.mode, round.date]);
  async function navigate(p: string) {
    if (p === "daily" && !configuredAnswer(dateKey()))
      await initializeService();
    setRevealingId(null);
    setPage(p);
    location.hash = p === "home" ? "" : p;
    if (p === "daily" || p === "practice") {
      const r = load<Round>(
        `cg-requested-ug-v1-${p === "daily" ? dateKey() : "practice"}`,
        fresh(p),
        validRound,
      );
      setRound(r);
    }
    setModal("");
  }
  useEffect(() => {
    if (revealingId && !settings.motion) {
      setRevealingId(null);
      if (status(round) !== "playing") setModal("result");
    }
  }, [settings.motion, revealingId, round]);
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
    setRevealingId(null);
    setRound(fresh("practice", round.answer));
    setModal("");
  }
  return (
    <>
      <header>
        <button className="brand" onClick={() => navigate("daily")}>
          <img
            src={`${import.meta.env.BASE_URL}branding/crest.svg`}
            alt="CollegeGuessr crest"
          />
          <span>College Guessr</span>
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
        <>
          <section className="game-heading">
            <div className="eyebrow">
              {page === "daily"
                ? `DAILY No. ${String(puzzleNumber()).padStart(3, "0")}`
                : "UNLIMITED PRACTICE"}
            </div>
            <h1>
              {page === "daily"
                ? "Guess the college."
                : "Practice your college knowledge."}
            </h1>
            <p>
              {page === "daily"
                ? "169 colleges. Eight guesses. A new college every day."
                : "Universities and liberal arts colleges. Unlimited guesses."}
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
                  : `${round.guesses.length} ${round.guesses.length === 1 ? "guess" : "guesses"}`}
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
            <Search
              excluded={round.guesses}
              disabled={end !== "playing" || revealingId !== null}
              onGuess={(id) => {
                const r = guess(round, id);
                if (r === round) return;
                r.roundId ||= crypto.randomUUID();
                void recordPlay(r.mode, r.roundId);
                const animate =
                  settings.motion &&
                  !matchMedia("(prefers-reduced-motion: reduce)").matches;
                setRevealingId(animate ? id : null);
                setRound(r);
                if (!animate && status(r) !== "playing") setModal("result");
              }}
            />
            <div className="legend">
              <span>
                <i className="dot green" />
                Match / close
              </span>
              <span>
                <i className="dot yellow" />
                Close
              </span>
              <span>
                <i className="dot gray" />
                Far away
              </span>
              <span>↑ Higher · ↓ Lower</span>
            </div>
            <Board
              key={
                round.roundId ?? `${round.mode}-${round.date}-${round.answer}`
              }
              ids={round.guesses}
              answer={answer}
              hard={settings.hard}
              revealId={settings.motion ? revealingId : null}
              onRevealComplete={() => {
                setRevealingId(null);
                if (status(round) !== "playing") setModal("result");
              }}
            />
            {end !== "playing" && !revealingId && (
              <div className="completed">
                <strong>
                  {end === "won" ? "You found it!" : "Better luck tomorrow."}{" "}
                  {answer.name}
                </strong>
                <button className="primary" onClick={() => setModal("result")}>
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
      </main>
      <footer>
        <span>
          169 universities & liberal arts colleges · Undergraduate enrollment
        </span>
        <button onClick={() => setModal("data")}>Sources & methodology</button>
        <button onClick={() => setModal("bug")}>Report a bug</button>
        <a href={API_URL + "/admin"} target="_blank" rel="noreferrer">
          Admin
        </a>
        <small>Independent. Not affiliated with any university.</small>
      </footer>
      {modal && (
        <Modal
          title={
            modal === "bug"
              ? "Report a bug"
              : modal === "rules"
                ? "An educated guess starts here."
                : modal === "stats"
                  ? "Your college record"
                  : modal === "settings"
                    ? "Make yourself at home"
                    : modal === "data"
                      ? "Sources & academic rankings"
                      : modal === "pool"
                        ? "The 169-college pool"
                        : end === "won"
                          ? "You found it!"
                          : "Better luck tomorrow."
          }
          onClose={() => setModal("")}
        >
          {modal === "bug" && <BugReport mode={round.mode} date={round.date} />}
          {modal === "rules" && (
            <div className="prose">
              <p>
                Search for a college, choose a suggestion, and submit your
                guess. Identify the exact school to win; matching clues alone
                doesn’t win.
              </p>
              <p>
                <b>✓ Green:</b> same state or type; undergraduate enrollment
                within 2,500; comparable rank within 10; same primary
                conference; distance within 150 miles.
              </p>
              <p>
                <b>≈ Gold:</b> neighboring states; undergraduate enrollment
                within 10,000; academic rank within 25; distance within 300
                miles. Different conferences are gray.
              </p>
              <p>
                <b>× Gray:</b> farther away or different. <b>— Neutral:</b>{" "}
                verified data unavailable or incompatible rankings.
              </p>
              <p>
                Enrollment and rank explanations use threshold ranges. The rank
                tile shows your guessed college’s position in our selected-pool
                index. The direction clue points from your guess toward the
                answer. It shows only a distance band: within 150 miles, within
                300 miles, or outside 300 miles. Exact mileage is hidden. Arrows
                point toward the answer’s number: ↑ means more students or a
                higher (worse) rank. The tile displays your guessed college’s
                value. Tap a tile for an explanation.
              </p>
              <p>
                Daily gives you eight attempts, resetting at midnight Eastern.
                Practice has unlimited attempts. The 169-school pool is ranked
                by the CollegeGuessr Academic Outcomes Index: 65% six-year
                graduation rate and 35% full-time retention, using NCES 2023
                data. This is our index, not a published national ranking.
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
                    save("cg-requested-ug-v1-history", {});
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
                <b>169 universities and liberal arts colleges.</b>
              </p>
              <p>{manifest.selection}</p>
              <p>{manifest.ranking}</p>
              <p>
                <b>Score = 65% graduation + 35% retention.</b> Both inputs are
                percentages. Positions are relative to this selected college
                pool.
              </p>
              <p>
                {manifest.graduation}. {manifest.retention}.
              </p>
              <p>
                {manifest.enrollment}. {manifest.athletics}.
              </p>
              <p>{manifest.missing}</p>
              <p>
                Play counts use a random browser identifier when you submit a
                guess. Counting requests contain no college guesses or answer
                IDs.
              </p>
              <button className="secondary" onClick={() => setModal("pool")}>
                View all 169 schools
              </button>
              {manifest.sources.map((s) => (
                <p key={s}>
                  <a href={s} target="_blank" rel="noreferrer">
                    {s.split("/").pop()} ↗
                  </a>
                </p>
              ))}
              <p>
                Independently developed. Not affiliated with Cornell or any
                university, conference, NCES, or ranking publisher. A static
                game is not cheat-proof.
              </p>
            </div>
          )}
          {modal === "pool" && (
            <div className="pool-list">
              <p className="muted">
                The college pool, listed alphabetically. Ranks are positions in
                our selected-pool Academic Outcomes Index.
              </p>
              {[...colleges]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((c) => (
                  <div key={c.id}>
                    <span>
                      {c.name}
                      <small>
                        {c.city}, {c.state} · {c.conference} · Academic rank #
                        {c.rank}
                      </small>
                    </span>
                  </div>
                ))}
            </div>
          )}
          {modal === "result" && (
            <>
              <div className="reveal">
                <img
                  src={`${import.meta.env.BASE_URL}branding/crest.svg`}
                  alt=""
                />
                <span>
                  {end === "won"
                    ? `Solved in ${round.guesses.length} guesses`
                    : "The mystery college was"}
                </span>
                <h3>{answer.name}</h3>
                <p>
                  {answer.city}, {answer.state} · {answer.institutionType}
                </p>
                <p>
                  {answer.enrollment.toLocaleString()} undergraduates · Fall
                  2023
                </p>
                <p>{answer.conference}</p>
                <p className="muted">
                  Academic rank #{answer.rank} · CollegeGuessr Academic Outcomes
                  Index
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
