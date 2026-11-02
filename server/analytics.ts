export function analyticsSchema(sql: SqlStorage) {
  sql.exec(
    "CREATE TABLE IF NOT EXISTS plays (day TEXT NOT NULL, visitor TEXT NOT NULL, round TEXT NOT NULL, mode TEXT NOT NULL, PRIMARY KEY(day,visitor,round))",
  );
  sql.exec(
    "CREATE TABLE IF NOT EXISTS analytics_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
  );
  sql.exec(
    "INSERT OR IGNORE INTO analytics_meta(key,value) VALUES (?,?)",
    "started",
    new Date().toISOString(),
  );
}
export function analyticsSummary(sql: SqlStorage, today: string) {
  analyticsSchema(sql);
  const cutoff = new Date(Date.parse(today + "T12:00:00Z") - 90 * 86400000)
    .toISOString()
    .slice(0, 10);
  sql.exec("DELETE FROM plays WHERE day < ?", cutoff);
  const rows = sql
    .exec<{
      day: string;
      players: number;
      games: number;
      dailyPlayers: number;
      practicePlayers: number;
    }>(
      `SELECT day, COUNT(DISTINCT visitor) AS players, COUNT(*) AS games,
 COUNT(DISTINCT CASE WHEN mode='daily' THEN visitor END) AS dailyPlayers,
 COUNT(DISTINCT CASE WHEN mode='practice' THEN visitor END) AS practicePlayers
 FROM plays GROUP BY day ORDER BY day DESC`,
    )
    .toArray();
  const history = Array.from({ length: 14 }, (_, i) => {
    const day = new Date(Date.parse(today + "T12:00:00Z") - i * 86400000)
      .toISOString()
      .slice(0, 10);
    return (
      rows.find((r) => r.day === day) || {
        day,
        players: 0,
        games: 0,
        dailyPlayers: 0,
        practicePlayers: 0,
      }
    );
  });
  return {
    today: history[0],
    history,
    started: sql
      .exec<{ value: string }>(
        "SELECT value FROM analytics_meta WHERE key=?",
        "started",
      )
      .one().value,
  };
}
