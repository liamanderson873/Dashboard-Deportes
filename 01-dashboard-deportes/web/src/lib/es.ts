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
