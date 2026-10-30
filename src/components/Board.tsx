import { ComparisonTile } from "./ComparisonTile";
import { colleges, compare, type College } from "../game/engine";
export function Board({
  ids,
  answer,
  hard,
  revealId,
  onRevealComplete,
}: {
  ids: string[];
  answer: College;
  hard: boolean;
  revealId: string | null;
  onRevealComplete: () => void;
}) {
  return (
    <div className="board">
      <div className="board-head">
        <span>COLLEGE</span>
        {["STATE", "TYPE", "STUDENTS", "RANK", "DIVISION", "CONFERENCE"].map(
          (x) => (
            <span key={x}>{x}</span>
          ),
        )}
      </div>
      {ids.length ? (
        ids.map((id, index) => {
          const c = colleges.find((x) => x.id === id)!;
          return (
            <div className="guess-row" key={id}>
              <div className="school">
                <span className="row-num">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <strong>{c.shortName}</strong>
              </div>
              <div className="tiles">
                {compare(c, answer, hard).map((t, i) => (
                  <ComparisonTile
                    key={i}
                    tile={t}
                    label={
                      [
                        "State",
                        "Type",
                        "Students",
                        "Rank",
                        "Division",
                        "Conference",
                      ][i]
                    }
                    index={i}
                    animate={id === revealId}
                    onComplete={i === 5 ? onRevealComplete : undefined}
                  />
                ))}
              </div>
            </div>
          );
        })
      ) : (
        <div className="empty">
          <img src={`${import.meta.env.BASE_URL}branding/crest.svg`} alt="" />
          <h3>No guesses recorded.</h3>
          <p>
            Your first guess is the first clue.
            <br />
            Start with a college you know.
          </p>
          <span>LOCATION · ENROLLMENT · INSTITUTION · ATHLETICS</span>
        </div>
      )}
    </div>
  );
}
