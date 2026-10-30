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
        {["STATE", "TYPE", "STUDENTS", "ACADEMIC RANK", "CONFERENCE"].map(
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
                        "Academic rank",
                        "Conference",
                      ][i]
                    }
                    index={i}
                    animate={id === revealId}
                    onComplete={i === 4 ? onRevealComplete : undefined}
                  />
                ))}
              </div>
            </div>
          );
        })
      ) : (
        <div className="empty">
          <p>Your first clue starts with a college.</p>
          <span>Search any school in the 150-college pool.</span>
        </div>
      )}
    </div>
  );
}
