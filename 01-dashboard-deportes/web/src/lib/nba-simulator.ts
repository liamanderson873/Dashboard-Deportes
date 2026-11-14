/** Deterministic Monte Carlo. Hypothetical fixtures never enter nba_games. */
export type Explanation = {
  intercept: number;
  logit: number;
  probability: number;
  terms: { feature: string; value: number; contribution: number }[];
};
export type SimTeam = {
  id: number;
  name: string;
  abbreviation: string;
  conference: string;
  division: string;
  priorPct: number;
  lastDate: string;
};
export type SimGame = {
  id: string;
  date: string;
  homeId: number;
  awayId: number;
  homePts: number | null;
  awayPts: number | null;
  status: string;
  overtime: boolean;
  probability?: number;
  margin?: number;
  explanation?: Explanation;
};
export type SimConfig = {
  version: number;
  season: number;
  created: string;
  cutoff: string;
  modelVersion: string;
  teams: SimTeam[];
  games: SimGame[];
  matrices: Record<string, number[][]>;
  cup: {
    groups: { name: string; conference: string; teamIds: number[] }[];
    gameIds: string[];
    source: string;
  } | null;
  marginSD: number;
  totalMean: number;
  totalSD: number;
  overtimeRate?: number;
  marginReport: {
    test_season: number;
    n: number;
    mae: number;
    rmse: number;
    baseline_mae: number;
  };
};
export type BracketMatch = {
  stage: string;
  conference: string;
  homeId: number;
  awayId: number;
  probability: number;
  winner: number;
  homeWins?: number;
  awayWins?: number;
};
export type SimRow = {
  teamId: number;
  wins: number;
  low: number;
  high: number;
  direct: number;
  playin: number;
  playoffs: number;
  round2: number;
  conferenceFinal: number;
  final: number;
  champion: number;
  cupQualify: number;
  cupSemifinal: number;
  cupFinal: number;
  cupChampion: number;
};
export type GroupRow = {
  teamId: number;
  played: number;
  wins: number;
  difference: number;
  points: number;
};
export type SimResult = {
  runs: number;
  seed: number;
  modelVersion: string;
  cutoff: string;
  rows: SimRow[];
  playoffBracket: BracketMatch[];
  cupBracket: BracketMatch[];
  cupGroups: { name: string; rows: GroupRow[] }[];
  exampleStandings: { conference: string; teamIds: number[] }[];
  syntheticGames: { homeId: number; awayId: number; stage: string }[];
  scheduledGames: number;
  completedGames: number;
  gamesPerTeam: number;
  scenario: Record<string, number>;
  overtimeIncomplete: number;
  generatedAt: string;
  marginReport: SimConfig["marginReport"];
};
export function randomSeed(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
type State = {
  wins: number[];
  played: number[];
  head: number[][];
  meetings: number[][];
  difference: number[];
  points: number[];
};
const emptyState = (): State => ({
  wins: Array(30).fill(0),
  played: Array(30).fill(0),
  head: Array.from({ length: 30 }, () => Array(30).fill(0)),
  meetings: Array.from({ length: 30 }, () => Array(30).fill(0)),
  difference: Array(30).fill(0),
  points: Array(30).fill(0),
});
function apply(
  s: State,
  h: number,
  a: number,
  hp: number,
  ap: number,
  ot = false,
) {
  s.played[h]++;
  s.played[a]++;
  s.meetings[h][a]++;
  s.meetings[a][h]++;
  const w = hp > ap ? h : a,
    l = w === h ? a : h;
  s.wins[w]++;
  s.head[w][l]++;
  s.difference[h] += ot ? 0 : hp - ap;
  s.difference[a] += ot ? 0 : ap - hp;
  s.points[h] += hp;
  s.points[a] += ap;
}
function gaussian(rng: () => number) {
  return (
    Math.sqrt(-2 * Math.log(Math.max(rng(), 1e-10))) *
    Math.cos(2 * Math.PI * rng())
  );
}
function drawScore(
  homeWins: boolean,
  mean: number,
  config: SimConfig,
  seed: number,
): [number, number, boolean, number, number] {
  const rng = randomSeed(seed);
  let margin = 0;
  for (let n = 0; n < 100; n++) {
    margin = mean + gaussian(rng) * config.marginSD;
    if (margin > 0 === homeWins) break;
  }
  const delta = Math.max(1, Math.min(65, Math.round(Math.abs(margin))));
  const total = Math.max(
    120,
    Math.min(
      320,
      Math.round(config.totalMean + gaussian(rng) * config.totalSD),
    ),
  );
  const loser = Math.max(40, Math.round((total - delta) / 2)),
    ot = rng() < (config.overtimeRate ?? 0);
  if (ot) {
    const regulation = Math.max(60, Math.round(total / 2) - 5),
      extra = 5 + Math.floor(rng() * 9),
      winnerExtra = extra + Math.min(delta, 12);
    return homeWins
      ? [
          regulation + winnerExtra,
          regulation + extra,
          true,
          regulation,
          regulation,
        ]
      : [
          regulation + extra,
          regulation + winnerExtra,
          true,
          regulation,
          regulation,
        ];
  }
  return homeWins
    ? [loser + delta, loser, false, loser + delta, loser]
    : [loser, loser + delta, false, loser, loser + delta];
}
function percentage(s: State, t: number, against: number[]) {
  const games = against.reduce((n, o) => n + s.meetings[t][o], 0);
  return games ? against.reduce((n, o) => n + s.head[t][o], 0) / games : 0;
}
/** Restart criteria after partial separation; a two-team remainder uses two-team rules. */
export function breakTie(
  tied: number[],
  criteria: (group: number[]) => ((t: number) => number)[],
  rng: () => number,
): number[] {
  if (tied.length < 2) return [...tied];
  for (const criterion of criteria(tied)) {
    const groups = new Map<string, number[]>();
    for (const t of tied) {
      const key = criterion(t).toFixed(10);
      groups.set(key, [...(groups.get(key) ?? []), t]);
    }
    if (groups.size > 1)
      return [...groups]
        .sort((a, b) => Number(b[0]) - Number(a[0]))
        .flatMap(([, g]) => breakTie(g, criteria, rng));
  }
  return tied
    .map((t) => ({ t, r: rng() }))
    .sort((a, b) => b.r - a.r)
    .map((v) => v.t);
}
function rankByRecord(
  members: number[],
  s: State,
  tie: (group: number[]) => number[],
) {
  const buckets = new Map<string, number[]>();
  for (const t of members) {
    const key = (s.wins[t] / Math.max(1, s.played[t])).toFixed(10);
    buckets.set(key, [...(buckets.get(key) ?? []), t]);
  }
  return [...buckets]
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .flatMap(([, g]) => tie(g));
}
export function rankConference(
  members: number[],
  s: State,
  teams: SimTeam[],
  rng: () => number,
): number[] {
  const all = teams.map((_, i) => i),
    divisionWinners = new Set<number>();
  const eligible = new Set<number>();
  for (const c of ["Este", "Oeste"]) {
    const pool = all.filter((t) => teams[t].conference === c);
    const rates = pool
      .map((t) => s.wins[t] / Math.max(1, s.played[t]))
      .sort((a, b) => b - a);
    for (const t of pool)
      if (s.wins[t] / Math.max(1, s.played[t]) >= rates[9]) eligible.add(t);
  }
  const criteria = (divisionFlag: boolean) => (group: number[]) => {
    const sameDivision = group.every(
      (t) => teams[t].division === teams[group[0]].division,
    );
    const h2h = (t: number) =>
      percentage(
        s,
        t,
        group.filter((o) => o !== t),
      );
    const division = (t: number) =>
      divisionFlag && divisionWinners.has(t) ? 1 : 0;
    const conference = (t: number) =>
      percentage(
        s,
        t,
        all.filter((o) => teams[o].conference === teams[t].conference),
      );
    const divisional = (t: number) =>
      sameDivision
        ? percentage(
            s,
            t,
            all.filter((o) => teams[o].division === teams[t].division),
          )
        : 0;
    const ownEligible = (t: number) =>
      percentage(
        s,
        t,
        all.filter(
          (o) => eligible.has(o) && teams[o].conference === teams[t].conference,
        ),
      );
    const otherEligible = (t: number) =>
      percentage(
        s,
        t,
        all.filter(
          (o) => eligible.has(o) && teams[o].conference !== teams[t].conference,
        ),
      );
    return group.length === 2
      ? [
          h2h,
          division,
          divisional,
          conference,
          ownEligible,
          otherEligible,
          (t: number) => s.difference[t],
        ]
      : [
          division,
          h2h,
          divisional,
          conference,
          ownEligible,
          (t: number) => s.difference[t],
        ];
  };
  for (const d of new Set(teams.map((t) => t.division))) {
    const pool = all.filter((t) => teams[t].division === d);
    divisionWinners.add(
      rankByRecord(pool, s, (g) => breakTie(g, criteria(false), rng))[0],
    );
  }
  return rankByRecord(members, s, (g) => breakTie(g, criteria(true), rng));
}
export function seriesProbability(home: number, away: number, mat: number[][]) {
  const dp = Array.from({ length: 5 }, () => Array(5).fill(0));
  dp[0][0] = 1;
  for (let a = 0; a < 4; a++)
    for (let b = 0; b < 4; b++) {
      const n = a + b,
        p = [0, 1, 4, 6].includes(n) ? mat[home][away] : 1 - mat[away][home];
      dp[a + 1][b] += dp[a][b] * p;
      dp[a][b + 1] += dp[a][b] * (1 - p);
    }
  return dp[4].reduce((n, p) => n + p, 0);
}
function groupRanking(
  members: number[],
  s: State,
  teams: SimTeam[],
  rng: () => number,
  head = true,
) {
  return rankByRecord(members, s, (g) =>
    breakTie(
      g,
      (group) => [
        (t: number) =>
          head
            ? percentage(
                s,
                t,
                group.filter((o) => o !== t),
              )
            : 0,
        (t: number) => s.difference[t],
        (t: number) => s.points[t],
        (t: number) => teams[t].priorPct,
      ],
      rng,
    ),
  );
}
export function simulateNba(
  config: SimConfig,
  forced: Record<string, number> = {},
  runs = 2000,
  seed = 42,
): SimResult {
  if (!Number.isInteger(runs) || runs < 100 || runs > 10000)
    throw new Error("Número de simulaciones fuera de rango.");
  const teams = config.teams,
    ids = teams.map((t) => t.id),
    index = new Map(ids.map((id, i) => [id, i]));
  if (ids.length !== 30 || new Set(ids).size !== 30 || !config.cup)
    throw new Error(
      "No hay configuración completa de NBA Cup para esta temporada.",
    );
  if (
    config.cup.groups.length !== 6 ||
    new Set(config.cup.groups.flatMap((g) => g.teamIds)).size !== 30 ||
    config.cup.gameIds.length !== 60
  )
    throw new Error("Grupos NBA Cup incompletos.");
  if (
    config.games.length !== 1200 ||
    new Set(config.games.map((g) => g.id)).size !== 1200
  )
    throw new Error(
      "La ampliación requiere el calendario base de 1.200 encuentros; publica una configuración compatible con el calendario actualizado.",
    );
  const baseCounts = Array(30).fill(0);
  for (const g of config.games) {
    if (!index.has(g.homeId) || !index.has(g.awayId) || g.homeId === g.awayId)
      throw new Error("Equipos de calendario inválidos.");
    baseCounts[index.get(g.homeId)!]++;
    baseCounts[index.get(g.awayId)!]++;
    if (
      g.status === "finished" &&
      (g.homePts === null || g.awayPts === null || g.homePts === g.awayPts)
    )
      throw new Error("Marcador terminado inválido.");
    if (
      g.status !== "finished" &&
      (!Number.isFinite(g.probability) ||
        g.probability! < 0 ||
        g.probability! > 1)
    )
      throw new Error("Probabilidad ausente.");
  }
  if (baseCounts.some((n) => n !== 80))
    throw new Error(
      "Cada equipo debe tener 80 encuentros base para completar los dos pendientes.",
    );
  if (Object.keys(forced).length > 12)
    throw new Error("Máximo doce condiciones por escenario.");
  for (const [id, winner] of Object.entries(forced)) {
    const game = config.games.find((g) => g.id === id);
    if (
      !game ||
      game.status !== "scheduled" ||
      ![game.homeId, game.awayId].includes(winner)
    )
      throw new Error(
        "Solo puedes condicionar encuentros pendientes y sus participantes.",
      );
  }
  const rng = randomSeed(seed),
    cupIds = new Set(config.cup.gameIds),
    counter = teams.map(() => ({
      direct: 0,
      playin: 0,
      playoffs: 0,
      round2: 0,
      conferenceFinal: 0,
      final: 0,
      champion: 0,
      cupQualify: 0,
      cupSemifinal: 0,
      cupFinal: 0,
      cupChampion: 0,
    })),
    winSamples = teams.map(() => [] as number[]);
  let playoffBracket: BracketMatch[] = [],
    cupBracket: BracketMatch[] = [],
    exampleStandings: SimResult["exampleStandings"] = [],
    syntheticGames: SimResult["syntheticGames"] = [];
  const conferences = ["Este", "Oeste"],
    observedCup = emptyState();
  for (const g of config.games)
    if (cupIds.has(g.id) && g.status === "finished")
      apply(
        observedCup,
        index.get(g.homeId)!,
        index.get(g.awayId)!,
        g.homePts!,
        g.awayPts!,
        g.overtime,
      );
  const cupGroups = config.cup.groups.map((group) => ({
    name: group.name,
    rows: groupRanking(
      group.teamIds.map((id) => index.get(id)!),
      observedCup,
      teams,
      randomSeed(42),
    ).map((t) => ({
      teamId: ids[t],
      played: observedCup.played[t],
      wins: observedCup.wins[t],
      difference: observedCup.difference[t],
      points: observedCup.points[t],
    })),
  }));
  for (let run = 0; run < runs; run++) {
    const state = emptyState(),
      cup = emptyState(),
      po: BracketMatch[] = [],
      cb: BracketMatch[] = [],
      generated: SimResult["syntheticGames"] = [];
    const single = (
      h: number,
      a: number,
      stage: string,
      conference: string,
      kind = "regular",
      regular = false,
    ) => {
      const p = config.matrices[kind][h][a],
        won = rng() < p,
        localSeed = Math.floor(rng() * 4294967296);
      const [hp, ap] = drawScore(
        won,
        config.matrices.margin[h][a],
        config,
        localSeed,
      );
      if (regular) {
        apply(state, h, a, hp, ap);
        generated.push({ homeId: ids[h], awayId: ids[a], stage });
      }
      const winner = won ? h : a;
      const match = {
        stage,
        conference,
        homeId: ids[h],
        awayId: ids[a],
        probability: p,
        winner: ids[winner],
      };
      if (stage.startsWith("Cup")) cb.push(match);
      else if (stage.startsWith("Play-in")) po.push(match);
      return winner;
    };
    for (const g of config.games) {
      const h = index.get(g.homeId)!,
        a = index.get(g.awayId)!;
      let hp = g.homePts,
        ap = g.awayPts,
        ot = g.overtime,
        regHp = hp,
        regAp = ap;
      if (g.status !== "finished") {
        const draw = rng(),
          localSeed = Math.floor(rng() * 4294967296),
          homeWins =
            forced[g.id] === undefined
              ? draw < g.probability!
              : forced[g.id] === g.homeId;
        [hp, ap, ot, regHp, regAp] = drawScore(
          homeWins,
          g.margin ?? config.matrices.margin[h][a],
          config,
          localSeed,
        );
      }
      apply(state, h, a, hp!, ap!);
      if (cupIds.has(g.id)) apply(cup, h, a, hp!, ap!, ot);
      if (cupIds.has(g.id) && ot && g.status !== "finished") {
        cup.points[h] += regHp! - hp!;
        cup.points[a] += regAp! - ap!;
      }
    }
    const finalists: number[] = [],
      qualified = new Set<number>(),
      quarterLosers: number[][] = [];
    for (const conference of conferences) {
      const winners: number[] = [],
        runners: number[] = [];
      for (const group of config.cup.groups.filter(
        (g) => g.conference === conference,
      )) {
        const ranked = groupRanking(
          group.teamIds.map((id) => index.get(id)!),
          cup,
          teams,
          rng,
        );
        winners.push(ranked[0]);
        runners.push(ranked[1]);
      }
      const sortedWinners = groupRanking(winners, cup, teams, rng, false),
        wild = groupRanking(runners, cup, teams, rng, false)[0];
      const field = [...sortedWinners, wild];
      for (const t of field) {
        qualified.add(t);
        counter[t].cupQualify++;
      }
      const semi: number[] = [],
        losers: number[] = [];
      for (const [a, b] of [
        [0, 3],
        [1, 2],
      ]) {
        const winner = single(
          field[a],
          field[b],
          "Cup · Cuartos",
          conference,
          "regular",
          true,
        );
        semi.push(winner);
        losers.push(winner === field[a] ? field[b] : field[a]);
        counter[winner].cupSemifinal++;
      }
      quarterLosers.push(losers);
      const seedA = field.indexOf(semi[0]),
        seedB = field.indexOf(semi[1]),
        h = seedA < seedB ? semi[0] : semi[1],
        a = h === semi[0] ? semi[1] : semi[0];
      const winner = single(
        h,
        a,
        "Cup · Semifinal",
        conference,
        "regular",
        true,
      );
      counter[winner].cupFinal++;
      finalists.push(winner);
    }
    const champion = single(
      finalists[0],
      finalists[1],
      "Cup · Final",
      "NBA",
      "neutral",
      false,
    );
    counter[champion].cupChampion++;
    // Four quarterfinal losers get one extra game; 22 other teams get two.
    for (const [h, a] of quarterLosers)
      single(h, a, "Complementario tras cuartos", "NBA", "regular", true);
    const nonQualified = teams
      .map((_, i) => i)
      .filter((i) => !qualified.has(i))
      .map((t) => ({ t, r: rng() }))
      .sort((a, b) => a.r - b.r)
      .map((v) => v.t);
    for (let round = 0; round < 2; round++) {
      const rotation =
        round === 0
          ? nonQualified
          : [
              nonQualified[0],
              nonQualified.at(-1)!,
              ...nonQualified.slice(1, -1),
            ];
      for (let i = 0; i < 11; i++) {
        const a = rotation[i],
          b = rotation[21 - i];
        single(
          round === 0 ? a : b,
          round === 0 ? b : a,
          "Complementario NBA Cup",
          "NBA",
          "regular",
          true,
        );
      }
    }
    if (
      state.played.some((n) => n !== 82) ||
      generated.length !== 30 ||
      state.wins.reduce((a, b) => a + b, 0) !== 1230
    )
      throw new Error(
        "El calendario simulado no conserva 82 partidos por equipo.",
      );
    const orders = conferences.map((c) => ({
      conference: c,
      order: rankConference(
        teams.map((_, i) => i).filter((i) => teams[i].conference === c),
        state,
        teams,
        rng,
      ),
    }));
    const playSeries = (
      first: number,
      second: number,
      higher: number,
      stage: string,
      conference: string,
    ) => {
      const h = higher,
        a = first === h ? second : first,
        p = seriesProbability(h, a, config.matrices.playoffs);
      let hw = 0,
        aw = 0;
      for (let n = 0; n < 7; n++) {
        const hHome = [0, 1, 4, 6].includes(n),
          prob = hHome
            ? config.matrices.playoffs[h][a]
            : 1 - config.matrices.playoffs[a][h],
          won = rng() < prob;
        if (hw < 4 && aw < 4) {
          if (won) hw++;
          else aw++;
        }
      }
      const winner = hw === 4 ? h : a;
      po.push({
        stage,
        conference,
        homeId: ids[h],
        awayId: ids[a],
        probability: p,
        winner: ids[winner],
        homeWins: hw,
        awayWins: aw,
      });
      return winner;
    };
    const nbaFinalists: number[] = [];
    for (const { conference, order } of orders) {
      for (const t of order.slice(0, 6)) counter[t].direct++;
      for (const t of order.slice(6, 10)) counter[t].playin++;
      const seven = single(order[6], order[7], "Play-in · 7–8", conference),
        loser = seven === order[6] ? order[7] : order[6];
      const ninth = single(order[8], order[9], "Play-in · 9–10", conference),
        eight = single(loser, ninth, "Play-in · Última plaza", conference);
      const field = [...order.slice(0, 6), seven, eight];
      for (const t of field) counter[t].playoffs++;
      const series = (a: number, b: number, stage: string) =>
        playSeries(
          a,
          b,
          order.indexOf(a) < order.indexOf(b) ? a : b,
          stage,
          conference,
        );
      const r2 = [
        [0, 7],
        [3, 4],
        [2, 5],
        [1, 6],
      ].map(([a, b]) => series(field[a], field[b], "Primera ronda"));
      for (const t of r2) counter[t].round2++;
      const cf = [
        series(r2[0], r2[1], "Semifinal de conferencia"),
        series(r2[2], r2[3], "Semifinal de conferencia"),
      ];
      for (const t of cf) counter[t].conferenceFinal++;
      const finalist = series(cf[0], cf[1], "Final de conferencia");
      counter[finalist].final++;
      nbaFinalists.push(finalist);
    }
    const [f, a] = nbaFinalists,
      higher =
        state.wins[f] !== state.wins[a]
          ? state.wins[f] > state.wins[a]
            ? f
            : a
          : state.head[f][a] !== state.head[a][f]
            ? state.head[f][a] > state.head[a][f]
              ? f
              : a
            : rng() < 0.5
              ? f
              : a;
    counter[playSeries(f, a, higher, "Final NBA", "NBA")].champion++;
    for (let i = 0; i < 30; i++) winSamples[i].push(state.wins[i]);
    if (run === 0) {
      playoffBracket = po;
      cupBracket = cb;
      exampleStandings = orders.map((o) => ({
        conference: o.conference,
        teamIds: o.order.map((i) => ids[i]),
      }));
      syntheticGames = generated;
    }
  }
  const rows = teams.map((t, i) => {
    const values = winSamples[i].sort((a, b) => a - b);
    return {
      teamId: t.id,
      wins: values.reduce((a, b) => a + b, 0) / runs,
      low: values[Math.floor(runs * 0.05)],
      high: values[Math.min(runs - 1, Math.floor(runs * 0.95))],
      ...Object.fromEntries(
        Object.entries(counter[i]).map(([k, v]) => [k, v / runs]),
      ),
    } as SimRow;
  });
  return {
    runs,
    seed,
    modelVersion: config.modelVersion,
    cutoff: config.cutoff,
    rows,
    playoffBracket,
    cupBracket,
    cupGroups,
    exampleStandings,
    syntheticGames,
    scheduledGames: 1200,
    completedGames: 1230,
    gamesPerTeam: 82,
    scenario: { ...forced },
    overtimeIncomplete: config.games.filter(
      (g) => cupIds.has(g.id) && g.status === "finished" && g.overtime,
    ).length,
    generatedAt: new Date().toISOString(),
    marginReport: config.marginReport,
  };
}
