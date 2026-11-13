import Link from 'next/link';
import {notFound} from 'next/navigation';
import {LeagueHeader} from '@/components/LeagueHeader';
import {PlayerProfile} from '@/components/PlayerWorkbench';
import {getSql} from '@/lib/db';
import {loadLeagueContext} from '@/lib/league-context';
import {getPlayerData} from '@/lib/queries/players';
import {resolveRoute} from '@/lib/route-params';
import {pe} from '@/lib/players-es';
export const dynamic='force-dynamic';
export default async function PlayerPage({params}:{params:Promise<{competition:string;season:string;playerId:string}>}){
 const {competition,season,playerId}=await params,route=resolveRoute(competition,season);if(!route||!/^\d{1,12}$/.test(playerId))notFound();
 const sql=getSql();const [context,data]=await Promise.all([loadLeagueContext(sql,competition,season),getPlayerData(sql,route.competition.code,route.season)]);const player=data.players.find(p=>p.id===Number(playerId));if(!player)notFound();
 const base=`/${context.competition.slug}/${context.season}`;
 return <><LeagueHeader context={context} section="jugadores" title={player.name} subtitle={`${context.competition.name} · ${context.season}-${String(context.season+1).slice(-2)}`}/><Link className="mb-5 inline-flex min-h-11 items-center text-sm font-semibold text-accent hover:underline" href={`${base}/jugadores`}>← {pe.back}</Link><PlayerProfile data={data} id={player.id} base={base} today={new Date().toISOString().slice(0,10)}/></>;
}
