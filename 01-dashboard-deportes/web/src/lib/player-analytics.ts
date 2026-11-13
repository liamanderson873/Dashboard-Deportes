/** Normalized BSD data. IDs in this module never refer to football-data.org. */
export const METRICS = {
  goals: "goals", assists: "goal_assist", shots: "total_shots",
  shotsOnTarget: "shots_on_target", passes: "total_pass", keyPasses: "key_pass",
  tackles: "total_tackle", interceptions: "interception", dribbles: "won_contest",
  duelsWon: "duel_won", yellow: "yellow_card", red: "red_card", saves: "saves",
  xg: "expected_goals", xa: "expected_assists",
} as const;
export type Metric = keyof typeof METRICS;
export type Player = { id: number; name: string; position: string | null; birth: string | null; nationality: string | null; teamIds: number[] };
export type PlayerTeam = { id: number; name: string; localId: number | null };
export type Appearance = { matchId: number; playerId: number; teamId: number; date: string; minutes: number | null; metrics: Partial<Record<Metric, number | null>> };
export type PlayerMatch = { id: number; homeId: number; awayId: number; home: string; away: string; date: string; status: string; homeGoals: number | null; awayGoals: number | null; imported: string | null };
export type PlayerData = { ready: boolean; players: Player[]; teams: PlayerTeam[]; appearances: Appearance[]; matches: PlayerMatch[]; imported: string | null };
export type Aggregate = { player: Player; minutes: number; matches: number; teamIds: number[]; totals: Record<Metric, number | null>; coveredMinutes: Record<Metric, number>; coveredMatches: Record<Metric, number> };
export const metricKeys = Object.keys(METRICS) as Metric[];
export function numberOrNull(v: unknown): number | null {
  if (typeof v !== "number" && typeof v !== "string") return null;
  if (typeof v === "string" && !v.trim()) return null;
  const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : null;
}
export function normalizeMetrics(raw: Record<string, unknown>): Appearance["metrics"] {
  return Object.fromEntries(metricKeys.map(k => [k, numberOrNull(raw[METRICS[k]])]));
}
export function aggregatePlayers(players: Player[], appearances: Appearance[], window: "season" | "five" = "season", teamId?: number): Aggregate[] {
  return players.map(player => {
    const seen = new Set<number>();
    let rows = appearances.filter(a => a.playerId === player.id && (!teamId || a.teamId === teamId) && a.minutes !== null && a.minutes > 0)
      .sort((a,b) => b.date.localeCompare(a.date) || b.matchId-a.matchId)
      .filter(a => { if (seen.has(a.matchId)) return false; seen.add(a.matchId); return true; });
    if (window === "five") rows = rows.slice(0,5);
    const totals = {} as Aggregate["totals"], coveredMinutes = {} as Aggregate["coveredMinutes"], coveredMatches = {} as Aggregate["coveredMatches"];
    for (const key of metricKeys) {
      const known = rows.filter(r => r.metrics[key] !== null && r.metrics[key] !== undefined);
      totals[key] = known.length ? known.reduce((s,r) => s + r.metrics[key]!,0) : null;
      coveredMinutes[key] = known.reduce((s,r) => s + r.minutes!,0);
      coveredMatches[key] = known.length;
    }
    return { player, minutes: rows.reduce((s,r) => s+r.minutes!,0), matches: rows.length,
      teamIds: [...new Set(rows.map(r=>r.teamId))], totals, coveredMinutes, coveredMatches };
  });
}
export function metricValue(row: Aggregate, metric: Metric, per90: boolean): number | null {
  const value = row.totals[metric];
  if (value === null) return null;
  return per90 ? (row.coveredMinutes[metric] > 0 ? value * 90 / row.coveredMinutes[metric] : null) : value;
}
export function ageAt(birth: string | null, on: string): number | null {
  if (!birth || !/^\d{4}-\d{2}-\d{2}$/.test(birth)) return null;
  const [y,m,d] = birth.split("-").map(Number), [oy,om,od] = on.slice(0,10).split("-").map(Number);
  const age=oy-y-(om<m || (om===m && od<d) ? 1 : 0);
  return Number.isFinite(age) && age>=0 && age<100 ? age : null;
}
/** Midrank percentiles within a same-position eligible cohort; a singleton has no rank. */
export function percentile(row: Aggregate, cohort: Aggregate[], metric: Metric, minMinutes=180): {value: number; size: number} | null {
  const pool=cohort.filter(r=>r.player.position===row.player.position && r.minutes>=minMinutes && r.coveredMinutes[metric]>=r.minutes*0.75);
  const value=metricValue(row,metric,true);
  if (!row.player.position || value===null || row.minutes<minMinutes || row.coveredMinutes[metric]<row.minutes*0.75 || pool.length<2) return null;
  const values=pool.map(r=>metricValue(r,metric,true)).filter((v):v is number=>v!==null);
  if(values.length<2)return null;
  const below=values.filter(v=>v<value).length, equal=values.filter(v=>v===value).length;
  return {value:100*(below+(equal-1)/2)/(values.length-1),size:values.length};
}
/** Standardized RMS distance, >=3 common metrics with >=75% minutes coverage. */
export function similarPlayers(target: Aggregate, cohort: Aggregate[], minMinutes=180): {row: Aggregate; score: number; metrics: Metric[]}[] {
  if (!target.player.position || target.minutes<minMinutes)return [];
  const pool=cohort.filter(r=>r.player.position===target.player.position && r.minutes>=minMinutes);
  const keys: Metric[]=target.player.position==='G' ? ['saves','passes','keyPasses','interceptions'] : ['goals','assists','shots','keyPasses','tackles','interceptions','dribbles','duelsWon'];
  const deviation = new Map<Metric,number>();
  for(const k of keys){const v=pool.filter(r=>r.coveredMinutes[k]>=r.minutes*.75).map(r=>metricValue(r,k,true)).filter((v):v is number=>v!==null);if(v.length<3)continue;const mean=v.reduce((s,x)=>s+x,0)/v.length;const sd=Math.sqrt(v.reduce((s,x)=>s+(x-mean)**2,0)/v.length);if(sd>0)deviation.set(k,sd);}
  return pool.filter(r=>r.player.id!==target.player.id).flatMap(row=>{
    const metrics=keys.filter(k=>deviation.has(k) && target.coveredMinutes[k]>=target.minutes*.75 && row.coveredMinutes[k]>=row.minutes*.75 && metricValue(target,k,true)!==null && metricValue(row,k,true)!==null);
    if(metrics.length<3)return [];
    const distance=Math.sqrt(metrics.reduce((s,k)=>s+((metricValue(target,k,true)!-metricValue(row,k,true)!)/deviation.get(k)!)**2,0)/metrics.length);
    return [{row,score:100/(1+distance),metrics}];
  }).sort((a,b)=>b.score-a.score || a.row.player.id-b.row.player.id).slice(0,5);
}
