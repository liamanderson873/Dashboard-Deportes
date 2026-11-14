export type Destination = { label: string; description: string; href: string };

export function navigationDestinations(
  base: string,
  nba: boolean,
): Destination[] {
  return nba
    ? [
        [
          "Clasificación y equipos",
          "Conferencias, balance y estadísticas de equipo",
          "",
        ],
        [
          "Calendario y partidos",
          "Resultados y centro de cada encuentro",
          "/partidos",
        ],
        [
          "Explorar jugadores",
          "Busca un jugador y abre su ficha",
          "/jugadores",
        ],
        [
          "Comparar jugadores",
          "Dos jugadores, estadística a estadística",
          "/jugadores?tab=compare",
        ],
        [
          "Mapa de jugadores",
          "Cruza métricas y descubre quién destaca",
          "/jugadores?tab=chart",
        ],
        [
          "Simulador y modelos",
          "Playoffs, NBA Cup y probabilidades",
          "/modelos",
        ],
        ["Seguimiento", "Tus equipos y jugadores favoritos", "/seguimiento"],
        ["Mi quinteto", "Construye tu alineación NBA", "/quinteto"],
      ].map(([label, description, path]) => ({
        label,
        description,
        href: base + path,
      }))
    : [
        ["Clasificación y equipos", "La liga y las fichas de sus equipos", ""],
        [
          "Calendario y partidos",
          "Próximos encuentros y centros de partido",
          "/partidos",
        ],
        [
          "Resultados por jornada",
          "Recorre los resultados de cada jornada",
          "/resultados",
        ],
        ["Goleadores", "Quién lidera la tabla de goles", "/goleadores"],
        [
          "Comparar equipos",
          "Estadísticas de dos equipos frente a frente",
          "/comparar",
        ],
        [
          "Explorar jugadores",
          "Busca un jugador y consulta su rendimiento",
          "/jugadores",
        ],
        [
          "Comparar jugadores",
          "Compara rendimiento total o por 90 minutos",
          "/jugadores?tab=comparar",
        ],
        ["Seguimiento", "Tus equipos y jugadores favoritos", "/seguimiento"],
        ["Mi once", "Construye tu alineación de fútbol", "/mi-once"],
      ].map(([label, description, path]) => ({
        label,
        description,
        href: base + path,
      }));
}

export function navigationContext(pathname: string, nba: boolean) {
  const match = pathname.match(
    nba ? /^\/nba\/(\d{4})(?:\/|$)/ : /^\/(pd|pl|bl1|sa|fl1)\/(\d{4})(?:\/|$)/,
  );
  return match
    ? nba
      ? `/nba/${match[1]}`
      : `/${match[1]}/${match[2]}`
    : nba
      ? "/nba/2026"
      : "/pd/2026";
}
