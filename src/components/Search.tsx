import { useMemo, useState } from "react";
import Fuse from "fuse.js";
import { colleges, type College } from "../game/engine";
function highlight(name: string, q: string) {
  const i = name.toLocaleLowerCase().indexOf(q.trim().toLocaleLowerCase());
  return i < 0 ? (
    name
  ) : (
    <>
      {name.slice(0, i)}
      <mark>{name.slice(i, i + q.trim().length)}</mark>
      {name.slice(i + q.trim().length)}
    </>
  );
}
export function Search({
  excluded,
  onGuess,
  disabled,
}: {
  excluded: string[];
  onGuess: (id: string) => void;
  disabled: boolean;
}) {
  const [q, setQ] = useState(""),
    [active, setActive] = useState(0),
    [open, setOpen] = useState(false),
    [selected, setSelected] = useState<College | null>(null),
    [error, setError] = useState("");
  const fuse = useMemo(
    () =>
      new Fuse(colleges, {
        keys: [{ name: "name", weight: 2 }, "aliases"],
        threshold: 0.32,
        ignoreLocation: true,
      }),
    [],
  );
  const results = q.trim()
    ? fuse
        .search(q)
        .map((r) => r.item)
        .filter((c) => !excluded.includes(c.id))
        .slice(0, 8)
    : [];
  function select(c: College) {
    setSelected(c);
    setQ(c.name);
    setOpen(false);
    setError("");
  }
  function submit() {
    if (!selected) {
      setError("Choose a college from the suggestions.");
      setOpen(true);
      return;
    }
    onGuess(selected.id);
    setQ("");
    setSelected(null);
    setOpen(false);
  }
  return (
    <div className="search-wrap">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="input-wrap">
          <span aria-hidden="true">⌕</span>
          <input
            aria-label="Search for a college or university"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open && results.length > 0}
            aria-controls="suggestions"
            aria-activedescendant={
              open && results[active] ? `option-${active}` : undefined
            }
            disabled={disabled}
            value={q}
            placeholder="Search for a college or university..."
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQ(e.target.value);
              setSelected(null);
              setActive(0);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(i + 1, results.length - 1));
                setOpen(true);
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(0, i - 1));
              }
              if (e.key === "Escape") setOpen(false);
              if (e.key === "Enter" && open && results[active]) {
                e.preventDefault();
                select(results[active]);
              }
            }}
          />
          {q && (
            <button
              type="button"
              className="clear"
              aria-label="Clear search"
              onClick={() => {
                setQ("");
                setSelected(null);
              }}
            >
              ×
            </button>
          )}
        </div>
        <button className="primary" disabled={disabled} type="submit">
          Submit Guess <span>↵</span>
        </button>
      </form>
      {open && q && !selected && (
        <div id="suggestions" role="listbox" className="suggestions">
          {results.length ? (
            results.map((c, i) => (
              <button
                type="button"
                id={`option-${i}`}
                role="option"
                aria-selected={active === i}
                className={active === i ? "active" : ""}
                key={c.id}
                onClick={() => select(c)}
              >
                <strong>{highlight(c.name, q)}</strong>
                <small>
                  {c.city}, {c.state}
                </small>
              </button>
            ))
          ) : (
            <p>No unguessed colleges found. Try a full name.</p>
          )}
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
