/** Every user-visible string of the app. Components never hard-code Spanish. */
export const es = {
  appTitle: "Estadísticas de fútbol",
  appDescription:
    "Clasificaciones, forma reciente y estadísticas de las cinco grandes ligas europeas.",
  skipLink: "Saltar al contenido",
  loading: "Cargando…",
  brandHome: "Estadísticas de fútbol, ir al inicio",

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
      won: "V",
      drawn: "E",
      lost: "D",
      goalsFor: "GF",
      goalsAgainst: "GC",
    },
    columnTitles: {
      position: "Posición",
      played: "Partidos jugados",
      won: "Victorias",
      drawn: "Empates",
      lost: "Derrotas",
      goalsFor: "Goles a favor",
      goalsAgainst: "Goles en contra",
      goalDifference: "Diferencia de goles",
      form: "Últimos 5 partidos",
    },
    zones: {
      top: "zona alta",
      bottom: "descenso",
    },
    legendTitle: "Leyenda",
    legendTop: "Zona alta: puestos 1–4",
    legendBottom: "Descenso: últimos 3",
    legendForm:
      "Forma: últimos 5 partidos, del más antiguo al más reciente (V victoria, E empate, D derrota)",
  },

  results: {
    pageTitle: (league: string, season: string, matchday: number) =>
      `${league} ${season} · Resultados, jornada ${matchday}`,
    subtitle: (season: string, matchday: number) =>
      `Temporada ${season} · Jornada ${matchday}`,
    subtitleNoMatchday: (season: string) => `Temporada ${season}`,
    matchdayNav: "Jornadas",
    allMatchdays: "Todas las jornadas",
    matchdayLabel: (matchday: number) => `Jornada ${matchday}`,
    previous: "Jornada anterior",
    next: "Jornada siguiente",
    halfTime: "Resultado al descanso",
    timeTbd: "Hora por confirmar",
    score: (home: string, h: number, away: string, a: number) =>
      `${home} ${h}, ${away} ${a}`,
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
      title: "Rendimiento",
      kpiLabel: "Indicadores de rendimiento del equipo",
      position: "Posición en la tabla",
      points: "Puntos",
      record: "Balance V-E-D",
      goalsFor: "Goles a favor",
      goalsAgainst: "Goles en contra",
      form: "Forma",
      home: "En casa",
      away: "Fuera",
    },
    split: {
      title: "Casa y fuera",
      points: "puntos",
      played: "Partidos jugados",
      record: "Victorias-empates-derrotas",
      goals: "Goles a favor-en contra",
    },
    evolution: {
      title: "Evolución",
      chartLabel: (team: string) =>
        `Puntos acumulados de ${team} por partido jugado, una línea por temporada`,
      xLabel: "Partido",
      yLabel: "Puntos acumulados",
      currentSeason: "temporada mostrada",
      currentRow: "(temporada mostrada)",
      tableCaption: "Posición y balance del equipo en cada temporada de la liga",
      columns: {
        season: "Temporada",
        position: "Pos.",
        played: "PJ",
        points: "Puntos",
        goalsFor: "GF",
        goalsAgainst: "GC",
      },
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
        matches === 0
          ? "Sin estadísticas avanzadas para esta temporada"
          : `Medias de ${matches} partidos; xG disponible en ${withXg}`,
    },
    squad: {
      title: "Plantilla",
      note: (season: string) =>
        `Plantilla de la temporada ${season}. Edad al inicio de la temporada.`,
      empty: "No hay plantilla cargada para esta temporada",
      age: (years: number) => `${years} años`,
      missing: "—",
      groupSingular: {
        goalkeepers: "Portero",
        defenders: "Defensa",
        midfielders: "Centrocampista",
        forwards: "Delantero",
      },
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
      upcoming: "Pendientes",
      matchday: (n: number) => `J${n}`,
      home: "vs",
      away: "en",
    },
  },

  compare: {
    pageTitle: (league: string, season: string) =>
      `${league} ${season} · Comparador`,
    subtitle: (season: string) => `Temporada ${season} · Comparador de equipos`,
    hint: "Elige dos equipos para compararlos",
    vs: "vs",
    errors: {
      same: "Elige dos equipos distintos",
      unknown: "Ese equipo no juega en esta liga y temporada",
    },
    form: {
      teamA: "Equipo A",
      teamB: "Equipo B",
      placeholder: "Elige un equipo",
      submit: "Comparar",
    },
    table: {
      caption: (a: string, b: string) => `Comparación entre ${a} y ${b}`,
      metric: "Estadística",
      unavailableTitle: "No hay datos de este indicador para ese equipo",
      better: "mejor",
    },
    rows: {
      position: "Posición",
      points: "Puntos",
      played: "Partidos jugados",
      won: "Victorias",
      goalsFor: "Goles a favor",
      goalsAgainst: "Goles en contra",
      goalDifference: "Diferencia de goles",
      xgFor: "xG a favor por partido",
      xgAgainst: "xG en contra por partido",
      shots: "Tiros por partido",
      shotsOnTarget: "Tiros a puerta por partido",
      corners: "Córners por partido",
      fouls: "Faltas por partido",
      yellow: "Amarillas por partido",
    },
    headToHead: {
      title: "Enfrentamientos directos",
      empty: "No hay partidos entre ellos en los datos cargados",
    },
  },

  kpi: {
    leader: "Líder",
    bestAttack: "Mejor ataque",
    bestDefense: "Mejor defensa",
    goalsPerMatch: "Goles por partido",
    title: "Indicadores de la temporada",
    leagueAverage: "Media de la liga",
    units: {
      points: "pts",
      goals: "goles",
      goalsAgainst: "goles en contra",
      perMatch: "por partido",
    },
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
    noFinishedMatchesHint:
      "La clasificación aparecerá cuando se juegue el primer partido. Mientras tanto puedes consultar el calendario.",
    seeResults: "Ver el calendario de partidos",
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
    message: "La página que buscas no existe.",
    back: "Volver al inicio",
  },
} as const;
