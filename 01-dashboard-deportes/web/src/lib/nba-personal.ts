import type { NbaPlayer } from "./nba";
export const NBA_PERSONAL_KEY = "marcador.nba.personal.v1";
export const NBA_SLOTS = ["G", "G", "F", "F", "C"] as const;
export type NbaPersonal = {
  version: 1;
  players: number[];
  teams: number[];
  five: (number | null)[];
};
export const EMPTY_NBA: NbaPersonal = {
  version: 1,
  players: [],
  teams: [],
  five: Array(5).fill(null),
};
const valid = (v: unknown): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v > 0;
export function parseNbaPersonal(raw: string | null): NbaPersonal {
  try {
    const data = JSON.parse(raw ?? "null");
    if (!data || data.version !== 1) return EMPTY_NBA;
    const ids = (v: unknown) =>
      Array.isArray(v) ? [...new Set(v.filter(valid))].slice(0, 1000) : [];
    const seen = new Set<number>();
    const five = NBA_SLOTS.map((_, i) => {
      const id = data.five?.[i];
      if (!valid(id) || seen.has(id)) return null;
      seen.add(id);
      return id;
    });
    return {
      version: 1,
      players: ids(data.players),
      teams: ids(data.teams),
      five,
    };
  } catch {
    return EMPTY_NBA;
  }
}
export function assignNbaSlot(
  state: NbaPersonal,
  slot: number,
  player: NbaPlayer | null,
): NbaPersonal {
  if (!Number.isInteger(slot) || slot < 0 || slot >= 5) return state;
  if (
    player &&
    (!player.position?.includes(NBA_SLOTS[slot]) ||
      state.five.some((id, i) => i !== slot && id === player.id))
  )
    return state;
  return {
    ...state,
    five: state.five.map((id, i) => (i === slot ? (player?.id ?? null) : id)),
  };
}
