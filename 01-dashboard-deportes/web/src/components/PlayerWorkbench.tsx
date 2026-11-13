'use client';

import Link from 'next/link';
import {useEffect,useMemo,useState,useSyncExternalStore,type ReactNode} from 'react';
import {aggregatePlayers,ageAt,metricKeys,metricValue,percentile,similarPlayers,type Aggregate,type Metric,type PlayerData} from '@/lib/player-analytics';
import {pe,fmt,positionLabel} from '@/lib/players-es';
import {parsePersonal,PERSONAL_KEY,togglePersonal,type PersonalState} from '@/lib/personal-state';
import {nationalityLabel} from '@/lib/translate';
import {PlayerPicker} from './PlayerPicker';
import {searchPlayers} from '@/lib/player-browsing';
import {LineupPitch} from './LineupPitch';
import {MatchCards} from './UpcomingMatchCards';

const EVENT='marcador-personal-change';
let memorySnapshot:string|null=null;
let storageUnavailable=false;
function snapshot(){if(storageUnavailable)return memorySnapshot;try{return localStorage.getItem(PERSONAL_KEY);}catch{return memorySnapshot;}}
function subscribe(callback:()=>void){window.addEventListener('storage',callback);window.addEventListener(EVENT,callback);return()=>{window.removeEventListener('storage',callback);window.removeEventListener(EVENT,callback);};}
function usePersonal(){
 const raw=useSyncExternalStore(subscribe,snapshot,()=>null);
 const state=useMemo(()=>parsePersonal(raw),[raw]);
 const [failed,setFailed]=useState(false);
 const update=(fn:(s:PersonalState)=>PersonalState)=>{const next=fn(parsePersonal(snapshot()));memorySnapshot=JSON.stringify(next);try{localStorage.setItem(PERSONAL_KEY,memorySnapshot);storageUnavailable=false;setFailed(false);}catch{storageUnavailable=true;setFailed(true);}window.dispatchEvent(new Event(EVENT));};
 return {state,update,failed};
}
const control='min-h-11 max-w-full rounded-control border border-border-strong bg-card px-3 py-2 text-base text-fg sm:text-sm';
const button='inline-flex min-h-11 items-center justify-center rounded-control border border-border-strong bg-card px-3 py-2 text-sm font-semibold hover:bg-surface-2';
function Field({label,children}:{label:string;children:ReactNode}){return <label className="flex min-w-0 flex-col gap-1.5"><span className="eyebrow">{label}</span>{children}</label>;}
export function PlayerStar({id}:{id:number}){const {state,update,failed}=usePersonal();const selected=state.players.includes(id);return <span><button type="button" className={button} aria-pressed={selected} onClick={()=>update(s=>togglePersonal(s,'players',id))}>{selected?'★':'☆'} {selected?pe.unstar:pe.star}</button>{failed&&<span role="status" className="block text-sm text-loss">{pe.storageError}</span>}</span>;}
export function TeamFollow({id}:{id:number}){const {state,update,failed}=usePersonal();const selected=state.teams.includes(id);return <span><button type="button" className={button} aria-pressed={selected} onClick={()=>update(s=>togglePersonal(s,'teams',id))}>{selected?'★':'☆'} {selected?'Dejar de seguir equipo':'Seguir equipo'}</button>{failed&&<span role="status" className="block text-sm text-loss">{pe.storageError}</span>}</span>;}
export function TeamPlayerStats({data,teamId,base}:{data:PlayerData;teamId:number;base:string}){
 const [sort,setSort]=useState<Metric|'minutes'>('minutes');const {state,update,failed}=usePersonal();
 const rows=aggregatePlayers(data.players,data.appearances,'season',teamId).filter(r=>r.player.teamIds.includes(teamId)||r.teamIds.includes(teamId)).sort((a,b)=>{const av=sort==='minutes'?a.minutes:metricValue(a,sort,false),bv=sort==='minutes'?b.minutes:metricValue(b,sort,false);return av===null?(bv===null?a.player.id-b.player.id:1):bv===null?-1:bv-av||a.player.id-b.player.id;});
 return <><div className="mb-4 flex flex-wrap items-end gap-3"><Field label={pe.order}><select className={control} value={sort} onChange={e=>setSort(e.target.value as Metric|'minutes')}><option value="minutes">{pe.minutes}</option>{metricKeys.map(k=><option key={k} value={k}>{pe.metrics[k]}</option>)}</select></Field><Link className={button} href={`${base}/jugadores?team=${teamId}&min=0`}>Explorar esta plantilla →</Link></div>{failed&&<p role="status">{pe.storageError}</p>}<PlayerTable rows={rows} base={base} teams={data.teams} per90={false} extraMetric={sort==='minutes'?undefined:sort} starred={state.players} onStar={id=>update(s=>togglePersonal(s,'players',id))}/><p className="mt-3 text-xs text-subtle">{pe.coverage}</p></>;
}
export function Coverage({data}:{data:PlayerData}) {
 const finished=data.matches.filter(m=>m.status==='finished').length;
 const covered=new Set(data.appearances.map(a=>a.matchId)).size;
 return <details className="mb-6 rounded-panel border border-border bg-card px-4 py-3 text-sm">
  <summary className="cursor-pointer text-muted"><span className="font-semibold text-accent">Bzzoiro Sports Data</span> · {covered}/{finished} partidos con registros individuales <span className="ml-2 text-xs">Ver cobertura</span></summary>
  <p className="mt-3 max-w-3xl leading-relaxed text-muted">{pe.coverage}</p>
  {data.imported&&<p className="mt-2 text-xs text-subtle">{pe.updated}: {new Date(data.imported).toLocaleString('es-ES',{timeZone:'Europe/Madrid'})}</p>}
 </details>;
}
function Empty(){return <div className="rounded-panel border border-border bg-card p-6"><h2 className="display text-xl font-bold">{pe.empty}</h2><p className="mt-2 text-muted">{pe.setup}</p></div>;}
function PlayerTable({rows,base,teams,per90,starred,onStar,extraMetric}:{rows:Aggregate[];base:string;teams:PlayerData['teams'];per90:boolean;starred:number[];onStar:(id:number)=>void;extraMetric?:Metric}){
 const [limit,setLimit]=useState(50);
 const defaultColumns:Metric[]=['goals','assists','shots','keyPasses','yellow'];
 const columns=extraMetric&&!defaultColumns.includes(extraMetric)?[...defaultColumns,extraMetric]:defaultColumns;
 return <div className="overflow-x-auto rounded-panel border border-border bg-card"><table className="w-full border-collapse text-left text-sm"><caption className="sr-only">{pe.title}</caption><thead className="bg-surface-2"><tr>{[pe.player,pe.team,pe.position,pe.minutes,...columns.map(k=>pe.metrics[k]),pe.star].map((h,i)=><th key={i} scope="col" className="whitespace-nowrap px-3 py-3">{h}</th>)}</tr></thead><tbody>{rows.slice(0,limit).map(r=><tr key={r.player.id} className="border-t border-border hover:bg-surface-2/60"><th scope="row" className="min-w-40 px-3 py-2"><Link className="font-semibold text-accent hover:underline" href={`${base}/jugador/${r.player.id}`}>{r.player.name}</Link></th><td className="min-w-32 px-3 py-2">{[...new Set([...r.teamIds,...r.player.teamIds])].map(id=>teams.find(t=>t.id===id)?.name).filter(Boolean).join(' · ')||pe.missing}</td><td className="whitespace-nowrap px-3 py-2">{positionLabel(r.player.position)}</td><td className="num px-3 py-2 text-right">{fmt(r.minutes,0)}</td>{columns.map(k=><td key={k} className="num px-3 py-2 text-right" title={`${r.coveredMatches[k]}/${r.matches} ${pe.observed}`}>{fmt(metricValue(r,k,per90))}</td>)}<td className="px-3 py-1"><button className={button} aria-label={`${starred.includes(r.player.id)?pe.unstar:pe.star} ${r.player.name}`} aria-pressed={starred.includes(r.player.id)} onClick={()=>onStar(r.player.id)}>{starred.includes(r.player.id)?'★':'☆'}</button></td></tr>)}</tbody></table>{!rows.length&&<p role="status" className="p-5 text-muted">{pe.noResults}</p>}{rows.length>limit&&<button type="button" className={`${button} m-3`} onClick={()=>setLimit(n=>n+50)}>Mostrar más jugadores · {rows.length-limit} restantes</button>}</div>;
}
export function PlayerWorkbench({data,base,today,now,initial={},surface='players'}:{data:PlayerData;base:string;today:string;now:string;initial?:Record<string,string>;surface?:'players'|'following'|'lineup'}){
 const [tab,setTab]=useState(surface==='following'?'favoritos':surface==='lineup'?'once':initial.tab==='comparar'?'comparar':'explorar');
 const [query,setQuery]=useState(initial.q??''),[team,setTeam]=useState(initial.team??''),[position,setPosition]=useState(initial.pos??'');
 const [minimum,setMinimum]=useState(initial.min??'180'),[maxAge,setMaxAge]=useState(initial.age??''),[sort,setSort]=useState<Metric|'minutes'>(Object.hasOwn(pe.metrics,initial.sort??'')?initial.sort as Metric:'minutes');
 const [period,setPeriod]=useState<'season'|'five'>(initial.period==='five'?'five':'season'),[per90,setPer90]=useState(initial.mode==='90');
 const [a,setA]=useState(initial.a??''),[b,setB]=useState(initial.b??'');
 const {state,update,failed}=usePersonal();
 const min=Math.max(0,Number(minimum)||0);
 const rows=useMemo(()=>aggregatePlayers(data.players,data.appearances,period,Number(team)||undefined),[data,period,team]);
 const filtered=rows.filter(r=>searchPlayers([r.player],query).length>0&&(!position||r.player.position===position)&&(!team||r.player.teamIds.includes(Number(team))||r.teamIds.includes(Number(team)))&&r.minutes>=min&&(!maxAge||(ageAt(r.player.birth,today)!==null&&ageAt(r.player.birth,today)!<=Number(maxAge))))
 .sort((a,b)=>{const av=sort==='minutes'?a.minutes:metricValue(a,sort,per90),bv=sort==='minutes'?b.minutes:metricValue(b,sort,per90);return av===null?(bv===null?a.player.id-b.player.id:1):bv===null?-1:bv-av||a.player.name.localeCompare(b.player.name);});
 useEffect(()=>{if(surface!=='players')return;const p=new URLSearchParams();for(const [k,v] of Object.entries({tab,q:query,team,pos:position,min:minimum,age:maxAge,sort,period,mode:per90?'90':'total',a,b})){if(v)p.set(k,v);}window.history.replaceState(window.history.state,'',`${base}/jugadores?${p}`);},[base,tab,query,team,position,minimum,maxAge,sort,period,per90,a,b,surface]);
 const star=(id:number)=>update(s=>togglePersonal(s,'players',id));
 const one=rows.find(r=>r.player.id===Number(a)),two=rows.find(r=>r.player.id===Number(b));
 return <>
  <Coverage data={data}/>
  {surface==='players'&&<nav aria-label={pe.title} className="scroll-row mb-6 flex gap-2">{Object.entries(pe.tabs).filter(([id])=>id==='explorar'||id==='comparar').map(([id,label])=><button type="button" key={id} aria-pressed={tab===id} onClick={()=>setTab(id)} className={`${button} shrink-0 ${tab===id?'!border-accent !bg-accent-soft !text-accent':''}`}>{label}</button>)}</nav>}
  {failed&&<p role="status" className="mb-4 text-loss">{pe.storageError}</p>}
  {(tab==='explorar'||tab==='comparar')&&<>
   <div className="mb-5 grid grid-cols-2 gap-3 rounded-panel border border-border bg-surface-2 p-4 md:grid-cols-4">
    <Field label={pe.period}><select className={control} value={period} onChange={e=>setPeriod(e.target.value as 'season'|'five')}><option value="season">{pe.season}</option><option value="five">{pe.five}</option></select></Field>
    <Field label={pe.mode}><select className={control} value={per90?'90':'total'} onChange={e=>setPer90(e.target.value==='90')}><option value="total">{pe.totals}</option><option value="90">{pe.per90}</option></select></Field>
    <Field label={pe.minMinutes}><input className={control} type="number" min="0" max="10000" step="30" value={minimum} onChange={e=>setMinimum(e.target.value)}/></Field>
    <Field label={pe.team}><select className={control} value={team} onChange={e=>setTeam(e.target.value)}><option value="">{pe.all}</option>{data.teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
   </div><p className="mb-5 max-w-4xl text-xs leading-relaxed text-subtle">{pe.formula}</p>{per90&&min<(period==='five'?90:180)&&<p role="status" className="mb-4 text-sm text-loss">{pe.smallSample}</p>}
  </>}
  {!data.players.length&&tab!=='once'&&tab!=='favoritos'&&tab!=='partidos'?<Empty/>:null}
  {tab==='explorar'&&<>
   <div className="mb-5 grid grid-cols-2 items-end gap-3 md:grid-cols-5"><Field label={pe.search}><input className={control} type="search" value={query} onChange={e=>setQuery(e.target.value)}/></Field><Field label={pe.position}><select className={control} value={position} onChange={e=>setPosition(e.target.value)}><option value="">{pe.all}</option>{Object.entries(pe.positions).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></Field><Field label={pe.maxAge}><input className={control} type="number" min="15" max="60" value={maxAge} onChange={e=>setMaxAge(e.target.value)}/></Field><Field label={pe.order}><select className={control} value={sort} onChange={e=>setSort(e.target.value as Metric|'minutes')}><option value="minutes">{pe.minutes}</option>{metricKeys.map(k=><option key={k} value={k}>{pe.metrics[k]}</option>)}</select></Field><button className={button} onClick={()=>{setQuery('');setTeam('');setPosition('');setMinimum('180');setMaxAge('');setSort('minutes');setPeriod('season');setPer90(false);}}>{pe.reset}</button></div>
   <p role="status" className="mb-3 text-sm text-muted">{filtered.length} jugadores · {data.players.length} en el catálogo · {pe.age}: {today}</p>
   <PlayerTable rows={filtered} base={base} teams={data.teams} per90={per90} extraMetric={sort==='minutes'?undefined:sort} starred={state.players} onStar={star}/>
  </>}
  {tab==='comparar'&&<>
   <div className="mb-5 grid gap-4 md:grid-cols-2"><PlayerPicker label={pe.compareA} players={data.players} teams={data.teams} value={a} onChange={setA}/><PlayerPicker label={pe.compareB} players={data.players} teams={data.teams} value={b} onChange={setB}/></div>
   {!one||!two?<p className="p-5 text-muted">{pe.compareHint}</p>:a===b?<p role="status">{pe.samePlayer}</p>:<Comparison one={one} two={two} per90={per90} cohort={rows} minimum={Math.max(min,period==='five'?90:180)}/>}
  </>}
  {tab==='favoritos'&&<>
    <h2 className="display mb-3 text-2xl font-bold">{pe.favoriteTeams}</h2><p className="mb-4 text-sm text-muted">Sigue tus equipos para reunir aquí sus próximos encuentros.</p><details className="mb-6 rounded-panel border border-border bg-card p-4" open={state.teams.length===0}><summary className="min-h-8 cursor-pointer font-semibold">Gestionar equipos · {data.teams.filter(t=>state.teams.includes(t.id)).length} seguidos en esta liga</summary><div className="mb-8 flex flex-wrap gap-2">{data.teams.map(t=><button key={t.id} className={`${button} ${state.teams.includes(t.id)?'!border-accent !text-accent':''}`} aria-pressed={state.teams.includes(t.id)} onClick={()=>update(s=>togglePersonal(s,'teams',t.id))}>{state.teams.includes(t.id)?'★':'☆'} {t.name}</button>)}</div></details>
    <h2 className="display mb-3 text-2xl font-bold">{pe.favorites}</h2><p className="mb-3 text-sm text-subtle">{pe.savedLocal} Se muestran los jugadores de esta liga.</p>{state.players.length===0?<p className="p-4">{pe.noFavorites}</p>:<PlayerTable rows={rows.filter(r=>state.players.includes(r.player.id))} base={base} teams={data.teams} per90={false} starred={state.players} onStar={star}/>}
    {state.teams.length>0&&<MatchCards data={{...data,matches:data.matches.filter(m=>state.teams.includes(m.homeId)||state.teams.includes(m.awayId))}} base={base} now={now}/>}
  </>}
  {tab==='once'&&<LineupPitch data={data} state={state} update={update}/>}

 </>;
}
function Comparison({one,two,per90,cohort,minimum}:{one:Aggregate;two:Aggregate;per90:boolean;cohort:Aggregate[];minimum:number}){return <><div className="overflow-x-auto rounded-panel border border-border bg-card"><table className="w-full text-left text-sm"><caption className="sr-only">{pe.tabs.comparar}</caption><thead><tr className="bg-surface-2"><th className="p-3">Estadística</th><th className="p-3">{one.player.name}</th><th className="p-3">{two.player.name}</th></tr></thead><tbody><tr><th className="p-3">{pe.minutes}</th><td className="num p-3">{fmt(one.minutes,0)}</td><td className="num p-3">{fmt(two.minutes,0)}</td></tr>{metricKeys.map(k=><tr key={k} className="border-t border-border"><th scope="row" className="p-3">{pe.metrics[k]}</th>{[one,two].map(r=>{const pc=percentile(r,cohort,k,minimum);return <td key={r.player.id} className="num p-3"><strong>{fmt(metricValue(r,k,per90))}</strong><span className="mt-1 block text-xs text-subtle">{r.coveredMatches[k]}/{r.matches} {pe.observed}{pc?` · P${fmt(pc.value,0)} (n=${pc.size})`:''}</span></td>;})}</tr>)}</tbody></table></div><p className="mt-3 text-xs text-subtle">{pe.percentile}</p></>;}
export function PlayerProfile({data,id,base,today}:{data:PlayerData;id:number;base:string;today:string}){
 const [period,setPeriod]=useState<'season'|'five'>('season'),[per90,setPer90]=useState(false);
 const rows=useMemo(()=>aggregatePlayers(data.players,data.appearances,period),[data,period]);const row=rows.find(r=>r.player.id===id);if(!row)return null;
 const log=data.appearances.filter(a=>a.playerId===id&&a.minutes!==null&&a.minutes>0).sort((a,b)=>b.date.localeCompare(a.date));
 const similar=similarPlayers(row,rows,period==='five'?90:180);
 const points=[...log].reverse().reduce<{x:number;y:number}[]>((acc,r)=>[...acc,{x:acc.length+1,y:(acc.at(-1)?.y??0)+(r.metrics.goals??0)+(r.metrics.assists??0)}],[]);
 const total=points.at(-1)?.y??0;
 const allGcaKnown=log.every(a=>a.metrics.goals!=null&&a.metrics.assists!=null);
 return <><div className="mb-6 flex flex-wrap items-center justify-between gap-4"><p className="text-muted">{positionLabel(row.player.position)} · {fmt(ageAt(row.player.birth,today),0)} años · {nationalityLabel(row.player.nationality)??pe.missing}</p><PlayerStar id={id}/></div><Coverage data={data}/><div className="mb-5 flex flex-wrap gap-3"><Field label={pe.period}><select className={control} value={period} onChange={e=>setPeriod(e.target.value as 'season'|'five')}><option value="season">{pe.season}</option><option value="five">{pe.five}</option></select></Field><Field label={pe.mode}><select className={control} value={per90?'90':'total'} onChange={e=>setPer90(e.target.value==='90')}><option value="total">{pe.totals}</option><option value="90">{pe.per90}</option></select></Field><Link className={`${button} self-end`} href={`${base}/jugadores?tab=comparar&a=${id}`}>{pe.tabs.comparar}</Link></div><p className="mb-5 text-sm text-muted">{fmt(row.minutes,0)} minutos · {row.matches} partidos · {row.teamIds.map(id=>data.teams.find(t=>t.id===id)?.name).join(' · ')}</p><div className="mb-8 grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-border bg-border sm:grid-cols-3 lg:grid-cols-5">{metricKeys.map(k=><div key={k} className="bg-card p-4"><p className="eyebrow">{pe.metrics[k]}</p><p className="score my-2 text-3xl">{fmt(metricValue(row,k,per90))}</p><p className="text-xs text-subtle">{row.coveredMatches[k]}/{row.matches} {pe.observed}</p></div>)}</div><p className="mb-8 text-xs text-subtle">{pe.formula}</p>
 {points.length>1&&allGcaKnown&&<section className="mb-8"><h2 className="display mb-3 text-2xl font-bold">{pe.evolution}</h2><svg role="img" aria-label={`${pe.evolution}: ${total}`} viewBox="0 0 600 160" className="max-h-52 w-full rounded-panel border border-border bg-card"><line x1="30" y1="135" x2="580" y2="135" stroke="var(--border-strong)"/><polyline fill="none" stroke="var(--accent)" strokeWidth="3" points={points.map((p,i)=>`${30+i*550/(points.length-1)},${135-p.y*110/Math.max(1,total)}`).join(' ')}/><text x="30" y="152" fontSize="12">1</text><text x="560" y="152" fontSize="12">{points.length} PJ</text><text x="30" y="18" fontSize="12">{total} G+A</text></svg><p className="mt-2 text-xs text-subtle">Acumulado de goles y asistencias de la temporada. Valores exactos en el registro inferior.</p></section>}
 <section className="mb-8"><h2 className="display mb-3 text-2xl font-bold">{pe.similar}</h2><p className="mb-3 text-sm text-muted">{pe.similarity}</p>{similar.length?<ul className="grid gap-3 sm:grid-cols-2">{similar.map(s=><li className="rounded-panel border border-border bg-card p-4" key={s.row.player.id}><Link className="font-semibold text-accent hover:underline" href={`${base}/jugador/${s.row.player.id}`}>{s.row.player.name}</Link><p className="num text-sm">{fmt(s.score,0)}/100 · {s.metrics.map(k=>pe.metrics[k]).join(', ')}</p></li>)}</ul>:<p className="p-4 text-muted">{pe.noSimilar}</p>}</section>
 <h2 className="display mb-3 text-2xl font-bold">{pe.recent}</h2><div className="overflow-x-auto rounded-panel border border-border bg-card"><table className="w-full text-left text-sm"><thead className="bg-surface-2"><tr>{[pe.match,pe.team,pe.minutes,pe.metrics.goals,pe.metrics.assists,pe.metrics.xg].map(h=><th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody>{log.map(r=>{const m=data.matches.find(m=>m.id===r.matchId);return <tr className="border-t border-border" key={r.matchId}><th className="min-w-52 p-3" scope="row"><Link className="text-accent hover:underline" href={`${base}/partido/${r.matchId}`}>{m?`${m.home} · ${m.away}`:r.date.slice(0,10)}</Link><span className="block text-xs font-normal text-subtle">{r.date.slice(0,10)}</span></th><td className="p-3">{data.teams.find(t=>t.id===r.teamId)?.name}</td><td className="num p-3">{fmt(r.minutes,0)}</td>{(['goals','assists','xg'] as Metric[]).map(k=><td key={k} className="num p-3">{fmt(r.metrics[k])}</td>)}</tr>;})}</tbody></table>{!log.length&&<p className="p-4">{pe.empty}</p>}</div></>;
}
