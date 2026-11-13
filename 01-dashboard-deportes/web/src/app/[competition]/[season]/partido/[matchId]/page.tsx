import Link from 'next/link';
import {notFound} from 'next/navigation';
import {LeagueHeader} from '@/components/LeagueHeader';
import {MatchCentre} from '@/components/MatchCentre';
import {getSql} from '@/lib/db';
import {loadLeagueContext} from '@/lib/league-context';
import {getMatchEnrichment,getPlayerData} from '@/lib/queries/players';
import {resolveRoute} from '@/lib/route-params';
import {pe} from '@/lib/players-es';
export const dynamic='force-dynamic';
export default async function MatchPage({params}:{params:Promise<{competition:string;season:string;matchId:string}>}){
 const {competition,season,matchId}=await params,route=resolveRoute(competition,season);if(!route||!/^\d{1,12}$/.test(matchId))notFound();
 const sql=getSql();const [context,data,enrichment]=await Promise.all([loadLeagueContext(sql,competition,season),getPlayerData(sql,route.competition.code,route.season),getMatchEnrichment(sql,route.competition.code,route.season,Number(matchId))]);const match=data.matches.find(m=>m.id===Number(matchId));if(!match||!enrichment)notFound();
 const base=`/${context.competition.slug}/${context.season}`;
 return <><LeagueHeader context={context} section="partidos" title={pe.tabs.partidos} subtitle={`${context.competition.name} · ${context.season}-${String(context.season+1).slice(-2)}`}/><Link className="mb-5 inline-flex min-h-11 items-center text-sm font-semibold text-accent hover:underline" href={`${base}/partidos`}>← {pe.tabs.partidos}</Link><MatchCentre match={match} data={{...data,appearances:data.appearances.filter(a=>a.matchId===match.id)}} enrichment={enrichment} base={base}/></>;
}
