import type { Player, PlayerMatch } from './player-analytics';

export const isLiveMatch = (match: PlayerMatch) => ['live', 'inprogress', 'in_progress'].includes(match.status.toLowerCase());
const isUpcoming = (match: PlayerMatch) => ['upcoming', 'notstarted', 'not_started', 'scheduled', 'timed'].includes(match.status.toLowerCase());

export function searchPlayers(players: Player[], query: string): Player[] {
  const fold = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
  const terms = fold(query).trim().split(/\s+/).filter(Boolean);
  return players.filter(player => terms.every(term => fold(player.name).includes(term)))
    .sort((a, b) => a.name.localeCompare(b.name, 'es') || a.id - b.id);
}

/** Upcoming fixtures are nearest first; history is newest first; season starts in August. */
export function matchViews(matches: PlayerMatch[], now: string) {
  const time = Date.parse(now);
  const chronological = [...matches].filter(m => m.status !== 'replaced')
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date) || a.id - b.id);
  const upcoming = chronological.filter(m => isLiveMatch(m) || (isUpcoming(m) && Date.parse(m.date) >= time))
    .sort((a, b) => Number(isLiveMatch(b)) - Number(isLiveMatch(a)) || Date.parse(a.date) - Date.parse(b.date) || a.id - b.id);
  const results = chronological.filter(m => m.status === 'finished' && Date.parse(m.date) <= time)
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date) || a.id - b.id);
  return { upcoming, results, season: chronological };
}
