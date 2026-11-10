# Dashboard de deportes, fase 1 (fútbol): plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dashboard de fútbol (tabla de liga, resultados, evolución de un equipo) que lee de PostgreSQL, alimentado por una descarga desde football-data.org.

**Architecture:** Un paquete Python `sports_dashboard` con capas pequeñas: `client` (HTTP), `transform` (limpieza con pandas, función pura), `ingest` (guarda en PostgreSQL de forma idempotente), `queries` (SQL de lectura) y `app.py` (Streamlit, solo lee de la base). La interfaz nunca llama a la API.

**Tech Stack:** Python 3.12, pandas, SQLAlchemy 2 + psycopg 3, PostgreSQL 16 en Docker Compose, Streamlit, pytest, requests, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-10-dashboard-deportes-design.md`

## Global Constraints

- Proyecto en `<repo-root>\01-dashboard-deportes\`; la raíz `Portfolio-Practicas` es el repositorio git.
- Solo planes gratuitos; sin coste.
- football-data.org gratuito: unas 10 peticiones por minuto, 12 competiciones, sin estadísticas por partido (cifra de terceros, confirmar al registrar la clave).
- La clave de API la crea el usuario y va en `.env`, nunca en git. Se sube `.env.example` sin valores.
- README en inglés y cita de la fuente de datos (football-data.org).
- La interfaz lee siempre de PostgreSQL, nunca de la API.
- Windows 11; Docker Desktop para PostgreSQL.
- Claude escribe todo el código y explica cada paso al usuario antes y después de hacerlo (qué, por qué, alternativas).
- Supuesto sin verificar: formato JSON de la API v4 (`matches[]` con `id`, `utcDate`, `status`, `matchday`, `homeTeam{id,name}`, `awayTeam{id,name}`, `score.fullTime.home/away`), cabecera `X-Auth-Token` y códigos de liga `PD` y `PL`. Se confirma en la tarea 3 con la primera respuesta real.

## Review Focus

- Clave ausente o inválida (HTTP 401/403): error claro que dice qué variable falta, no un traceback.
- Límite excedido (HTTP 429): reintento con espera, sin perder datos ya guardados.
- Partidos sin jugar (`score` nulo, estado `SCHEDULED` o `POSTPONED`): no cuentan en la tabla de liga.
- Base de datos vacía o temporada sin datos: el dashboard muestra un aviso, no falla.
- Ejecutar la descarga dos veces: no duplica filas.

---

### Task 1: Andamiaje, Docker y configuración

**Files:**
- Create: `01-dashboard-deportes/docker-compose.yml`, `.env.example`, `requirements.txt`, `src/sports_dashboard/__init__.py`, `src/sports_dashboard/config.py`, `tests/test_config.py`, `.gitignore` (raíz)
- Run: `git init` en la raíz

**Interfaces:**
- Produces: `Settings` (dataclass) con `database_url: str`, `football_api_key: str`; `load_settings(env: Mapping[str, str] | None = None) -> Settings` que lanza `ConfigError` con el nombre de la variable que falta.

- [ ] **Step 1: Test `test_missing_api_key_raises_config_error_naming_variable`**: `load_settings({"DATABASE_URL": "x"})` lanza `ConfigError` cuyo mensaje contiene `FOOTBALL_API_KEY`. Test `test_loads_both_values`.
- [ ] **Step 2: Run** `pytest 01-dashboard-deportes/tests/test_config.py -v`. Expected: FAIL (módulo no existe).
- [ ] **Step 3: Implementar `config.py`** (lee `os.environ` si no se pasa mapping; carga `.env` con python-dotenv). Crear `docker-compose.yml` con servicio `db` (postgres:16, volumen, puerto 5432, base `sports`, y base extra `sports_test`), `.env.example`, `.gitignore` (ignora `.env`, `.venv`, `__pycache__`, volúmenes).
- [ ] **Step 4: Run** el test. Expected: PASS. Luego `docker compose up -d` y `docker compose ps` muestra `db` healthy.
- [ ] **Step 5: Commit** `chore: scaffold project, docker compose and settings`.

### Task 2: Esquema de base de datos

**Files:**
- Create: `01-dashboard-deportes/sql/schema.sql`, `src/sports_dashboard/db.py`, `tests/conftest.py`, `tests/test_db.py`

**Interfaces:**
- Consumes: `Settings.database_url`.
- Produces: `get_engine(url: str) -> Engine`; `init_schema(engine: Engine) -> None` (ejecuta `schema.sql`, idempotente). Tablas: `teams(id int pk, name text)`, `matches(id int pk, competition text, season int, matchday int, utc_date timestamptz, status text, home_team_id int, away_team_id int, home_goals int null, away_goals int null)`. Fixture `engine` en `conftest.py` apunta a `sports_test` y vacía las tablas antes de cada test.

- [ ] **Step 1: Test `test_init_schema_creates_tables_and_is_idempotent`**: llama dos veces a `init_schema` y comprueba con `inspect(engine).get_table_names()` que existen `teams` y `matches`.
- [ ] **Step 2: Run** `pytest tests/test_db.py -v`. Expected: FAIL.
- [ ] **Step 3: Implementar `schema.sql`** con `CREATE TABLE IF NOT EXISTS` y claves primarias, y `db.py`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: add postgres schema and db helpers`.

### Task 3: Cliente de la API

**Files:**
- Create: `src/sports_dashboard/client.py`, `tests/test_client.py`

**Interfaces:**
- Produces: `FootballDataClient(api_key: str, min_interval: float = 6.5)` con `get_matches(competition: str, season: int) -> list[dict]`. Lanza `ApiAuthError` en 401/403 (mensaje: comprobar `FOOTBALL_API_KEY`) y reintenta hasta 3 veces con espera creciente en 429. Espera al menos `min_interval` segundos entre peticiones. Usa `GET https://api.football-data.org/v4/competitions/{competition}/matches?season={season}` con cabecera `X-Auth-Token`.

- [ ] **Step 1: Tests** con `requests` simulado (`responses`): `test_sends_auth_header_and_returns_matches_list`, `test_401_raises_api_auth_error_mentioning_key`, `test_429_retries_then_succeeds`, `test_waits_min_interval_between_calls` (inyectar `sleep` y reloj falsos).
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implementar `client.py`**; `sleep` y `clock` inyectables para testear sin esperar.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Verificación real** (la hace el usuario con su clave): `python -c` que pide `PD`, temporada 2024, imprime el número de partidos y las claves del primero. Confirmar que coincide con el supuesto del formato; si no, corregir `transform` en la tarea 4 antes de seguir.
- [ ] **Step 6: Commit** `feat: add football-data client with rate limiting`.

### Task 4: Limpieza de datos

**Files:**
- Create: `src/sports_dashboard/transform.py`, `tests/fixtures/matches_sample.json`, `tests/test_transform.py`

**Interfaces:**
- Consumes: lista de dicts de `get_matches`.
- Produces: `clean_matches(raw: list[dict], competition: str, season: int) -> tuple[pd.DataFrame, pd.DataFrame]` devolviendo `(teams_df, matches_df)` con las columnas de la tarea 2. Fechas a UTC, goles nulos como `pd.NA` en partidos sin jugar, equipos únicos.

- [ ] **Step 1: Tests** con la muestra: `test_played_match_has_goals`, `test_scheduled_match_has_null_goals_and_status`, `test_teams_are_unique`, `test_utc_date_is_timezone_aware`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implementar `clean_matches`** con pandas.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: clean raw matches with pandas`.

### Task 5: Ingesta idempotente

**Files:**
- Create: `src/sports_dashboard/ingest.py`, `tests/test_ingest.py`

**Interfaces:**
- Consumes: `FootballDataClient`, `clean_matches`, `get_engine`, `init_schema`.
- Produces: `ingest(engine: Engine, client: FootballDataClient, competition: str, season: int) -> int` (devuelve filas de partidos escritas) con upsert (`INSERT ... ON CONFLICT (id) DO UPDATE`); CLI `python -m sports_dashboard.ingest --competition PD --season 2024`.

- [ ] **Step 1: Tests** con cliente falso: `test_ingest_twice_does_not_duplicate_rows`, `test_ingest_updates_score_when_match_gets_played`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implementar** upsert con SQLAlchemy y `argparse` para la CLI.
- [ ] **Step 4: Run.** Expected: PASS. Ejecutar la CLI real con la clave del usuario y comprobar `SELECT count(*) FROM matches` > 0.
- [ ] **Step 5: Commit** `feat: idempotent ingestion into postgres`.

### Task 6: Consultas

**Files:**
- Create: `src/sports_dashboard/queries.py`, `tests/test_queries.py`

**Interfaces:**
- Produces: `standings(engine, competition: str, season: int) -> pd.DataFrame` (columnas `team, played, won, drawn, lost, gf, ga, gd, points`, ordenada por puntos, diferencia, goles; victoria 3, empate 1; solo partidos con estado `FINISHED`); `team_results(engine, competition, season, team_id: int) -> pd.DataFrame`; `list_teams(engine, competition, season) -> pd.DataFrame`.

- [ ] **Step 1: Tests** con datos sembrados a mano: `test_standings_points_and_order`, `test_standings_ignores_unplayed_matches`, `test_standings_empty_when_no_data`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implementar** las consultas en SQL con agregaciones.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: add standings and team queries`.

### Task 7: Dashboard Streamlit

**Files:**
- Create: `01-dashboard-deportes/app.py`, `tests/test_app.py`

**Interfaces:**
- Consumes: `queries.*`, `load_settings`, `get_engine`.
- Produces: app con selector de liga y temporada y tres pestañas: Tabla, Resultados, Evolución de un equipo (puntos acumulados por jornada, gráfico de líneas). Muestra aviso (`st.info`) si no hay datos.

- [ ] **Step 1: Test** con `streamlit.testing.v1.AppTest`: `test_app_runs_with_empty_db_and_shows_info`, `test_app_shows_standings_table_with_seeded_data`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implementar `app.py`**; lanzar `streamlit run app.py` y revisarlo con el usuario en el navegador.
- [ ] **Step 4: Run tests.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: add streamlit dashboard`.

### Task 8: CI, README y despliegue

**Files:**
- Create: `.github/workflows/ci.yml`, `01-dashboard-deportes/README.md`

**Interfaces:**
- Produces: workflow que levanta PostgreSQL como servicio y ejecuta `pytest`; README en inglés (qué es, captura, cómo ejecutarlo con Docker, arquitectura, fuente de datos football-data.org, límites).

- [ ] **Step 1: Escribir ambos archivos.**
- [ ] **Step 2: Verificar** que el workflow pasa en GitHub tras `git push` (el usuario crea el repositorio público y confirma la subida).
- [ ] **Step 3: Desplegar** en Streamlit Community Cloud con una base gratuita en Neon o Supabase; las claves van en los secretos de la plataforma, no en el repo. El usuario crea las cuentas.
- [ ] **Step 4: Commit** `docs: add readme and ci workflow`.

---

Fases 2 (ML) y 3 (baloncesto) tendrán su propio plan cuando esta fase esté terminada.
