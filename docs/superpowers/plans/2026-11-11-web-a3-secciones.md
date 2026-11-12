# Web A3: Resultados, Goleadores, Equipo, Temporadas y Comparador — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir a la web las secciones Resultados por jornada, Goleadores, ficha de Equipo (con plantilla, estadísticas, evolución y temporadas) y Comparador de dos equipos, todas en español y leyendo solo de PostgreSQL.

**Architecture:** Mismas piezas que A2: componentes de servidor de Next.js que consultan PostgreSQL con postgres.js; lógica pura en `src/lib/*.ts`, SQL en `src/lib/queries/*.ts`, componentes en `src/components`, textos en `src/lib/es.ts`. Todas las secciones cuelgan de `/{liga}/{temporada}/...` y comparten una cabecera con navegación de liga, temporada y sección. Los gráficos son SVG generado en el servidor (sin dependencias nuevas), siempre con una tabla alternativa.

**Tech Stack:** Next.js 16.4 (App Router, `params` y `searchParams` son `Promise`), React 19, TypeScript estricto, Tailwind 4, postgres.js 4, Vitest 5. Sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-11-11-dashboard-web-nextjs-design.md`

## Global Constraints

- Directorio de trabajo: `01-dashboard-deportes/web`. Leer `web/AGENTS.md` y la documentación en `node_modules/next/dist/docs/` antes de usar una API de Next.
- La web **solo lee** de PostgreSQL; nunca llama a una API externa ni ejecuta `init_schema`.
- Los tests de base de datos usan `sports_test` (`testSql`, `resetTestDatabase`, `seedStandingsFixture` de `tests/helpers/test-db.ts`). Nunca se toca la base `sports`.
- Todo texto visible sale de `src/lib/es.ts`. Interfaz en español.
- Colores solo por tokens de `globals.css` (acento `#1E40AF`, victoria `#15803D`, empate `#64748B`, derrota `#DC2626`, barra `#BFDBFE`); un solo acento, sin degradados; radios de 14 a 16 px; cifras con la clase `num` (Fira Code tabular).
- Accesibilidad: contraste 4,5:1, foco visible, tablas con `<caption>` (puede ser `sr-only`) y `<th scope>`, un solo `<h1>` por página, objetivos táctiles de 44 px, gráficos con `role="img"`, `aria-label` y tabla alternativa.
- Móvil: sin scroll horizontal a 375 px.
- SQL: todo parametrizado con plantillas etiquetadas; cifras con `::int`; `NUMERIC` (xG) con `::float8`; los estados contados son `COUNTED_STATUSES` (`FINISHED`, `AWARDED`) pasados como parámetro y con goles no nulos.
- Las páginas son `export const dynamic = "force-dynamic"`, no capturan errores de base de datos (los recoge `error.tsx`) y llaman a `notFound()` ante parámetros inválidos.
- El entrenador (`teams.coach`) se rotula siempre como "Entrenador actual". La plantilla sale de `squad_members` (por temporada), nunca de `players.team_id`.
- Un dato que no existe en la base se muestra como "No disponible", nunca como 0.
- Fechas: se muestran en horario de `Europe/Madrid` con `Intl.DateTimeFormat("es-ES", ...)`.
- Cada tarea termina con `npm test`, `npm run lint`, `npm run typecheck` y `npm run build` en verde, y un commit con el mensaje indicado.

## Review Focus

1. Equipo que no juega en esa liga y temporada, o `teamId` no numérico (`abc`, `12abc`, `-1`, `999999999999`): `notFound()`, no un error 500.
2. Partidos sin marcador (`SCHEDULED`, `TIMED`, `POSTPONED`, `CANCELLED`): se listan con su estado en español y no suman en ninguna estadística.
3. Estadísticas avanzadas ausentes (xG solo existe en parte de los partidos): la media se calcula solo con los partidos que tienen el dato y se indica con cuántos; sin ninguno, "No disponible".
4. Comparador con `a` igual a `b`, con uno solo o con ids ajenos a la temporada: muestra el formulario con un aviso, sin romperse.
5. Jugadores con posición, nacionalidad o fecha de nacimiento nulas, y goleadores con asistencias o penaltis nulos: se muestran con "—" y no rompen el orden.

Cada punto tiene su test en la tarea dueña del código (indicado en los pasos).

---

### Task 1: Cabecera común, navegación de secciones y enlaces a equipos

**Files:**
- Create: `web/src/lib/sections.ts`, `web/src/lib/sections.test.ts`, `web/src/lib/league-context.ts`, `web/src/components/SectionNav.tsx`, `web/src/components/LeagueHeader.tsx`
- Modify: `web/src/components/LeagueNav.tsx`, `SeasonNav.tsx`, `StandingsTable.tsx`, `EmptyState.tsx`, `components.test.tsx`, `web/src/app/[competition]/[season]/page.tsx`, `web/src/lib/es.ts`

**Interfaces:**
- Consumes: `resolveRoute`, `targetSeason`, `getAvailableSeasons`, `getSeasonsByCompetition`, `Competition`, `CompetitionCode`.
- Produces, en `sections.ts`: `type SectionId = "clasificacion" | "resultados" | "goleadores" | "comparar"`; `SECTIONS: readonly { id: SectionId; path: string }[]` con rutas `""`, `"/resultados"`, `"/goleadores"`, `"/comparar"`; `sectionHref(slug: string, season: number, section: SectionId): string` (`sectionHref("pd", 2024, "clasificacion") === "/pd/2024"`, `"resultados"` da `"/pd/2024/resultados"`); `teamHref(slug: string, season: number, teamId: number): string` (`"/pd/2024/equipo/81"`).
- Produces, en `league-context.ts`: `type LeagueContext = { competition: Competition; season: number; seasons: number[]; seasonsByCompetition: Partial<Record<CompetitionCode, number[]>> }`; `loadLeagueContext(sql: Sql, slug: string, rawSeason: string): Promise<LeagueContext>` que llama a `notFound()` si la ruta no es válida o la temporada no está en `getAvailableSeasons`. La redirección de mayúsculas a minúsculas se queda en cada página (necesita la ruta completa).
- Produces, componentes: `SectionNav({ slug, season, active }: { slug: string; season: number; active: SectionId | null })` (enlaces con `aria-current="page"` en la activa; `null` cuando la página es de un equipo); `LeagueHeader({ context, section, title, subtitle }: { context: LeagueContext; section: SectionId | null; title?: string; subtitle: string })` que pinta el `<h1>` (el nombre de la liga, o `title` si se pasa), el subtítulo, `LeagueNav`, `SeasonNav` y `SectionNav`.
- Cambios: `LeagueNav` y `SeasonNav` reciben `section: SectionId` opcional (por defecto `"clasificacion"`) y enlazan con `sectionHref`; `StandingsTable` recibe `slug` y `season` y el nombre de cada equipo es un enlace a `teamHref`; `EmptyState` recibe `level?: 1 | 2` (por defecto 2) y las páginas sin otro título (`not-found`, `error`, inicio vacío) pasan `level={1}`.

- [ ] **Step 1: Tests** en `sections.test.ts`: `test_section_href_for_each_section`, `test_team_href`. En `components.test.tsx`: `test_section_nav_marks_only_the_active_section`, `test_section_nav_without_active_section_has_no_aria_current`, `test_league_and_season_nav_keep_the_section` (con `section="goleadores"` los enlaces acaban en `/goleadores`), `test_standings_table_links_each_team_to_its_page` (`href="/pd/2024/equipo/1"`), `test_empty_state_level_one_renders_h1`.
- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implementar** y pasar la página de Clasificación a `loadLeagueContext` y `LeagueHeader` sin cambiar su aspecto. Nombres de sección en `es.sections` (`Clasificación`, `Resultados`, `Goleadores`, `Comparador`).
- [ ] **Step 4: Run** tests, lint, typecheck y build. Expected: pasan.
- [ ] **Step 5: Commit** `feat(web): add shared league header, section navigation and team links`.

### Task 2: Resultados por jornada

**Files:**
- Create: `web/src/lib/matches.ts`, `web/src/lib/matches.test.ts`, `web/src/lib/queries/matches.ts`, `web/src/lib/queries/matches.test.ts`, `web/src/components/MatchList.tsx`, `web/src/components/MatchdayNav.tsx`, `web/src/app/[competition]/[season]/resultados/page.tsx`, `web/src/app/[competition]/[season]/resultados/[matchday]/page.tsx`
- Modify: `web/src/components/components.test.tsx`, `web/src/lib/es.ts`

**Interfaces:**
- Consumes: Task 1 (`loadLeagueContext`, `LeagueHeader`, `teamHref`, `sectionHref`), `COUNTED_STATUSES`.
- Produces, en `matches.ts` (puro): `type TeamRef = { id: number; name: string; shortName: string; tla: string | null; crest: string | null }`; `type MatchRow = { id: number; matchday: number | null; utcDate: Date; status: string; home: TeamRef; away: TeamRef; homeGoals: number | null; awayGoals: number | null; homeHtGoals: number | null; awayHtGoals: number | null }`; `isPlayed(m: MatchRow): boolean` (estado contado y goles no nulos); `statusLabel(status: string): string | null` (`SCHEDULED` y `TIMED` → `"Programado"`, `POSTPONED` → `"Aplazado"`, `CANCELLED` → `"Cancelado"`, `SUSPENDED` → `"Suspendido"`, `IN_PLAY` y `PAUSED` → `"En juego"`, `AWARDED` → `"Resuelto en los despachos"`, `FINISHED` → `null`, cualquier otro → el propio código); `formatMatchDate(d: Date): string` (`"sáb, 17 ago 2024"` en `Europe/Madrid`); `formatMatchTime(d: Date): string` (`"21:30"`); `groupByDay(matches: MatchRow[]): { day: string; matches: MatchRow[] }[]` (agrupa por fecha de Madrid, en orden); `parseMatchday(raw: string): number | null` (`/^\d{1,2}$/` y de 1 a 99).
- Produces, en `queries/matches.ts`: `getMatchdays(sql, competition, season): Promise<{ matchday: number; total: number; played: number }[]>` (solo jornadas no nulas, ordenadas); `getMatchesByMatchday(sql, competition, season, matchday): Promise<MatchRow[]>` (orden por `utc_date`, `id`; `shortName` = `COALESCE(short_name, name)`); `defaultMatchday(days: { matchday: number; played: number }[]): number | null` (la última jornada con algún partido jugado; si ninguna, la primera; `null` sin jornadas).
- Rutas: `/{liga}/{temporada}/resultados` redirige a `/resultados/{defaultMatchday}` (o muestra `EmptyState` si es `null`); `/resultados/[matchday]` valida con `parseMatchday` y `notFound()` si la jornada no existe en `getMatchdays`.
- Componentes: `MatchdayNav({ slug, season, days, active })` (enlaces anterior y siguiente con texto, y la lista de jornadas como enlaces con `aria-current`); `MatchList({ slug, season, matches })` (agrupado por día con `<h2>`; cada partido: local, marcador o la hora, visitante, marcador del descanso `(1-0)` si existe, etiqueta de estado; los equipos enlazan a su página).

- [ ] **Step 1: Tests puros** en `matches.test.ts`: `test_is_played_needs_counted_status_and_goals`, `test_status_label_in_spanish` (incluye `FINISHED` → `null` y un código desconocido), `test_format_match_date_and_time_use_madrid_time` (`2024-08-17T19:30:00Z` → hora `"21:30"`; `2024-08-17T22:30:00Z` cae en el día 18), `test_group_by_day_keeps_order_and_splits_by_madrid_day`, `test_parse_matchday_rejects_bad_input` (`""`, `"0"`, `"abc"`, `"1.5"`, `"100"`, `" 3"`), `test_default_matchday`.
- [ ] **Step 2: Tests de base de datos** en `queries/matches.test.ts` (fixture de `seedStandingsFixture`, poniendo `matchday` con `UPDATE`): `test_get_matchdays_counts_total_and_played`, `test_get_matches_by_matchday_returns_teams_and_scores` (incluye el equipo C sin escudo ni `short_name`), `test_scheduled_match_has_null_goals_and_is_listed`, `test_matches_of_another_competition_are_excluded`, `test_null_matchday_is_ignored_in_matchdays`.
- [ ] **Step 3: Tests de componentes**: `test_match_list_shows_score_for_played_and_time_for_pending`, `test_match_list_shows_status_label_for_postponed`, `test_matchday_nav_marks_active_and_links_previous_and_next`.
- [ ] **Step 4: Run** `npm test`. Expected: FAIL. **Implementar.**
- [ ] **Step 5: Run** tests, lint, typecheck y build. Expected: pasan.
- [ ] **Step 6: Commit** `feat(web): add results by matchday`.

### Task 3: Goleadores

**Files:**
- Create: `web/src/lib/queries/scorers.ts`, `web/src/lib/queries/scorers.test.ts`, `web/src/components/ScorersTable.tsx`, `web/src/app/[competition]/[season]/goleadores/page.tsx`
- Modify: `web/tests/helpers/test-db.ts` (añadir `seedPlayersFixture`), `web/src/components/components.test.tsx`, `web/src/lib/es.ts`

**Interfaces:**
- Consumes: Task 1; `TeamRef` de Task 2.
- Produces, en `test-db.ts`: `seedPlayersFixture(sql)` (requiere `seedStandingsFixture` antes): jugadores `10` "Ana Gol" (Centre-Forward, Spain, 1998-03-10), `11` "Beto Pase" (Central Midfield, Brazil, 2001-11-02), `12` "Ciro Muro" (Goalkeeper, `nationality` NULL, 1990-01-20), `13` "Dani Nadie" (posición NULL, fecha NULL); `squad_members` temporada 2024: equipo 1 → 10, 12, 13; equipo 2 → 11; `scorers` PD 2024: jugador 10 equipo 1 (7 goles, 2 asistencias, 1 penalti, 2 partidos), jugador 11 equipo 2 (7 goles, asistencias NULL, penaltis NULL, 2 partidos), jugador 13 equipo 1 (1 gol, 0, 0, 1).
- Produces, en `queries/scorers.ts`: `type ScorerRow = { rank: number; playerId: number; player: string; position: string | null; nationality: string | null; team: TeamRef | null; goals: number; assists: number | null; penalties: number | null; playedMatches: number | null }`; `getScorers(sql, competition, season, limit = 50): Promise<ScorerRow[]>` ordenado por goles desc, asistencias desc (nulos al final), nombre asc; `rank` con empates compartidos (7, 7, 1 → 1, 1, 3).
- Componente: `ScorersTable({ slug, season, rows })`: columnas `#`, `Jugador`, `Equipo`, `PJ`, `Goles` (con barra proporcional al máximo), `Asist.`, `Pen.`; nulos como `—`; en móvil se ocultan `PJ`, `Asist.` y `Pen.`; el equipo enlaza a su página.
- Ruta `/{liga}/{temporada}/goleadores`: cabecera, tabla, nota "Fuente: football-data.org. Se muestran los 50 primeros."; sin filas, `EmptyState` "No hay goleadores cargados para esta temporada".

- [ ] **Step 1: Tests de base de datos**: `test_get_scorers_orders_by_goals_then_assists_then_name` (Ana antes que Beto por asistencias), `test_ranks_are_shared_on_equal_goals` (1, 1, 3), `test_null_assists_and_penalties_stay_null`, `test_scorers_of_another_season_are_excluded`, `test_limit_is_applied`, `test_numbers_are_javascript_numbers`.
- [ ] **Step 2: Tests de componente**: `test_scorers_table_shows_dash_for_missing_values`, `test_scorers_table_links_team`.
- [ ] **Step 3: Run** `npm test`. Expected: FAIL. **Implementar.**
- [ ] **Step 4: Run** tests, lint, typecheck y build. Expected: pasan.
- [ ] **Step 5: Commit** `feat(web): add top scorers page`.

### Task 4: Consultas y lógica de la ficha de equipo

**Files:**
- Create: `web/src/lib/team.ts`, `web/src/lib/team.test.ts`, `web/src/lib/queries/team.ts`, `web/src/lib/queries/team.test.ts`
- Modify: `web/tests/helpers/test-db.ts` (añadir `seedMatchStatsFixture`)

**Interfaces:**
- Consumes: `MatchRow`, `TeamRef`, `isPlayed` (Task 2); `Result` (A2); `seedPlayersFixture` (Task 3).
- Produces, en `test-db.ts`: `seedMatchStatsFixture(sql)`: `match_stats` del partido 1 (xG 1.80 y 0.90; tiros 14 y 8; a puerta 6 y 3; córners 7 y 2; faltas 10 y 12; amarillas 1 y 3; rojas 0 y 1) y del partido 3 (xG NULL en ambos; tiros 5 y 16; a puerta 1 y 9; córners 3 y 8; faltas 14 y 9; amarillas 2 y 1; rojas 0 y 0). Además rellena `teams` del equipo 1: `venue` "Estadio A", `founded` 1900, `club_colors` "Azul / Blanco", `coach` "Míster A", `website` NULL.
- Produces, en `team.ts` (puro): `type TeamMatch = { match: MatchRow; isHome: boolean; opponent: TeamRef; goalsFor: number | null; goalsAgainst: number | null; result: Result | null }`; `toTeamMatches(matches: MatchRow[], teamId: number): TeamMatch[]` (`result` es `null` si el partido no está jugado); `type ProgressPoint = { matchday: number; points: number; cumulative: number }`; `pointsProgression(tm: TeamMatch[]): ProgressPoint[]` (solo jugados, en orden de fecha; `matchday` = el del partido o, si es nulo, el ordinal); `type PositionGroup = "goalkeepers" | "defenders" | "midfielders" | "forwards" | "unknown"`; `positionGroup(position: string | null): PositionGroup` (`Goalkeeper` → porteros; contiene `Back` o es `Defence` → defensas; contiene `Midfield` → centrocampistas; `Offence`, contiene `Forward` o `Winger` → delanteros; el resto y `null` → `unknown`); `ageOn(birth: Date | null, on: Date): number | null`; `type SplitRecord = { played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; points: number }`; `splitRecord(tm: TeamMatch[], where: "all" | "home" | "away"): SplitRecord`.
- Produces, en `queries/team.ts`: `type TeamProfile = { id: number; name: string; shortName: string; tla: string | null; crest: string | null; founded: number | null; venue: string | null; clubColors: string | null; website: string | null; coach: string | null }`; `getTeamProfile(sql, teamId): Promise<TeamProfile | null>`; `getTeamSeasons(sql, competition, teamId): Promise<number[]>` (temporadas con partidos de ese equipo en esa liga, la más reciente primero); `getTeamMatches(sql, competition, season, teamId): Promise<MatchRow[]>` (todos los estados, por fecha); `type SquadPlayer = { id: number; name: string; position: string | null; nationality: string | null; dateOfBirth: Date | null }`; `getSquad(sql, season, teamId): Promise<SquadPlayer[]>` (desde `squad_members`, por nombre); `type AdvancedStats = { matchesWithStats: number; matchesWithXg: number; xgFor: number | null; xgAgainst: number | null; shots: number | null; shotsOnTarget: number | null; corners: number | null; fouls: number | null; yellow: number | null; red: number | null }` (medias por partido con dos decimales, cada una sobre los partidos que tienen ese dato; `null` si ninguno); `getAdvancedStats(sql, competition, season, teamId): Promise<AdvancedStats>` (solo partidos jugados; valores desde el lado del equipo, sea local o visitante); `parseTeamId(raw: string): number | null` (`/^\d{1,9}$/`, mayor que 0) en `team.ts`.

- [ ] **Step 1: Tests puros** en `team.test.ts`: `test_to_team_matches_sets_side_opponent_and_result` (equipo 1: V como local 2-1, V como visitante 0-3, pendiente con `result` nulo), `test_points_progression_is_cumulative_and_skips_unplayed` (3, 6), `test_position_group_for_every_known_position` (las 15 posiciones reales: `Goalkeeper`, `Centre-Back`, `Left-Back`, `Right-Back`, `Defence`, `Defensive Midfield`, `Central Midfield`, `Attacking Midfield`, `Left Midfield`, `Right Midfield`, `Midfield`, `Left Winger`, `Right Winger`, `Centre-Forward`, `Offence`, más `null` y `"Coach"` → `unknown`), `test_age_on_before_and_after_birthday_and_null`, `test_split_record_all_home_away`, `test_parse_team_id_rejects_bad_input` (`"abc"`, `"12abc"`, `"-1"`, `"0"`, `""`, `"999999999999"`).
- [ ] **Step 2: Tests de base de datos** en `queries/team.test.ts`: `test_get_team_profile_and_unknown_team_is_null`, `test_profile_short_name_falls_back_to_name` (equipo 3), `test_get_team_seasons_newest_first_and_only_that_competition`, `test_get_team_matches_includes_unplayed_in_date_order`, `test_get_squad_comes_from_squad_members_of_that_season` (equipo 1 en 2024 tiene 3; en 2025, ninguno), `test_squad_keeps_null_fields`, `test_advanced_stats_average_only_matches_with_each_value` (equipo 1: `matchesWithStats` 2, `matchesWithXg` 1, `xgFor` 1.8, `xgAgainst` 0.9, `shots` 15 (14 y 16), `corners` 7.5, `red` 0), `test_advanced_stats_use_the_teams_side` (equipo 3 en el partido 3 es local: `shots` 5), `test_advanced_stats_without_rows_are_null` (equipo 2 en 2025), `test_xg_is_a_javascript_number`.
- [ ] **Step 3: Run** `npm test`. Expected: FAIL. **Implementar.**
- [ ] **Step 4: Run** tests, lint y typecheck. Expected: pasan.
- [ ] **Step 5: Commit** `feat(web): add team queries and pure team logic`.

### Task 5: Página de equipo (ficha, estadísticas, plantilla y partidos)

**Files:**
- Create: `web/src/components/TeamHeader.tsx`, `StatGrid.tsx`, `SquadList.tsx`, `TeamMatchList.tsx`, `web/src/app/[competition]/[season]/equipo/[teamId]/page.tsx`
- Modify: `web/src/components/SeasonNav.tsx` (prop opcional `hrefFor?: (season: number) => string`), `components.test.tsx`, `web/src/lib/es.ts`

**Interfaces:**
- Consumes: Tasks 1, 2 y 4; `getStandings`, `FormDots`, `KpiCard`, `TeamCrest`.
- Produces: `TeamHeader({ profile })` (escudo de 56 px, datos de la ficha en una lista de definición: Estadio, Fundado, Colores, "Entrenador actual"; los nulos se omiten); `StatGrid({ items }: { items: { label: string; value: string; hint?: string }[] })`; `SquadList({ players, on }: { players: SquadPlayer[]; on: Date })` (cuatro grupos con `<h3>` — Porteros, Defensas, Centrocampistas, Delanteros — y "Sin posición" solo si hay; cada jugador con nacionalidad y edad, `—` si faltan); `TeamMatchList({ slug, season, matches }: { slug: string; season: number; matches: TeamMatch[] })` (jornada, fecha, "vs" o "en" más el rival enlazado, marcador con el círculo V/E/D, o la hora y el estado si no se ha jugado).
- Página `/{liga}/{temporada}/equipo/{teamId}`: valida con `parseTeamId`; `notFound()` si el perfil no existe o el equipo no tiene partidos en esa liga y temporada. `<h1>` = nombre del equipo; subtítulo "{liga} · Temporada {t}"; `LeagueHeader` con `section={null}` y `title`; `SeasonNav` con las temporadas del equipo (`getTeamSeasons`) enlazando a la misma ficha. Secciones con `<h2>`: Resumen (posición en la tabla, puntos, balance V-E-D, goles a favor y en contra, forma de los últimos 5; y la división casa/fuera), Estadísticas por partido (`StatGrid` con xG a favor y en contra, tiros, tiros a puerta, córners, faltas, amarillas, rojas; cada cifra con coma decimal; nota "Medias de N partidos; xG disponible en M"; cada valor nulo es "No disponible"), Plantilla (nota "Plantilla de la temporada {t}"; vacía → "No hay plantilla cargada para esta temporada"), Partidos (jugados del más reciente al más antiguo y, aparte, próximos).

- [ ] **Step 1: Tests de componentes**: `test_team_header_labels_coach_as_current_and_omits_missing_fields`, `test_stat_grid_renders_value_and_hint`, `test_squad_list_groups_by_position_and_shows_dash_for_missing`, `test_squad_list_hides_unknown_group_when_empty`, `test_team_match_list_shows_result_letter_for_played_and_status_for_pending`, `test_season_nav_uses_custom_href`.
- [ ] **Step 2: Run** `npm test`. Expected: FAIL. **Implementar.**
- [ ] **Step 3: Run** tests, lint, typecheck y build. Expected: pasan.
- [ ] **Step 4: Commit** `feat(web): add team page with profile, stats, squad and matches`.

### Task 6: Evolución de puntos y temporadas del equipo

**Files:**
- Create: `web/src/lib/chart.ts`, `web/src/lib/chart.test.ts`, `web/src/components/LineChart.tsx`
- Modify: `web/src/app/[competition]/[season]/equipo/[teamId]/page.tsx`, `components.test.tsx`, `web/src/lib/es.ts`, `web/src/app/globals.css` (solo si hace falta un token de serie secundaria en gris)

**Interfaces:**
- Consumes: `pointsProgression`, `ProgressPoint`, `getTeamSeasons`, `getTeamMatches`, `toTeamMatches`, `getStandings`.
- Produces, en `chart.ts` (puro): `type Series = { id: string; label: string; points: { x: number; y: number }[]; highlight: boolean }`; `type ChartLayout = { width: number; height: number; xMax: number; yMax: number; xTicks: number[]; yTicks: number[]; paths: { id: string; d: string; highlight: boolean }[] }`; `layoutLineChart(series: Series[], size: { width: number; height: number; padding: number }): ChartLayout` (`xMax` e `yMax` son los máximos de los datos, con mínimo 1; `yTicks` de 0 a un múltiplo "redondo" (10, 20, 30…) que cubre `yMax`; coordenadas con un decimal; una serie con un solo punto genera un `d` válido `M x y`; sin series, `paths` vacío).
- Produces: `LineChart({ series, ariaLabel, xLabel, yLabel }: { series: Series[]; ariaLabel: string; xLabel: string; yLabel: string })`: `<svg role="img" aria-label>` con `viewBox`, ancho 100 %, ejes y marcas con cifras, la serie destacada en el color de acento con trazo de 2,5 px y las demás en gris (`--muted`) con 1,5 px, y una leyenda de texto debajo (no solo color: la destacada lleva también el rótulo "temporada actual").
- Página de equipo, sección nueva "Evolución" entre Resumen y Estadísticas: gráfico de puntos acumulados por jornada con una serie por temporada del equipo en esa liga (destacada la que se está viendo), y una tabla "Temporadas" con una fila por temporada: temporada (enlace a la ficha de esa temporada), posición final o actual, PJ, puntos, goles a favor y en contra. La tabla es la alternativa accesible del gráfico. Con una sola temporada el gráfico se muestra igual.

- [ ] **Step 1: Tests puros** en `chart.test.ts`: `test_layout_scales_points_into_the_padded_area` (el primer punto cae en el borde izquierdo y el máximo en el borde superior del área), `test_y_ticks_are_round_and_cover_the_maximum` (máximo 88 → llega a 90), `test_single_point_series_is_a_valid_path`, `test_no_series_gives_no_paths`, `test_highlight_flag_is_kept`.
- [ ] **Step 2: Test de componente**: `test_line_chart_has_role_img_label_and_one_path_per_series`, `test_line_chart_legend_names_every_series`.
- [ ] **Step 3: Run** `npm test`. Expected: FAIL. **Implementar.**
- [ ] **Step 4: Run** tests, lint, typecheck y build. Expected: pasan.
- [ ] **Step 5: Commit** `feat(web): add points evolution chart and seasons table to team page`.

### Task 7: Comparador de dos equipos

**Files:**
- Create: `web/src/lib/compare.ts`, `web/src/lib/compare.test.ts`, `web/src/lib/queries/head-to-head.ts`, `web/src/lib/queries/head-to-head.test.ts`, `web/src/components/CompareForm.tsx`, `CompareTable.tsx`, `web/src/app/[competition]/[season]/comparar/page.tsx`
- Modify: `components.test.tsx`, `web/src/lib/es.ts`

**Interfaces:**
- Consumes: Tasks 1, 2 y 4; `getStandings`, `StandingRow`, `AdvancedStats`, `getAdvancedStats`, `MatchList`.
- Produces, en `compare.ts` (puro): `type CompareSelection = { a: number | null; b: number | null; error: "same" | "unknown" | null }`; `parseSelection(rawA: string | string[] | undefined, rawB: string | string[] | undefined, teamIds: number[]): CompareSelection` (ids válidos con `parseTeamId`; un id que no está en `teamIds` → ese lado `null` y `error: "unknown"`; `a === b` → `b` `null` y `error: "same"`; un array usa su primer elemento); `type CompareRow = { label: string; a: string; b: string; better: "a" | "b" | null }`; `buildCompareRows(a: { row: StandingRow; adv: AdvancedStats }, b: { row: StandingRow; adv: AdvancedStats }): CompareRow[]` con las filas, en orden: Posición (menor es mejor), Puntos, Partidos jugados (sin "mejor"), Victorias, Goles a favor, Goles en contra (menor es mejor), Diferencia de goles, xG a favor por partido, xG en contra por partido (menor es mejor), Tiros por partido, Tiros a puerta por partido, Córners por partido, Faltas por partido (sin "mejor"), Amarillas por partido (menor es mejor); un valor nulo se pinta "No disponible" y deja `better` en `null`; en empate, `null`.
- Produces, en `queries/head-to-head.ts`: `getHeadToHead(sql, competition, teamA, teamB): Promise<MatchRow[]>` (todos los partidos entre ambos en esa liga en todas las temporadas de la base, del más reciente al más antiguo).
- Componentes: `CompareForm({ slug, season, teams, a, b }: { slug: string; season: number; teams: { id: number; name: string }[]; a: number | null; b: number | null })` (un `<form method="get">` hacia `sectionHref(slug, season, "comparar")` con dos `<select name="a">` y `<select name="b">` con `<label>` visible y un botón "Comparar"; funciona sin JavaScript); `CompareTable({ a, b, rows })` (cabecera con los dos equipos y sus escudos; el lado mejor en negrita con el texto oculto "mejor" para lectores de pantalla).
- Página `/{liga}/{temporada}/comparar?a=&b=`: `searchParams` es `Promise`; equipos del selector = los de `getStandings` por nombre. Sin selección completa muestra el formulario y el texto "Elige dos equipos para compararlos"; con `error` muestra además "Elige dos equipos distintos" o "Ese equipo no juega en esta liga y temporada" junto al formulario; con selección completa muestra `CompareTable`, y "Enfrentamientos directos" con `MatchList` (o "No hay partidos entre ellos en los datos cargados").

- [ ] **Step 1: Tests puros** en `compare.test.ts`: `test_parse_selection_accepts_two_valid_teams`, `test_parse_selection_flags_same_team`, `test_parse_selection_flags_unknown_team_and_bad_input` (`"abc"`, id ajeno, `undefined`), `test_parse_selection_takes_first_of_array`, `test_build_compare_rows_marks_better_side` (posición y goles en contra: gana el menor), `test_build_compare_rows_null_values_are_not_available_and_have_no_winner`, `test_build_compare_rows_tie_has_no_winner`.
- [ ] **Step 2: Tests de base de datos**: `test_head_to_head_returns_both_legs_newest_first` (equipos 1 y 2: partidos 4 y 1), `test_head_to_head_spans_seasons_but_not_competitions`, `test_head_to_head_without_matches_is_empty`.
- [ ] **Step 3: Tests de componentes**: `test_compare_form_has_labels_selects_and_preselected_values`, `test_compare_table_marks_better_side_for_screen_readers`.
- [ ] **Step 4: Run** `npm test`. Expected: FAIL. **Implementar.**
- [ ] **Step 5: Run** tests, lint, typecheck y build. Expected: pasan.
- [ ] **Step 6: Commit** `feat(web): add two-team comparator`.

### Task 8: Verificación con datos reales (la hace el controlador)

- [ ] **Step 1:** Arrancar `npm run dev` y abrir por `localhost`.
- [ ] **Step 2:** Comparar cada página con una consulta SQL directa a `sports` (solo lectura): número de partidos de una jornada, máximo goleador de PD 2024, puntos y posición del Barcelona (id 81) en 2024, tamaño de su plantilla, medias de tiros, y los enfrentamientos Barcelona–Real Madrid.
- [ ] **Step 3:** Revisar a 1300 px y 375 px (sin scroll horizontal) cada sección nueva; rutas inválidas (`/pd/2024/equipo/abc`, `/pd/2024/resultados/99`, `/pd/2024/comparar?a=81&b=81`).
- [ ] **Step 4:** Actualizar `web/README.md` (rutas) y el README del proyecto (secciones de la web).
- [ ] **Step 5: Commit** `docs(web): document the new sections`.
