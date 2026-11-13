import { describe, expect, it } from 'vitest';
import { matchViews, searchPlayers } from './player-browsing';
import type { Player, PlayerMatch } from './player-analytics';

const player = (id: number, name: string): Player => ({ id, name, position: 'F', birth: null, nationality: null, teamIds: [] });
const match = (id: number, date: string, status = 'upcoming'): PlayerMatch => ({ id, date, status, homeId: 1, awayId: 2, home: 'A', away: 'B', homeGoals: null, awayGoals: null, imported: null });
const now = '2026-11-13T12:00:00Z';

describe('player discovery and match navigation', () => {
  it('finds names without accents, regardless of case or token order', () => {
    const players = [player(1, 'Julián Álvarez'), player(2, 'Lamine Yamal')];
    expect(searchPlayers(players, '  ALVAREZ julian ').map(p => p.id)).toEqual([1]);
    expect(searchPlayers(players, 'yama').map(p => p.id)).toEqual([2]);
    expect(searchPlayers(players, 'inexistente')).toEqual([]);
  });
  it('puts the next fixture first and ignores overdue, cancelled and postponed fixtures', () => {
    const groups = matchViews([
      match(4, '2027-05-01T12:00:00Z','notstarted'), match(2, '2026-11-21T12:00:00Z'),
      match(3, '2026-11-22T12:00:00Z','not_started'), match(1, '2026-11-12T12:00:00Z'),
      match(5, '2026-11-14T12:00:00Z', 'postponed'), match(6, '2026-11-14T12:00:00Z', 'cancelled'),
    ], now);
    expect(groups.upcoming.map(m => m.id)).toEqual([2, 3, 4]);
  });
  it('prioritizes live games and offers chronological season and newest results without mutating the input', () => {
    const matches = [match(3, '2026-11-14T12:00:00Z'), match(1, '2026-08-20T12:00:00Z', 'finished'), match(2, '2026-11-08T12:00:00Z', 'finished'), match(4, '2026-11-13T11:30:00Z', 'live')];
    const groups = matchViews(matches, now);
    expect(groups.upcoming.map(m => m.id)).toEqual([4, 3]);
    expect(groups.results.map(m => m.id)).toEqual([2, 1]);
    expect(groups.season.map(m => m.id)).toEqual([1, 2, 4, 3]);
    expect(matches.map(m => m.id)).toEqual([3, 1, 2, 4]);
  });
});
