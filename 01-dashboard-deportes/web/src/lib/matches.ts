import { es } from "@/lib/es";

export type TeamRef = {
  id: number;
  name: string;
  shortName: string;
  tla: string | null;
  crest: string | null;
};

export type MatchRow = {
  id: number;
  matchday: number | null;
  utcDate: Date;
  status: string;
  home: TeamRef;
  away: TeamRef;
  homeGoals: number | null;
  awayGoals: number | null;
  homeHtGoals: number | null;
  awayHtGoals: number | null;
};

const COUNTED = new Set(["FINISHED", "AWARDED"]);

export function isPlayed(m: MatchRow): boolean {
  return COUNTED.has(m.status) && m.homeGoals !== null && m.awayGoals !== null;
}

/** Spanish label for a status; `null` for a normal finished match. */
export function statusLabel(status: string): string | null {
  if (status === "FINISHED") return null;
  return es.results.statuses[status] ?? status;
}

const TZ = "Europe/Madrid";

const dateFormat = new Intl.DateTimeFormat("es-ES", {
  timeZone: TZ,
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const timeFormat = new Intl.DateTimeFormat("es-ES", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "sáb, 17 ago 2024" in Madrid time. */
export function formatMatchDate(d: Date): string {
  const parts = Object.fromEntries(
    dateFormat.formatToParts(d).map((p) => [p.type, p.value]),
  );
  const month = (parts.month ?? "").replace(".", "");
  return `${parts.weekday}, ${parts.day} ${month} ${parts.year}`;
}

/** "21:30" in Madrid time. */
export function formatMatchTime(d: Date): string {
  return timeFormat.format(d);
}

export function groupByDay(matches: MatchRow[]): { day: string; matches: MatchRow[] }[] {
  const groups: { day: string; matches: MatchRow[] }[] = [];
  for (const m of matches) {
    const day = formatMatchDate(m.utcDate);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.matches.push(m);
    else groups.push({ day, matches: [m] });
  }
  return groups;
}

export function parseMatchday(raw: string): number | null {
  if (!/^\d{1,2}$/.test(raw)) return null;
  const n = Number(raw);
  return n >= 1 && n <= 99 ? n : null;
}
