import { useState } from "react";
import { API_URL } from "../service";
export function BugReport({ mode, date }: { mode: string; date: string }) {
  const [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [category, setCategory] = useState("Gameplay"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [sent, setSent] = useState("");
  return sent ? (
    <div className="prose">
      <p role="status">Your report was received. Thank you.</p>
      <p className="muted">Reference: {sent}</p>
    </div>
  ) : (
    <form
      className="bug-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const r = await fetch(API_URL + "/api/reports", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title,
              description,
              category,
              context: {
                mode,
                date,
                viewport: `${innerWidth} × ${innerHeight}`,
                browser: navigator.userAgent,
              },
            }),
            signal: AbortSignal.timeout(15000),
          });
          const b = await r.json();
          if (!r.ok) throw Error(b.error || "Could not send report");
          setSent(b.id);
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not send report. Please try again.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <p>
        Describe what happened and what you expected. Please leave out passwords
        and personal information.
      </p>
      <label>
        Category
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {["Gameplay", "College data", "Map", "Other"].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label>
        Title
        <input
          required
          minLength={3}
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label>
        What went wrong?
        <textarea
          required
          minLength={10}
          maxLength={4000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <p className="muted">
        Sends the game mode, date, browser and screen size for troubleshooting.
        Your guesses and the answer are excluded.
      </p>
      {error && (
        <p role="alert">
          {error} Your report has not been sent. You can retry.
        </p>
      )}
      <button className="primary" disabled={busy}>
        {busy ? "Sending…" : "Send bug report"}
      </button>
    </form>
  );
}
