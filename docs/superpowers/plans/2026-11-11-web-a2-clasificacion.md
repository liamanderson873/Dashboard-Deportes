# Web, fase A2 (base y Clasificación): plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una aplicación Next.js en español, con la dirección visual A (clara y limpia), que lee de PostgreSQL y muestra la Clasificación de cada liga y temporada, con el aspecto de la maqueta `docs/design/maquetas/clasificacion.html` (pestaña A).

**Architecture:** Aplicación Next.js (App Router, TypeScript estricto) en `01-dashboard-deportes/web/`. Los componentes de servidor consultan PostgreSQL directamente con SQL (`postgres.js`); no hay API intermedia ni llamadas a APIs externas. La lógica pura (resumen, zonas, formatos) está separada de las consultas y de los componentes para probarla sin base de datos. Las ligas y temporadas se eligen con enlaces, sin JavaScript de cliente.

**Tech Stack:** Next.js (última versión estable, App Router), React, TypeScript, Tailwind CSS, `postgres` (postgres.js), Vitest, npm, Node 24.

**Spec:** `docs/superpowers/specs/2026-11-11-dashboard-web-nextjs-design.md` (secciones "Arquitectura" y "Dirección visual"). Referencia visual: `docs/design/maquetas/clasificacion.html`.

## Global Constraints

- Proyecto en `01-dashboard-deportes/web/`; rutas relativas a esa carpeta salvo que se diga lo contrario. Windows 11, Node 24, npm.
- **La web solo lee de PostgreSQL**: nunca llama a una API externa y **nunca ejecuta `init_schema` ni crea tablas** (el esquema lo gestiona Python).
- Toda la interfaz en **español**; `<html lang="es">`.
- Solo modo claro. Un solo color de acento (`#1E40AF`), sin degradados ni brillos. Tokens: fondo `#F8FAFC`, tarjetas `#FFFFFF`, borde `#E2E8F0`, texto `#0F172A`, texto secundario `#475569`, barra `#BFDBFE`, victoria `#15803D`, empate `#64748B`, derrota `#DC2626`. Fira Sans para el texto y Fira Code con números tabulados para las cifras, con `next/font`.
- Accesibilidad: contraste mínimo 4,5:1 en el texto, foco visible, una `<caption>` en la tabla, los círculos de forma con letra y un texto accesible; sin depender solo del color.
- Adaptada al móvil: sin desplazamiento horizontal de la página a 375 px.
- Las cifras que salen de SQL deben llegar como **números de JavaScript**: `count`, `sum` y diferencias se convierten con `::int` en la consulta (postgres.js devuelve `bigint` y `numeric` como texto).
- La clave de la base de datos va en `web/.env.local` (ignorado por git); `web/.env.example` solo lleva el nombre de la variable y una URL local sin secretos. La web **no** recibe las claves de las APIs.
- PostgreSQL local en `127.0.0.1:5433`; la URL de Python lleva `postgresql+psycopg://` y la web la normaliza a `postgresql://`.
- Se cuentan los partidos con estado `FINISHED` y `AWARDED`; `SCHEDULED`, `POSTPONED` y los demás no. Desempate: puntos, diferencia de goles, goles a favor, nombre del equipo.
- Los escudos vienen de la columna `teams.crest` (URL de `crests.football-data.org`).
- Los tests de base de datos usan solo `sports_test` (`TEST_DATABASE_URL`, por defecto `postgresql://sports:sports@127.0.0.1:5433/sports_test`) y no deben ejecutarse a la vez que `pytest`, que usa la misma base.

## Review Focus

- La base de datos apagada o inaccesible muestra un mensaje en español con el comando para arrancarla (`docker compose up -d`), no una traza.
- Una URL con liga o temporada que no existe (`/xx/2026`, `/pd/abc`, `/pd/1999`) muestra la página 404 en español, no un error.
- Los números llegan como `number` (no como texto) y la clasificación coincide con la de Python: partidos adjudicados cuentan, aplazados no, y el desempate es el mismo.
- Un equipo sin escudo (`crest` nulo) se muestra con las siglas, sin imagen rota.
- A 375 px no hay desplazamiento horizontal de la página y la tabla sigue legible.

---

### Task 1: Proyecto y herramientas

**Files:**
- Create: `web/` (proyecto Next.js), `web/vitest.config.ts`, `web/.env.example`, `web/README.md`
- Modify: `.gitignore` (raíz, solo si hiciera falta para `web/node_modules`, `web/.next`, `web/.env.local`)

**Interfaces:**
- Produces: scripts de npm `dev`, `build`, `start`, `lint`, `typecheck` (`tsc --noEmit`), `test` (`vitest run`); alias de importación `@/*` hacia `src/*`; TypeScript con `strict` activado.

- [ ] **Step 1: Crear el proyecto.** Desde `01-dashboard-deportes/`: `npx create-next-app@latest web` con TypeScript, App Router, Tailwind, ESLint, carpeta `src/`, alias `@/*` y npm (sin Turbopack si pregunta, salvo que sea el valor por defecto de la versión). Añadir las dependencias `postgres` y, como desarrollo, `vitest`.
- [ ] **Step 2: Escribir un test mínimo que falle** en `web/src/lib/sanity.test.ts`: debe importar un módulo inexistente, `@/lib/competitions`, y comprobar `COMPETITIONS.length === 5`. Run: `npm test`. Expected: FAIL (módulo no existe).
- [ ] **Step 3: Configurar** `vitest.config.ts` (entorno `node`, alias `@` a `src`, `fileParallelism: false`), los scripts, `web/.env.example` (`DATABASE_URL=postgresql://sports:sports@127.0.0.1:5433/sports`) y `web/README.md` (cómo arrancar). Borrar el contenido de ejemplo de `src/app/page.tsx` y `globals.css` que deje el generador.
- [ ] **Step 4: Verificar.** Run: `npm run lint`, `npm run typecheck` y `npm run build`. Expected: los tres terminan sin errores (el test de la Step 2 sigue fallando hasta la tarea 2 y se borra allí).
- [ ] **Step 5: Commit** `feat(web): scaffold Next.js project with Vitest`.

### Task 2: Diseño, tipografía, español y ayudantes puros

**Files:**
- Create: `web/src/lib/competitions.ts`, `web/src/lib/competitions.test.ts`, `web/src/lib/es.ts`
- Modify: `web/src/app/globals.css`, `web/src/app/layout.tsx`
- Delete: `web/src/lib/sanity.test.ts`

**Interfaces:**
- Produces, en `competitions.ts`:
  - `type CompetitionCode = "PD" | "PL" | "SA" | "BL1" | "FL1"` y `type Competition = { code: CompetitionCode; slug: string; name: string; country: string }`.
  - `COMPETITIONS: readonly Competition[]` con LaLiga (`pd`, España), Premier League (`pl`, Inglaterra), Serie A (`sa`, Italia), Bundesliga (`bl1`, Alemania) y Ligue 1 (`fl1`, Francia), en ese orden.
  - `competitionBySlug(slug: string): Competition | undefined` (insensible a mayúsculas).
  - `formatSeason(startYear: number): string` (`2026` -> `"2026-27"`, `2099` -> `"2099-00"`).
  - `parseSeason(raw: string): number | null` (solo cuatro dígitos enteros entre 2000 y 2100; en otro caso `null`).
- Produces, en `es.ts`: un objeto `es` con todos los textos de la interfaz (títulos, cabeceras `PJ`, `DG`, `Forma`, `Puntos`, etiquetas de tarjetas, mensajes de error y de estado vacío, texto de la leyenda).

- [ ] **Step 1: Tests en `competitions.test.ts`:** `test_competitions_are_the_five_leagues_in_order`, `test_competition_by_slug_is_case_insensitive_and_unknown_is_undefined`, `test_format_season` (2026 -> "2026-27", 2024 -> "2024-25", 2099 -> "2099-00"), `test_parse_season_accepts_four_digit_years_in_range` (`"2026"` sí; `"abc"`, `"1999"`, `"20260"`, `"26"`, `""`, `"2026.5"`, `" 2026"` no).
- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implementar** los módulos. En `globals.css` definir los tokens de la sección Global Constraints como variables y utilidades de Tailwind (`@theme`), con el fondo y el texto base. En `layout.tsx`: `<html lang="es">`, Fira Sans y Fira Code con `next/font/google` expuestas como variables CSS, un contenedor central de ancho máximo 1040 px, el título de la aplicación "Estadísticas de fútbol" y un enlace "Saltar al contenido" visible con el foco.
- [ ] **Step 4: Run** `npm test`, `npm run lint`, `npm run typecheck`. Expected: pasan.
- [ ] **Step 5: Commit** `feat(web): add design tokens, fonts, Spanish strings and competition helpers`.

### Task 3: Capa de base de datos

**Files:**
- Create: `web/src/lib/db.ts`, `web/src/lib/db.test.ts`, `web/tests/helpers/test-db.ts`

**Interfaces:**
- Produces, en `db.ts`: `normalizeDatabaseUrl(url: string): string` (quita el sufijo de driver del esquema: `postgresql+psycopg://` -> `postgresql://`, `postgres+x://` -> `postgres://`; un esquema sin sufijo no cambia); `class DatabaseConfigError extends Error`; `getSql(): Sql` que crea una sola conexión (reutilizada entre recargas en desarrollo guardándola en `globalThis`) a partir de `process.env.DATABASE_URL` normalizada y lanza `DatabaseConfigError` con un mensaje en español que nombra `DATABASE_URL` y `web/.env.local` si falta.
- Produces, en `tests/helpers/test-db.ts`: `testSql(): Sql` (conexión a `TEST_DATABASE_URL`), `resetTestDatabase(sql: Sql): Promise<void>` (borra las tablas `match_stats, squad_members, scorers, players, competitions, matches, teams` con `DROP TABLE IF EXISTS ... CASCADE` y ejecuta el contenido de `../sql/schema.sql`, resuelto desde la ubicación del archivo, con `sql.unsafe`), y `seedStandingsFixture(sql: Sql): Promise<void>` que inserta los equipos `A` (id 1), `B` (2), `C` (3) con escudo nulo en el equipo `C` y partidos de `PD` 2024: 1) jornada 1, 2024-08-15, FINISHED, A 2-1 B; 2) jornada 2, 2024-08-22, FINISHED, B 1-1 C; 3) jornada 3, 2024-08-29, FINISHED, C 0-3 A; 4) jornada 4, 2024-09-05, SCHEDULED, A-B sin marcador.

- [ ] **Step 1: Tests en `db.test.ts`:** `test_normalize_database_url_strips_the_driver_suffix` (los tres casos), `test_get_sql_without_database_url_raises_a_spanish_config_error` (el mensaje contiene `DATABASE_URL` y `.env.local`; se prueba con la variable borrada y restaurada), `test_reset_test_database_creates_the_schema_from_the_python_file` (tras `resetTestDatabase` existen las tablas `teams`, `matches`, `squad_members`, `match_stats`).
- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implementar.** `postgres` con `max` pequeño y `prepare: false` solo si hiciera falta; ningún acceso a la red salvo PostgreSQL.
- [ ] **Step 4: Run** `npm test` (con `docker compose up -d` y sin `pytest` en marcha), `npm run lint`, `npm run typecheck`. Expected: pasan.
- [ ] **Step 5: Commit** `feat(web): add database layer and test helpers`.

### Task 4: Consultas y lógica de la clasificación

**Files:**
- Create: `web/src/lib/standings.ts`, `web/src/lib/standings.test.ts`, `web/src/lib/queries/standings.ts`, `web/src/lib/queries/standings.test.ts`

**Interfaces:**
- Consumes: `Sql` de `postgres`, `testSql`, `resetTestDatabase`, `seedStandingsFixture` (Task 3), `COMPETITIONS` (Task 2).
- Produces, en `standings.ts` (puro): `type Result = "W" | "D" | "L"`; `type StandingRow = { position: number; teamId: number; team: string; shortName: string; tla: string | null; crest: string | null; played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; goalDifference: number; points: number; form: Result[] }` (`form` con los últimos 5 partidos, del más antiguo al más reciente); `type StandingsSummary = { leader: StandingRow; bestAttack: StandingRow; bestDefense: StandingRow; goalsPerMatch: number; matchesPlayed: number }`; `summarize(rows: StandingRow[]): StandingsSummary | null` (`null` si no hay filas; mejor ataque = más goles a favor, mejor defensa = menos goles en contra, en empate la primera fila de la tabla; `matchesPlayed` = suma de `played` entre 2; `goalsPerMatch` = goles a favor totales entre `matchesPlayed`, con dos decimales); `type Zone = "top" | "bottom" | null`; `zoneFor(position: number, total: number): Zone` (`top` las posiciones 1 a 4 y `bottom` las 3 últimas, solo si `total >= 10`, en otro caso `null`); `formAriaLabel(form: Result[]): string` (`"Últimos 5 partidos: victoria, empate, derrota"` con tantos elementos como haya, y `"Sin partidos jugados"` si está vacía).
- Produces, en `queries/standings.ts`: `COUNTED_STATUSES = ["FINISHED", "AWARDED"] as const`; `getStandings(sql: Sql, competition: CompetitionCode, season: number): Promise<StandingRow[]>`; `getAvailableSeasons(sql: Sql, competition: CompetitionCode): Promise<number[]>` (temporadas con partidos, de la más reciente a la más antigua); `getDefaultView(sql: Sql): Promise<{ competition: CompetitionCode; season: number } | null>` (la temporada más reciente de LaLiga si existe; si no, de la primera liga de `COMPETITIONS` que tenga partidos; `null` si no hay ninguno).

- [ ] **Step 1: Tests puros en `standings.test.ts`:** `test_summarize_picks_leader_best_attack_and_best_defense` (con tres filas A 6 pts gf 5 ga 1, B 1 pt gf 2 ga 3, C 1 pt gf 1 ga 4: líder A, ataque A con 5, defensa A con 1, `matchesPlayed` 3, `goalsPerMatch` 2.67), `test_summarize_of_no_rows_is_null`, `test_zone_for_marks_top_four_and_bottom_three_only_in_big_tables` (posición 1 y 4 `top`, 5 `null`, 18 a 20 `bottom` con 20 filas; con 8 filas siempre `null`), `test_form_aria_label_in_spanish` (incluye el caso vacío).
- [ ] **Step 2: Tests de base de datos en `queries/standings.test.ts`** (antes de cada uno `resetTestDatabase` y `seedStandingsFixture`): `test_get_standings_matches_the_python_results` (orden A, B, C; puntos 6, 1, 1; diferencia de goles 4, -1, -3; `played` 2, 2, 2; posiciones 1, 2, 3), `test_numbers_are_javascript_numbers` (`typeof` de `played`, `points`, `goalDifference` y `goalsFor` es `"number"`), `test_unplayed_matches_do_not_count` (el partido SCHEDULED no suma jugados), `test_awarded_matches_count_and_postponed_do_not` (se añaden un AWARDED C-A 0-3 y un POSTPONED sin marcador: A pasa a 9 puntos, `played` 3 y diferencia 7; C queda con 1 punto y `played` 3), `test_form_lists_the_last_results_oldest_first` (A: `["W","W"]`; B: `["L","D"]`), `test_team_without_crest_has_null_crest` (C), `test_standings_of_an_unknown_season_is_empty`, `test_get_available_seasons_newest_first` (se añade un partido de la temporada 2025), `test_get_default_view_prefers_the_latest_laliga_season`, `test_get_default_view_is_null_without_matches`.
- [ ] **Step 3: Run** `npm test`. Expected: FAIL.
- [ ] **Step 4: Implementar.** La consulta de clasificación suma por equipo con una `UNION ALL` de local y visitante sobre los estados contados y ordena por puntos, diferencia, goles a favor y nombre; todas las cifras con `::int`. La forma se obtiene en una segunda consulta con `row_number()` por equipo (los 5 partidos más recientes) y se une en TypeScript. Los estados se pasan como parámetro, no se escriben a mano en el texto SQL.
- [ ] **Step 5: Run** `npm test`, `npm run lint`, `npm run typecheck`. Expected: pasan.
- [ ] **Step 6: Commit** `feat(web): add standings queries and pure standings logic`.

### Task 5: Componentes de la Clasificación

**Files:**
- Create: `web/src/components/TeamCrest.tsx`, `FormDots.tsx`, `PointsBar.tsx`, `KpiCard.tsx`, `StandingsTable.tsx`, `LeagueNav.tsx`, `SeasonNav.tsx`, `EmptyState.tsx`, y `web/src/components/components.test.tsx`
- Modify: `web/next.config.ts` (permitir imágenes remotas de `crests.football-data.org`)

**Interfaces:**
- Consumes: `StandingRow`, `Zone`, `zoneFor`, `formAriaLabel`, `summarize` (Task 4), `COMPETITIONS`, `formatSeason` (Task 2), tokens y `es` (Task 2).
- Produces (todos componentes de servidor): `TeamCrest({ crest, tla, size }: { crest: string | null; tla: string | null; size: number })` (imagen con `alt=""` porque el nombre está al lado; si `crest` es nulo, un círculo con las siglas; usa `next/image` con `unoptimized`); `FormDots({ form }: { form: Result[] })` (un contenedor con `role="img"` y `aria-label` de `formAriaLabel`; cada círculo muestra `V`, `E` o `D` con el color de victoria, empate o derrota); `PointsBar({ points, max }: { points: number; max: number })` (barra de ancho proporcional y la cifra en Fira Code); `KpiCard({ label, children }: { label: string; children: React.ReactNode })`; `StandingsTable({ rows }: { rows: StandingRow[] })` (`<table>` con `<caption>` solo para lectores de pantalla, columnas `#`, `Equipo`, `PJ`, `DG`, `Forma`, `Puntos`, `data-zone="top" | "bottom"` en las filas de esas zonas y franja de color a la izquierda; en pantallas estrechas se ocultan `DG` y `Forma` y la barra de puntos); `LeagueNav({ activeSlug, season }: { activeSlug: string; season: number })` (enlaces a `/{slug}/{season}`, el activo con `aria-current="page"`); `SeasonNav({ slug, seasons, active }: { slug: string; seasons: number[]; active: number })` (enlaces `/{slug}/{año}` con el texto de `formatSeason`); `EmptyState({ title, children }: { title: string; children?: React.ReactNode })`.

- [ ] **Step 1: Tests en `components.test.tsx`** con `renderToStaticMarkup` (sin dependencias nuevas): `test_form_dots_has_spanish_aria_label_and_letters` (`aria-label` contiene "victoria", las letras `V`, `E`, `D` aparecen), `test_team_crest_without_url_shows_the_abbreviation`, `test_standings_table_has_caption_headers_and_one_row_per_team`, `test_standings_table_marks_zones_in_big_tables` (con 20 filas: 4 `data-zone="top"` y 3 `data-zone="bottom"`), `test_league_nav_marks_only_the_active_league`, `test_season_nav_labels_seasons_as_start_dash_end`, `test_points_bar_width_is_proportional_to_the_leader`.
- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implementar** con Tailwind y los tokens; reproducir el aspecto de la maqueta A (tarjetas redondeadas, tabla con cabecera gris claro, escudos de 28 px, círculos de 22 px, franja azul de las primeras posiciones). Las cadenas vienen de `es`.
- [ ] **Step 4: Run** `npm test`, `npm run lint`, `npm run typecheck`. Expected: pasan.
- [ ] **Step 5: Commit** `feat(web): add standings components`.

### Task 6: Páginas, rutas y estados de error

**Files:**
- Create: `web/src/lib/route-params.ts`, `web/src/lib/route-params.test.ts`, `web/src/app/[competition]/[season]/page.tsx`, `web/src/app/not-found.tsx`, `web/src/app/error.tsx`, `web/src/app/loading.tsx`
- Modify: `web/src/app/page.tsx`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: `resolveRoute(slug: string, season: string): { competition: Competition; season: number } | null` en `route-params.ts`; `/` redirige a `/{slug}/{season}` de `getDefaultView` (si es `null` muestra `EmptyState` con el comando `python -m sports_dashboard.ingest --competitions PD --seasons 2024`); `/{competition}/{season}` (`export const dynamic = "force-dynamic"`, `params` como `Promise`) valida con `resolveRoute` y llama a `notFound()` si alguno no es válido o si la temporada no figura en `getAvailableSeasons`; muestra la cabecera con la liga y "Temporada 2026-27 · N partidos jugados", `LeagueNav`, `SeasonNav`, las cuatro `KpiCard` (Líder, Mejor ataque, Mejor defensa, Goles por partido), la tabla y la leyenda; si no hay filas muestra `EmptyState` "Todavía no hay partidos terminados en esta temporada"; `generateMetadata` con el título `"{liga} {temporada} · Clasificación"`; `not-found.tsx` con texto en español y enlace al inicio; `error.tsx` (componente de cliente) con el mensaje en español "No se pudo leer la base de datos", los pasos (`docker compose up -d`, comprobar `web/.env.local`) y un botón "Reintentar" que llama a `reset`; `loading.tsx` con un esqueleto que mantiene la estructura.

- [ ] **Step 1: Tests en `route-params.test.ts`:** `test_resolve_route_accepts_valid_pairs`, `test_resolve_route_rejects_unknown_slug_and_bad_seasons` (`xx`, `abc`, `1999`, `""`).
- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implementar** `route-params.ts`, las páginas y los estados. La página usa `getSql()` y las consultas en paralelo (`Promise.all`); no captura los errores de base de datos (los recoge `error.tsx`).
- [ ] **Step 4: Run** `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`. Expected: pasan; el build no necesita la base de datos porque la página es dinámica.
- [ ] **Step 5: Commit** `feat(web): add standings page, routes and error states`.

### Task 7: Verificación con datos reales (controlador, con el usuario)

**Files:**
- Create: `web/.env.local` (solo el controlador; no se versiona)
- Modify: `web/README.md`, `README.md`

- [ ] **Step 1: Crear `web/.env.local`** con una sola línea `DATABASE_URL=` copiada de la variable del mismo nombre del `.env` del proyecto, sin imprimir ni copiar ninguna otra clave.
- [ ] **Step 2: Arrancar** `npm run dev` en `web/` (puerto 3000) y abrir `/` en el navegador. Expected: redirige a `/pd/2026`.
- [ ] **Step 3: Comprobar las cifras reales.** `/pl/2026`: Arsenal 27 puntos, Brighton 22, Manchester City 21, Liverpool 18 con 10 partidos jugados cada uno. `/pd/2024`: Barcelona 88 y Real Madrid 84. `/bl1/2024`: Union Berlin 40 puntos y Bochum 25, ambos con 34 partidos.
- [ ] **Step 4: Comparar con la maqueta A** a 1300 px y a 375 px (capturas): escudos, círculos de forma, barra de puntos, tarjetas. A 375 px no hay desplazamiento horizontal de la página.
- [ ] **Step 5: URLs inválidas y error.** `/xx/2026`, `/pd/abc` y `/pd/1999` muestran la página 404 en español; con `docker compose stop` la página muestra el mensaje de la base de datos y, tras `docker compose start`, "Reintentar" la recupera.
- [ ] **Step 6: Documentar** en `web/README.md` (arranque, variables, scripts) y una sección corta en el `README.md` del proyecto; `npm run lint`, `npm run typecheck`, `npm test` y `npm run build` en verde.
- [ ] **Step 7: Commit** `docs(web): document how to run the web app`.
