/** Every user-visible string of the app. Components never hard-code Spanish. */
export const es = {
  appTitle: "Estadísticas de fútbol",
  appDescription:
    "Clasificaciones, forma reciente y estadísticas de las cinco grandes ligas europeas.",
  skipLink: "Saltar al contenido",
  loading: "Cargando…",

  nav: {
    leagues: "Ligas",
    leagueWithoutData: "sin datos",
    seasons: "Temporadas",
    sections: "Secciones",
  },

  sections: {
    clasificacion: "Clasificación",
    resultados: "Resultados",
    goleadores: "Goleadores",
    comparar: "Comparador",
  },

  standings: {
    defaultCaption: "Clasificación",
    pageTitle: (league: string, season: string) =>
      `${league} ${season} · Clasificación`,
    caption: (league: string, season: string) =>
      `Clasificación de ${league}, temporada ${season}`,
    subtitle: (season: string, played: number) =>
      `Temporada ${season} · ${played} ${played === 1 ? "partido jugado" : "partidos jugados"}`,
    columns: {
      position: "#",
      team: "Equipo",
      played: "PJ",
      goalDifference: "DG",
      form: "Forma",
      points: "Puntos",
    },
    legendZones: "Franja azul: primeras 4 posiciones. Franja roja: últimas 3.",
    legendForm:
      "Los círculos son los últimos 5 partidos (V victoria, E empate, D derrota).",
  },

  results: {
    pageTitle: (league: string, season: string, matchday: number) =>
      `${league} ${season} · Resultados, jornada ${matchday}`,
    subtitle: (season: string, matchday: number) =>
      `Temporada ${season} · Jornada ${matchday}`,
    subtitleNoMatchday: (season: string) => `Temporada ${season}`,
    matchdayNav: "Jornadas",
    matchdayLabel: (matchday: number) => `Jornada ${matchday}`,
    previous: "Jornada anterior",
    next: "Jornada siguiente",
    halfTime: "Resultado al descanso",
    empty: "Todavía no hay jornadas cargadas en esta temporada",
    statuses: {
      SCHEDULED: "Programado",
      TIMED: "Programado",
      POSTPONED: "Aplazado",
      CANCELLED: "Cancelado",
      SUSPENDED: "Suspendido",
      IN_PLAY: "En juego",
      PAUSED: "En juego",
      AWARDED: "Resuelto en los despachos",
    } as Record<string, string>,
  },

  scorers: {
    pageTitle: (league: string, season: string) =>
      `${league} ${season} · Goleadores`,
    subtitle: (season: string) => `Temporada ${season} · Máximos goleadores`,
    defaultCaption: "Máximos goleadores",
    caption: (league: string, season: string) =>
      `Máximos goleadores de ${league}, temporada ${season}`,
    columns: {
      rank: "#",
      player: "Jugador",
      team: "Equipo",
      played: "PJ",
      goals: "Goles",
      assists: "Asist.",
      penalties: "Pen.",
    },
    missing: "—",
    source: "Fuente: football-data.org. Se muestran los 50 primeros.",
    empty: "No hay goleadores cargados para esta temporada",
  },

  team: {
    pageTitle: (team: string, league: string, season: string) =>
      `${team} · ${league} ${season}`,
    subtitle: (league: string, season: string) => `${league} · Temporada ${season}`,
    unavailable: "No disponible",
    profile: {
      venue: "Estadio",
      founded: "Fundado",
      colors: "Colores",
      coach: "Entrenador actual",
    },
    summary: {
      title: "Resumen",
      position: "Posición en la tabla",
      points: "Puntos",
      record: "Balance V-E-D",
      goalsFor: "Goles a favor",
      goalsAgainst: "Goles en contra",
      form: "Forma",
      home: "En casa",
      away: "Fuera",
      split: (
        played: number,
        won: number,
        drawn: number,
        lost: number,
        gf: number,
        ga: number,
        pts: number,
      ) =>
        `${played} PJ · ${won}V ${drawn}E ${lost}D · ${gf}-${ga} goles · ${pts} puntos`,
    },
    stats: {
      title: "Estadísticas por partido",
      xgFor: "xG a favor",
      xgAgainst: "xG en contra",
      shots: "Tiros",
      shotsOnTarget: "Tiros a puerta",
      corners: "Córners",
      fouls: "Faltas",
      yellow: "Amarillas",
      red: "Rojas",
      note: (matches: number, withXg: number) =>
        `Medias de ${matches} partidos; xG disponible en ${withXg}`,
    },
    squad: {
      title: "Plantilla",
      note: (season: string) => `Plantilla de la temporada ${season}`,
      empty: "No hay plantilla cargada para esta temporada",
      age: (years: number) => `${years} años`,
      missing: "—",
      groups: {
        goalkeepers: "Porteros",
        defenders: "Defensas",
        midfielders: "Centrocampistas",
        forwards: "Delanteros",
        unknown: "Sin posición",
      },
    },
    matches: {
      title: "Partidos",
      played: "Jugados",
      upcoming: "Próximos",
      matchday: (n: number) => `J${n}`,
      home: "vs",
      away: "en",
    },
  },

  kpi: {
    leader: "Líder",
    bestAttack: "Mejor ataque",
    bestDefense: "Mejor defensa",
    goalsPerMatch: "Goles por partido",
  },

  form: {
    label: (count: number) =>
      count === 1 ? "Último partido" : `Últimos ${count} partidos`,
    none: "Sin partidos jugados",
    results: {
      W: "victoria",
      D: "empate",
      L: "derrota",
    },
    letters: {
      W: "V",
      D: "E",
      L: "D",
    },
  },

  empty: {
    noFinishedMatches: "Todavía no hay partidos terminados en esta temporada",
    noData: "Todavía no hay datos cargados",
    noDataHint:
      "Carga datos con el comando: python -m sports_dashboard.ingest --competitions PD --seasons 2024",
  },

  error: {
    title: "No se pudo leer la base de datos",
    stepsIntro: "Comprueba lo siguiente:",
    steps: [
      "Arranca la base de datos con docker compose up -d",
      "Comprueba que existe web/.env.local con la variable DATABASE_URL",
    ],
    retry: "Reintentar",
    missingDatabaseUrl:
      "Falta la variable DATABASE_URL. Créala en web/.env.local con la dirección de conexión a la base de datos.",
  },

  notFound: {
    title: "Página no encontrada",
    message: "Esa liga o temporada no existe.",
    back: "Volver al inicio",
  },
} as const;
