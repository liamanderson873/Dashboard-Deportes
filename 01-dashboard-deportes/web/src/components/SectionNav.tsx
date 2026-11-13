import Link from 'next/link';
import { es } from '@/lib/es';
import { primarySection, sectionHref, type SectionId } from '@/lib/sections';
import { NavIcon } from './NavIcon';

const primary = [
  { id: 'liga', section: 'clasificacion', label: 'Liga' },
  { id: 'partidos', section: 'partidos', label: 'Partidos' },
  { id: 'jugadores', section: 'jugadores', label: 'Jugadores' },
  { id: 'seguimiento', section: 'seguimiento', label: 'Seguimiento' },
  { id: 'mi-once', section: 'mi-once', label: 'Mi once' },
] as const;

export function SectionNav({ slug, season, active }: { slug: string; season: number; active: SectionId | null }) {
  const current = primarySection(active);
  const secondary: SectionId[] = current === 'liga'
    ? ['clasificacion', 'goleadores', 'comparar']
    : current === 'partidos' ? ['partidos', 'resultados'] : [];
  return <>
    <nav aria-label={es.nav.sections} className="rounded-panel border border-border bg-card p-1.5 shadow-sm">
      <ul className="m-0 grid list-none grid-cols-5 gap-1 p-0">
        {primary.map(item => <li key={item.id} className="min-w-0">
          <Link href={sectionHref(slug, season, item.section)} aria-current={current === item.id ? 'location' : undefined}
            className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-control px-0.5 py-2 text-[0.6875rem] font-semibold transition-colors sm:min-h-12 sm:flex-row sm:gap-2 sm:px-3 sm:text-sm ${current === item.id ? 'bg-ink text-on-ink' : 'text-muted hover:bg-surface-2 hover:text-fg'}`}>
            <NavIcon name={item.id}/><span>{item.label}</span>
          </Link>
        </li>)}
      </ul>
    </nav>
    {!!secondary.length && <nav aria-label="Vistas de la sección" className="mt-2 border-b border-border">
      <ul className="m-0 flex list-none gap-5 p-0">
        {secondary.map(id => <li key={id}><Link href={sectionHref(slug, season, id)}
          aria-current={active === id ? 'page' : undefined}
          className={`inline-flex min-h-11 items-center border-b-2 text-sm font-medium ${active === id ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-fg'}`}>
          {id === 'partidos' ? 'Calendario' : id === 'resultados' ? 'Por jornada' : id === 'comparar' ? 'Comparar equipos' : es.sections[id]}
        </Link></li>)}
      </ul>
    </nav>}
  </>;
}
