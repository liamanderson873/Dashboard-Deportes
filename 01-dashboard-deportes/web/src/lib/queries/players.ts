import type { Sql } from 'postgres';
import { normalizeMetrics, numberOrNull, type PlayerData } from '@/lib/player-analytics';
export const emptyPlayerData=():PlayerData=>({ready:false,players:[],teams:[],appearances:[],matches:[],imported:null});
type RawRow = Record<string, unknown>;
const iso=(v:unknown):string=>v instanceof Date?v.toISOString():String(v??'');
/** Reads only locally imported data. Never makes a provider request. */
export async function getPlayerData(sql:Sql,competition:string,season:number):Promise<PlayerData>{
 const [schema]=await sql`SELECT to_regclass('public.bsd_player_matches') AS present`;
 if(!schema?.present)return emptyPlayerData();
 const [teams,players,appearances,matches]=await Promise.all([
  sql`SELECT DISTINCT t.id,t.name,mp.local_team_id FROM bsd_teams t
    LEFT JOIN bsd_team_map mp ON mp.provider_team_id=t.id WHERE t.id IN (
      SELECT team_id FROM bsd_squads WHERE competition=${competition} AND season=${season}
      UNION SELECT home_team_id FROM bsd_matches WHERE competition=${competition} AND season=${season}
      UNION SELECT away_team_id FROM bsd_matches WHERE competition=${competition} AND season=${season}) ORDER BY t.name`,
  sql`SELECT p.id,p.name,p.position,p.date_of_birth,p.nationality FROM bsd_players p WHERE p.id IN (
    SELECT player_id FROM bsd_squads WHERE competition=${competition} AND season=${season}
    UNION SELECT pm.player_id FROM bsd_player_matches pm JOIN bsd_matches m ON m.id=pm.match_id
    WHERE m.competition=${competition} AND m.season=${season}) ORDER BY p.name`,
  sql`SELECT pm.match_id,pm.player_id,pm.team_id,pm.minutes,pm.metrics,m.utc_date FROM bsd_player_matches pm
    JOIN bsd_matches m ON m.id=pm.match_id WHERE m.competition=${competition} AND m.season=${season}
    AND m.status='finished' AND m.utc_date<=now() ORDER BY m.utc_date DESC,m.id DESC`,
  sql`SELECT m.id,m.home_team_id,m.away_team_id,h.name AS home,a.name AS away,m.utc_date,m.status,m.home_goals,m.away_goals,m.imported_at
    FROM bsd_matches m JOIN bsd_teams h ON h.id=m.home_team_id JOIN bsd_teams a ON a.id=m.away_team_id
    WHERE m.competition=${competition} AND m.season=${season} ORDER BY m.utc_date DESC,m.id DESC`,
 ]);
 const squads=await sql`SELECT team_id,player_id FROM bsd_squads WHERE competition=${competition} AND season=${season}`;
 const memberships=new Map<number,Set<number>>();
 for(const r of [...squads,...appearances]){const id=Number(r.player_id);if(!memberships.has(id))memberships.set(id,new Set());memberships.get(id)!.add(Number(r.team_id));}
 return {ready:true,
  teams:teams.map(r=>({id:Number(r.id),name:String(r.name),localId:r.local_team_id==null?null:Number(r.local_team_id)})),
  players:players.map(r=>({id:Number(r.id),name:String(r.name),position:r.position==null?null:String(r.position),birth:r.date_of_birth?iso(r.date_of_birth).slice(0,10):null,nationality:r.nationality==null?null:String(r.nationality),teamIds:[...(memberships.get(Number(r.id))??[])]})),
  appearances:appearances.map(r=>({matchId:Number(r.match_id),playerId:Number(r.player_id),teamId:Number(r.team_id),date:iso(r.utc_date),minutes:numberOrNull(r.minutes),metrics:normalizeMetrics((r.metrics??{}) as RawRow)})),
  matches:matches.map(r=>({id:Number(r.id),homeId:Number(r.home_team_id),awayId:Number(r.away_team_id),home:String(r.home),away:String(r.away),date:iso(r.utc_date),status:String(r.status),homeGoals:r.home_goals==null?null:Number(r.home_goals),awayGoals:r.away_goals==null?null:Number(r.away_goals),imported:r.imported_at?iso(r.imported_at):null})),
  imported:matches.map(r=>r.imported_at?iso(r.imported_at):null).filter((v):v is string=>v!==null).sort().at(-1)??null,
 };
}
export type MatchEnrichment={lineups:Record<string,unknown>;stats:Record<string,unknown>;incidents:Record<string,unknown>};
export async function getMatchEnrichment(sql:Sql,competition:string,season:number,id:number):Promise<MatchEnrichment|null>{
 const [schema]=await sql`SELECT to_regclass('public.bsd_matches') AS present`;if(!schema?.present)return null;
 const [r]=await sql`SELECT lineups,stats,incidents FROM bsd_matches WHERE id=${id} AND competition=${competition} AND season=${season}`;
 return r?{lineups:r.lineups??{},stats:r.stats??{},incidents:r.incidents??{}}:null;
}
export async function getProviderTeamId(sql:Sql,localId:number):Promise<number|null>{
 const [schema]=await sql`SELECT to_regclass('public.bsd_team_map') AS present`;if(!schema?.present)return null;
 const [r]=await sql`SELECT provider_team_id FROM bsd_team_map WHERE local_team_id=${localId}`;
 return r?Number(r.provider_team_id):null;
}
/** Explicit ID mapping + identical teams/date, never a fuzzy match during rendering. */
export async function getEnrichedMatchLinks(sql:Sql,competition:string,season:number):Promise<Record<number,number>>{
 const [schema]=await sql`SELECT to_regclass('public.bsd_team_map') AS present`;if(!schema?.present)return {};
 const rows=await sql`SELECT m.id AS local_id,b.id AS provider_id FROM matches m
 JOIN bsd_team_map h ON h.local_team_id=m.home_team_id JOIN bsd_team_map a ON a.local_team_id=m.away_team_id
 JOIN bsd_matches b ON b.home_team_id=h.provider_team_id AND b.away_team_id=a.provider_team_id
 AND b.competition=m.competition AND b.season=m.season AND b.utc_date::date=m.utc_date::date
 WHERE m.competition=${competition} AND m.season=${season}`;
 const grouped=new Map<number,number[]>();for(const r of rows){const id=Number(r.local_id);grouped.set(id,[...(grouped.get(id)??[]),Number(r.provider_id)]);}
 return Object.fromEntries([...grouped].filter(([,ids])=>ids.length===1).map(([id,ids])=>[id,ids[0]]));
}
