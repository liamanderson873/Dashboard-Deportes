'use client';

import { useRef, useState } from 'react';
import type { PlayerData } from '@/lib/player-analytics';
import { assignSlot, EMPTY_PERSONAL, SLOTS, type PersonalState } from '@/lib/personal-state';
import { pe, positionLabel } from '@/lib/players-es';
import { PlayerPicker } from './PlayerPicker';

export function LineupPitch({ data, state, update }: {
  data: PlayerData; state: PersonalState; update: (fn: (state: PersonalState) => PersonalState) => void;
}) {
  const [active, setActive] = useState(0);
  const editor = useRef<HTMLHeadingElement>(null);
  const selected = state.eleven[active];
  const eligible = data.players.filter(p => p.position === SLOTS[active] && (!state.eleven.includes(p.id) || p.id === selected));
  const filled = state.eleven.filter(id => id !== null).length;
  return <section className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
    <div>
      <div className="mb-4 flex items-center justify-between gap-3"><h2 className="display text-2xl font-bold">{pe.formation}</h2><span className="mono rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent">{filled}/11</span></div>
      <div className="lineup-pitch relative isolate overflow-hidden rounded-panel border border-accent p-3 sm:p-6">
        <div aria-hidden="true" className="pointer-events-none absolute inset-4 rounded-sm border border-on-ink/30"><div className="absolute inset-x-0 top-1/2 border-t border-on-ink/30"/><div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-on-ink/30"/><div className="absolute inset-x-[30%] top-0 h-12 border border-t-0 border-on-ink/30"/><div className="absolute inset-x-[30%] bottom-0 h-12 border border-b-0 border-on-ink/30"/></div>
        <div className="relative flex min-h-[480px] flex-col justify-between gap-7 py-5">
          {[[8,9,10],[5,6,7],[1,2,3,4],[0]].map((row,index)=><div key={index} className="flex justify-around gap-1">
            {row.map(slot=>{
              const id=state.eleven[slot]; const player=data.players.find(p=>p.id===id);
              return <button key={slot} type="button" aria-pressed={active===slot}
                aria-label={`Plaza ${slot+1}, ${positionLabel(SLOTS[slot])}: ${player?.name??(id?`Jugador ${id}, otra liga`:pe.emptySlot)}`}
                onClick={()=>{setActive(slot);if(window.matchMedia('(max-width: 1023px)').matches){editor.current?.focus({preventScroll:true});editor.current?.scrollIntoView({block:'center'});}}} className={`flex min-h-20 w-1/4 max-w-28 flex-col items-center gap-2 rounded-control px-1 py-2 text-on-ink transition-colors ${active===slot?'bg-ink/20 ring-2 ring-on-ink':'hover:bg-on-ink/10'}`}>
                <span className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-bold ${id?'border-on-ink bg-on-ink text-accent':'border-dashed border-on-ink/70'}`}>{id?slot+1:'+'}</span>
                <span className="line-clamp-2 text-xs font-semibold leading-snug">{player?.name??(id?`Jugador #${id}`:positionLabel(SLOTS[slot]))}</span>
              </button>;
            })}
          </div>)}
        </div>
      </div>
    </div>
    <div className="rounded-panel border border-border bg-card p-5 lg:mt-12">
      <p className="eyebrow mb-2">Personaliza tu alineación</p>
      <h3 ref={editor} tabIndex={-1} className="display mb-3 scroll-mt-28 text-2xl font-bold">Plaza {active+1} · {positionLabel(SLOTS[active])}</h3>
      <p className="mb-5 text-sm leading-relaxed text-muted">Selecciona una plaza del campo y busca un nombre. Cada jugador ocupa una sola posición.</p>
      <PlayerPicker label="Buscar jugador para esta plaza" players={eligible} teams={data.teams} value={String(selected??'')} onChange={value=>{const id=Number(value)||null;update(s=>assignSlot(s,active,id,data.players.find(p=>p.id===id)?.position??null));}}/>
      {selected&&<button type="button" className="mt-4 min-h-11 text-sm font-semibold text-loss hover:underline" onClick={()=>update(s=>assignSlot(s,active,null,null))}>{pe.remove} jugador de esta plaza</button>}
      <p className="mt-6 border-t border-border pt-4 text-xs leading-relaxed text-subtle">{pe.savedLocal} Puedes combinar jugadores de distintas ligas.</p>
      <button type="button" className="mt-4 min-h-11 rounded-control border border-border-strong px-3 text-sm font-semibold hover:bg-surface-2" onClick={()=>{if(window.confirm('¿Vaciar las 11 plazas de tu once?'))update(s=>({...s,eleven:[...EMPTY_PERSONAL.eleven]}));}}>{pe.clearEleven}</button>
    </div>
  </section>;
}
