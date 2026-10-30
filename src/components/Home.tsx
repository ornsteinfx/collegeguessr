import { puzzleNumber, dateKey, colleges, answerPool } from "../game/engine";
export function Home({
  navigate,
  onData,
}: {
  navigate: (p: string) => void;
  onData: () => void;
}) {
  const base = import.meta.env.BASE_URL;
  return (
    <>
      <div className="edition-line">
        <span>AN INDEPENDENT COLLEGIATE PURSUIT</span>
        <span>
          {new Date(dateKey() + "T12:00:00Z").toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
            timeZone: "America/New_York",
          })}
        </span>
      </div>
      <section className="academic-hero">
        <div className="hero-copy">
          <div className="section-kicker">THE DAILY EXAMINATION</div>
          <h1>
            How well do you know America’s <em>colleges?</em>
          </h1>
          <div className="red-rule" />
          <p>
            One institution. Eight guesses.
            <br />
            Put your knowledge of American higher education to the test.
          </p>
          <div className="academic-actions">
            <button className="primary" onClick={() => navigate("daily")}>
              Play Today’s College <span aria-hidden="true">→</span>
            </button>
            <button
              className="text-action"
              onClick={() => navigate("practice")}
            >
              Practice Unlimited <span aria-hidden="true">↗</span>
            </button>
          </div>
          <div className="issue-caption">
            No registration required <span>·</span> A new college at midnight
            Eastern
          </div>
        </div>
        <div className="college-plate">
          <div className="plate-heading">
            <span>COLLEGE GUESSR</span>
            <span>
              EXAMINATION No. {String(puzzleNumber()).padStart(3, "0")}
            </span>
          </div>
          <img
            className="plate-seal"
            src={`${base}branding/crest.svg`}
            alt="Red College Guessr academic crest"
          />
          <img
            className="campus-engraving"
            src={`${base}branding/campus.svg`}
            alt="Original line drawing of a classical college hall"
          />
          <div className="plate-caption">
            <span>SCIENTIA &nbsp;·&nbsp; EXPLORATIO</span>
            <i>Knowledge begins with a question.</i>
          </div>
        </div>
      </section>
      <section className="academic-facts" aria-label="Game overview">
        <div>
          <b>{colleges.length}</b>
          <span>American institutions</span>
        </div>
        <div>
          <b>{answerPool.length}</b>
          <span>Eligible mystery colleges</span>
        </div>
        <div>
          <b>8</b>
          <span>Guesses to find the answer</span>
        </div>
        <div>
          <b>One</b>
          <span>New examination each day</span>
        </div>
      </section>
      <section className="academic-guide">
        <div className="guide-title">
          <span className="section-kicker">A BRIEF ORIENTATION</span>
          <h2>
            Read the clues.
            <br /> Make your case.
          </h2>
          <button className="text-action" onClick={onData}>
            Our sources & methodology ↗
          </button>
        </div>
        <div className="guide-content">
          <p>
            Begin with any college you know. Each guess reveals how its
            location, size, institutional type, and athletics compare with the
            mystery school.
          </p>
          <div className="guide-steps">
            <div>
              <span className="guide-number">I.</span>
              <h3>Choose a college</h3>
              <p>Search by name or abbreviation and submit your first guess.</p>
            </div>
            <div>
              <span className="guide-number">II.</span>
              <h3>Study the evidence</h3>
              <p>
                <i className="dot green" /> A match.{" "}
                <i className="dot yellow" /> A close comparison.{" "}
                <i className="dot gray" /> A different direction.
              </p>
            </div>
            <div>
              <span className="guide-number">III.</span>
              <h3>Name the institution</h3>
              <p>
                Follow the clues. Only the exact college earns a passing mark.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
