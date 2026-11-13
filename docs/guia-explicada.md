# Guía explicada: qué hemos usado, cómo funciona y por qué

Esta guía está escrita para alguien que empieza de cero. Cada herramienta tiene cuatro partes:
**qué es** (con una comparación de la vida real), **cómo se usa en este proyecto**, **por qué la elegimos**
y **qué alternativas había**. Si algo todavía no está construido, se marca como *pendiente*. La web de Next.js ya está hecha, así que
sus herramientas (secciones 11 a 19) están explicadas a fondo.

## 1. El mapa general

Imagina una cadena de montaje de una tienda:

```
Proveedores de datos  ->  Cocinero (Python)  ->  Almacén (PostgreSQL)  ->  Escaparate (la web)
 (APIs y archivos CSV)    (descarga y limpia)    (guarda ordenado)         (lo que ve el usuario)
```

- Los **proveedores** publican datos de fútbol: football-data.org (partidos, equipos, plantillas, goleadores)
  y football-data.co.uk (estadísticas de partido como xG, tiros y córners, en archivos CSV).
- El **cocinero** es un programa en Python. Pide los datos, les quita la suciedad y los guarda.
- El **almacén** es PostgreSQL: una base de datos, es decir, archivadores con tablas muy ordenadas.
- El **escaparate** es la parte visual. Primero fue Streamlit y ahora es una web hecha con Next.js (carpeta `web/`).

Regla de oro del proyecto: **la web solo lee del almacén, nunca llama a las APIs.** Así los límites de las
APIs gratuitas no pueden romper la web.

## 2. Python y su "caja de herramientas"

**Qué es.** Un lenguaje de programación. Es como el idioma en el que le damos órdenes al ordenador.
**Cómo se usa aquí.** Todo el proceso de descarga, limpieza y guardado está escrito en Python, dentro de la
carpeta `src/sports_dashboard/`.
**Por qué.** Es el idioma más usado para trabajar con datos, tiene muchas librerías gratuitas y se lee casi
como inglés. Además las ofertas de prácticas de datos lo piden.
**Alternativas.** JavaScript/TypeScript (también sirve, y lo usaremos para la web) y R (muy bueno en estadística).

### El entorno virtual (`.venv`) y `pip`
**Qué es.** Una caja de herramientas propia de cada proyecto. Cada proyecto necesita versiones distintas de
las librerías; si mezclaras todo, unas romperían a otras. `pip` es la tienda de la que se descargan las
librerías, y `requirements.txt` es la lista de la compra.
**Cómo se usa.** `python -m venv .venv` crea la caja, `pip install -r requirements.txt` mete las
librerías y `pip install -e .` hace que Python encuentre nuestro propio paquete, `sports_dashboard`.
**Por qué.** Que el proyecto funcione igual en tu ordenador, en otro o en GitHub.

## 3. pandas: la hoja de cálculo con superpoderes

**Qué es.** Una librería para manejar tablas de datos en código (un `DataFrame` es una tabla).
**Cómo se usa.** En `transform.py` convierte los datos crudos de la API en tablas limpias: fechas a una zona
horaria común (UTC), huecos vacíos tratados como "sin dato" y no como cero, equipos y jugadores sin duplicados.
**Por qué.** Es el estándar para limpiar datos y se aprende rápido.
**Alternativas.** Hacerlo todo en SQL, o `polars` (más rápida, menos conocida).

## 4. Hablar con una API: `requests`, claves y límites

**Qué es una API.** Un camarero: tú pides "los partidos de LaLiga 2025" y te traen el plato, en un formato
ordenado llamado JSON. Una **clave de API** es tu carné de socio: sin él no te atienden.
**Los límites.** El plan gratuito de football-data.org atiende unas 10 peticiones por minuto. Por eso nuestro
cliente (`client.py`) espera 6,5 segundos entre peticiones y, si la API contesta "demasiado rápido" (error
429), espera y reintenta. Cargar 5 ligas y 3 temporadas tarda unos 5 minutos por eso.
**Errores que entendemos.** 401 = clave mala. 403 = ese recurso no entra en tu plan (por ejemplo, una
temporada antigua). Los explicamos con un mensaje claro y no con un traceback.
**Por qué esta API.** Es gratuita, estable y trae lo básico. **Alternativas:** API-Football (planificada,
con 100 peticiones al día y solo temporadas 2022 a 2024 en el plan gratis) y StatsBomb Open Data
(planificada, datos de eventos de partidos históricos). Raspar webs lo descartamos: sus condiciones lo prohíben.

## 5. `.env`, secretos y `.gitignore`

**Qué es.** El `.env` es un archivo con tus llaves (la clave de la API y la dirección de la base de datos).
`.gitignore` es la lista de cosas que Git nunca debe subir a internet.
**Cómo se usa.** Tus claves van en `.env`. `.env.example` es una plantilla **vacía** que sí se sube, para que
cualquiera sepa qué llaves hacen falta.
**Por qué.** Una clave subida a un repositorio público se roba en minutos. Ya pasó una vez en este proyecto:
se pegó una clave en `.env.example` (que se sube) en vez de en `.env`. Lo cazamos antes de subir nada y
revisamos que no hubiera ninguna clave en el historial.

## 6. PostgreSQL y SQL: el almacén

**Qué es.** Una base de datos "relacional": muchos archivadores (tablas) con reglas. **SQL** es el idioma para
pedirle cosas ("dame los equipos de LaLiga ordenados por puntos").
**Conceptos clave que usamos**
- **Tabla:** una hoja con columnas fijas (`matches`, `teams`, `players`, `scorers`, `squad_members`, `match_stats`...).
- **Clave primaria:** el DNI de cada fila; no puede repetirse (el `id` de un partido).
- **Clave foránea:** una fila que apunta a otra ("este partido lo juega el equipo con id 86"); la base impide
  apuntar a algo que no existe.
**Cómo se usa.** La tabla de clasificación no se guarda: se calcula con SQL desde los partidos terminados
(victoria 3 puntos, empate 1), así nunca se desincroniza.
**Por qué PostgreSQL.** Es profesional, gratuito, muy potente y lo piden las ofertas.
**Alternativas.** SQLite (más simple, un archivo; lo descartamos para parecernos a un entorno real) y MySQL.

### Upsert e idempotencia (palabras raras, idea sencilla)
**Upsert** = "inserta si no existe, actualiza si ya existe". **Idempotente** = ejecutarlo dos veces deja el
mismo resultado que una. Es como escribir tu nombre en un formulario con lápiz sobre el mismo hueco: no
sale duplicado. Así podemos repetir una descarga sin miedo; si un partido pasa de "programado" a
"terminado", se actualiza solo.

### SQLAlchemy y psycopg
Son los **traductores** entre Python y PostgreSQL. `psycopg` habla con la base y `SQLAlchemy` nos da una forma
cómoda de enviarle órdenes.

## 7. Docker: PostgreSQL en una caja precintada

**Qué es.** Un programa que ejecuta aplicaciones dentro de cajas aisladas ("contenedores") que ya vienen
preparadas. **Docker Compose** lee un archivo (`docker-compose.yml`) que describe qué cajas levantar.
**Cómo se usa.** `docker compose up -d` levanta una caja con PostgreSQL ya instalado y configurado, sin
instalarlo en Windows. Los datos viven en un "volumen" (el disco de la caja), así que sobreviven aunque la
apagues.
**El puerto 5433.** Tu Windows ya tenía otro PostgreSQL ocupando el 5432, así que la caja se publica en el 5433
y solo para tu ordenador (`127.0.0.1`), para que nadie más de tu red pueda entrar.
**Por qué.** Que cualquiera pueda montar el mismo entorno con un comando. **Alternativa:** instalar PostgreSQL
directamente en Windows.

## 8. Git, ramas, commits, GitHub y CI

**Git** es una máquina del tiempo para el código. Un **commit** es una foto con nombre ("feat: ingest teams").
Una **rama** es una copia paralela donde trabajas sin tocar la versión buena (`main`). **GitHub** es la nube
donde se guarda el repositorio.
**CI (integración continua)** es un robot de GitHub que, cada vez que subes código, lo ejecuta en un ordenador
limpio y corre los tests. Si falla ves una ✘ roja. Nos cazó un fallo real: un test funcionaba en tu equipo y no
allí porque dependía de una variable que el CI define distinto.
**Por qué.** Es el estándar del sector, y un reclutador ve en el repositorio el historial y el check verde.

## 9. pytest y TDD: el examen antes de la respuesta

**Qué es.** `pytest` ejecuta **tests**: pequeños programas que comprueban que otro programa hace lo que debe.
**TDD** (desarrollo guiado por tests) significa escribir primero el examen, ver que suspende (rojo), escribir el
código y ver que aprueba (verde). Así sabes que el test comprueba algo real.
**Cómo se usa.** Hay 100 tests. Los que tocan la base de datos usan una base aparte, `sports_test`, para no
mezclarse con tus datos reales.
**Por qué.** Los tests cazaron fallos que de otra forma habrían salido con datos reales: un jugador cedido que
rompía la clave primaria, un archivo con tildes en otro formato, números con decimales en columnas de enteros...


## 10. Streamlit: la primera interfaz (ya retirada)

**Qué es.** Una herramienta que convierte un script de Python en una web de datos con pocas líneas. Es como
montar un puesto de feria con piezas ya hechas: rápido, pero todos los puestos se parecen.
**Cómo se usó aquí.** Fue la primera interfaz, para ver los datos pronto. Ya se ha **retirado**: la sustituye la
web de Next.js, que cubre las mismas secciones y más.
**Por qué se cambió.** Su límite es el aspecto visual. Para un diseño totalmente a medida hace falta una web "de verdad".
**Alternativas.** Dash, Gradio o Panel (parecidos, también en Python).

## 11. Next.js: la web (carpeta `01-dashboard-deportes/web/`)

**Qué es.** Un marco para hacer webs completas. Imagina un edificio de oficinas ya construido: tiene
estructura, ascensores y electricidad, y tú solo decides qué hay en cada despacho.
**Cómo se usa aquí (versión App Router).** Las **carpetas son las direcciones** (URL) de la web:

```
src/app/page.tsx                                  ->  /                      (te lleva a LaLiga)
src/app/[competition]/[season]/page.tsx           ->  /pd/2024               (clasificación)
src/app/[competition]/[season]/resultados/...     ->  /pd/2024/resultados/38
src/app/[competition]/[season]/goleadores/        ->  /pd/2024/goleadores
src/app/[competition]/[season]/equipo/[teamId]/   ->  /pd/2024/equipo/81
src/app/[competition]/[season]/comparar/          ->  /pd/2024/comparar?a=81&b=86
```

- **Ruta dinámica:** lo que va entre corchetes, como `[competition]` o `[season]`, es un hueco. Una sola
  carpeta sirve para todas las ligas y temporadas: en `/pd/2024`, `competition` vale `pd` y `season` vale `2024`.
- **Componente de servidor:** cada `page.tsx` se ejecuta **en el servidor**, no en tu navegador. Por eso puede
  hablar directamente con PostgreSQL (`getSql()` y `getStandings(...)`) y mandarte ya la página terminada.
  Es como un camarero que te trae el plato hecho en vez de darte los ingredientes. A esto se le llama
  *renderizado en el servidor* (SSR). La línea `export const dynamic = "force-dynamic"` dice "pide los datos
  frescos en cada visita".
- **`notFound()` y `redirect()`:** si alguien escribe `/xx/2024` (una liga que no existe), `resolveRoute` no la
  reconoce y la página llama a `notFound()`, que enseña la página 404. Si la dirección se puede corregir (por
  ejemplo, otra forma de escribir la liga), `redirect()` te manda a la dirección buena.
- **Archivos con nombre especial:** `layout.tsx` (el marco común: fuentes, enlace "Saltar al contenido"),
  `loading.tsx` (esqueleto mientras llegan los datos), `error.tsx` (qué mostrar si algo falla) y
  `not-found.tsx` (el 404). Next.js los busca por su nombre y los usa solo.
- **`dev` y `build`:** `npm run dev` arranca una versión de **desarrollo**: se actualiza al guardar un archivo,
  es lenta pero cómoda. `npm run build` crea la versión **de producción** (optimizada, la que se publicaría) y
  `npm start` la sirve.
- **Lección aprendida: no ejecutes `npm run build` con `npm run dev` abierto.** Los dos escriben en la misma
  carpeta de trabajo (`.next`). Es como dos cocineros usando la misma tabla de cortar a la vez: se pisan y la
  web empieza a dar errores raros. Para el build, para antes el `dev` con Ctrl+C.

**Por qué Next.js.** Mezcla servidor y pantalla en un solo proyecto, tiene rutas por carpetas y es muy pedido
en ofertas de frontend. **Alternativas.** Vite + React (más simple, pero sin servidor propio), Remix, Astro o SvelteKit.

## 12. React: la web como piezas de Lego

**Qué es.** Una librería para construir interfaces con **componentes**: piezas pequeñas y reutilizables. Un
componente es una función que devuelve un trozo de pantalla. Los **props** son los datos que le pasas, como las
instrucciones de una pieza de Lego ("hazme de color rojo, de 4 pitones").
**Cómo se usa aquí.** Los componentes están en `web/src/components/`. La clasificación (`[season]/page.tsx`)
se monta juntando piezas:

```
LeagueHeader   (banda superior, título, temporadas y pestañas)
KpiStrip       (franja con líder, mejor ataque, mejor defensa, goles por partido)
  KpiCell x4
StandingsTable (la tabla)  ->  TeamCrest (escudo), FormDots (últimos 5), PointsBar (barra)
StandingsLegend
```

Cuando no hay partidos terminados se usa `EmptyState` en su lugar. Una misma pieza se reutiliza: `TeamCrest`
(escudo) aparece en varias pantallas; `ScorePill` (el marcador) en Resultados y en la ficha de equipo.
Los textos visibles están todos en un archivo, `src/lib/es.ts`, así que los componentes no llevan frases
escritas a mano.
**Por qué React.** Es la librería de interfaces más usada. **Alternativas.** Vue, Svelte, Angular.

## 13. TypeScript: etiquetas en las cajas

**Qué es.** JavaScript con **tipos**. Un tipo es una etiqueta en una caja: "aquí solo cabe un número". Si
intentas meter texto, te avisa **antes** de ejecutar nada.
**Cómo se usa aquí.** En `web/src/lib/standings.ts` el tipo `StandingRow` describe una fila de la clasificación
(`position`, `team`, `points`, `goalsFor`, `form`...). En `matches.ts`, `MatchRow` describe un partido
(`homeGoals: number | null`: los goles son un número **o** nada, si el partido no se ha jugado). Si un
componente pide `row.puntos` en vez de `row.points`, o se olvida del caso `null`, el editor y
`npm run typecheck` lo marcan. También los resultados de las consultas SQL llevan tipo (`sql<TableRow[]>`).
**Qué caza `npm run typecheck`:** nombres mal escritos, campos que faltan y valores que pueden ser `null` y no se
han tratado. No ejecuta la web: solo la lee y la comprueba.
**Por qué.** Cuesta poco y evita muchos fallos tontos. **Alternativa:** JavaScript sin tipos (más rápido de
escribir, más fallos).

## 14. Tailwind CSS y los tokens de diseño

**Qué es.** Tailwind es una forma de dar estilo con **clases cortas** escritas en el propio componente, como
pegatinas: `rounded-control` (esquinas redondeadas), `bg-card` (fondo de tarjeta), `text-muted` (texto gris).
Así no hay que saltar a un archivo CSS enorme.
**Los tokens.** Un **token de diseño** es un valor con nombre: en vez de repetir `#0d6b4c` por todas partes,
se define una vez `--accent` en `web/src/app/globals.css` y se usa su nombre. Es como la paleta de un pintor:
los colores están en un sitio y todo se pinta con ellos (`--bg`, `--fg`, `--accent`, `--win`, `--loss`...).
**Por qué una sola fuente de colores.** Si mañana cambias el verde, lo cambias en un sitio y toda la web se
actualiza. Y se puede **comprobar**: el test `src/lib/design-tokens.test.ts` lee `globals.css` y calcula el
**contraste** (cuánto se distingue el texto del fondo) de cada pareja de colores que usa la web. Si alguien elige
un gris demasiado claro, el test suspende.
**Por qué Tailwind.** Es rápido, consistente y muy usado. **Alternativas.** CSS normal, CSS Modules, styled-components.

## 15. El diseño "Marcador"

El rediseño visual está descrito en `docs/superpowers/specs/2026-11-13-rediseno-visual.md`. La idea: la web se
lee como el marcador de un estadio impreso en papel técnico. Tema claro, fondo tiza, tinta casi negra y un único
acento verde césped. Tiene **tres ideas visuales**:

1. **Cifras de marcador.** Puntos, goles y marcadores en una letra estrecha y gruesa, que es lo primero que se ve.
2. **Banda de marcador.** Una barra superior oscura con la marca y las ligas (`SiteBand`).
3. **Duelo.** En el comparador, cada métrica son dos barras enfrentadas desde el centro.

**Tipografías** (cargadas con `next/font/google` en `layout.tsx`): **Inter** para texto, **Archivo** (versión
estrecha) para cifras y títulos, y **JetBrains Mono** para fechas, códigos y ejes.
**Accesibilidad básica** (para que pueda usarla cualquiera):
- **Contraste** suficiente en todo el texto (lo vigila el test de tokens).
- **Foco visible:** al navegar con el teclado se ve dónde estás (regla `:focus-visible` en `globals.css`).
- **Tabla alternativa:** el gráfico de evolución (`LineChart`) tiene una descripción y una tabla con los mismos
  datos para lectores de pantalla.
- **No depender solo del color:** las zonas de la tabla llevan además texto oculto ("zona alta", "descenso") y
  una leyenda.
- **`prefers-reduced-motion`:** si el sistema pide menos animación, se quitan las transiciones.
- **Móvil:** se diseña y se prueba a 390 px de ancho; las tablas anchas se desplazan dentro de su contenedor, no
  la página entera. Hay también un enlace "Saltar al contenido" al principio.

## 16. postgres.js y SQL desde la web

**Qué es.** `postgres` (postgres.js) es la librería de Node que habla con PostgreSQL. Es el equivalente en la
web de `psycopg` y SQLAlchemy en Python.
**Cómo se usa aquí.** `src/lib/db.ts` crea **un grupo de conexiones compartido** (`getSql()`) y las consultas
viven en `src/lib/queries/` (`standings.ts`, `matches.ts`, `scorers.ts`, `team.ts`, `head-to-head.ts`). La
clasificación se calcula con SQL desde los partidos terminados, igual que en la parte de Python.
- **Consultas parametrizadas = protección contra inyección SQL.** Se escribe
  `WHERE competition = ${competition} AND season = ${season}` dentro de una plantilla `sql`. Los `${...}` no se
  pegan como texto: se envían aparte como **datos**. Es como rellenar un formulario con casillas: aunque alguien
  escriba una orden maliciosa en una casilla, se trata como un valor y no se ejecuta. Esa trampa se llama
  *inyección SQL*.
- **Los `::int`:** PostgreSQL devuelve algunos números (como `COUNT(*)`) en un formato que JavaScript recibe como
  texto. `COUNT(*)::int` los convierte a número normal, para que los tipos y la pantalla los traten como números.
- **La web nunca llama a la API de fútbol.** Solo lee de PostgreSQL (la regla de oro de la sección 1). La
  dirección de la base de datos viene de `DATABASE_URL`, en `web/.env.local` (no se sube a Git).
**Por qué.** Es directo y SQL ya lo usábamos. **Alternativas.** Prisma o Drizzle (ORM: trabajan con objetos en
vez de SQL; más cómodos, más capas que aprender).

## 17. Vitest, ESLint y el CI con dos trabajos

- **Vitest** es el `pytest` de la web: ejecuta los tests (`npm test`). Hay tests de las consultas, de los
  componentes y de los tokens. Los que tocan la base de datos usan **`sports_test`**, una base aparte; el
  ayudante `tests/helpers/test-db.ts` **se niega a borrar** cualquier base que no se llame exactamente
  `sports_test`, así que los tests **nunca tocan `sports`**, donde están tus datos reales. Se ejecutan los
  archivos de uno en uno (`fileParallelism: false` en `vitest.config.ts`) porque comparten esa base.
- **ESLint** (`npm run lint`) es el corrector ortográfico del código: avisa de malas prácticas y errores típicos.
- **GitHub Actions (CI).** El archivo `.github/workflows/ci.yml` define **dos trabajos**, cada uno en un
  ordenador limpio con una base PostgreSQL de prueba:
  1. **`python`**: instala dependencias y ejecuta `pytest -q`.
  2. **`web`**: `npm ci` (instalación exacta), `npm run lint`, `npm run typecheck`, `npm test` y
     `npm run build`. Si cualquier paso falla, ves la ✘ roja.

**Por qué.** Cada cambio se comprueba solo, sin fiarse de "en mi ordenador funciona".

## 18. Capturas con Playwright y el GIF con Pillow

**Qué es.** Playwright es un robot que maneja un navegador (aquí Microsoft Edge) como si fuese una persona.
Pillow es una librería de Python para editar imágenes.
**Cómo se usa aquí.** Con la web arrancada y datos reales, `npm run screenshots` (en `web/`) ejecuta
`scripts/capture-screenshots.mjs`: entra en las páginas, espera a que carguen las fuentes y los escudos, y guarda
las imágenes de `01-dashboard-deportes/docs/img/` (clasificación, resultados, goleadores, ficha, comparador y
versión móvil) más los fotogramas de un recorrido. Después `scripts/make_demo_gif.py` (Python + Pillow) une esos
fotogramas en `docs/img/demo.gif`. Son las imágenes que ves en el README. La carpeta `frames/` no se sube a Git.
**Por qué.** Las imágenes se regeneran con un comando cuando cambia el diseño. **Alternativa:** hacerlas a mano.

## 19. Understand-Anything: el mapa del código

**Qué es.** Una herramienta (un *plugin* de Claude Code) que lee todo el proyecto y construye un **grafo de
conocimiento**: un mapa de cajas y flechas con los archivos, funciones y cómo se relacionan. Es como el plano de
un edificio donde ves qué sala conecta con cuál.
**Cómo se usa.** `/understand` analiza el proyecto y crea el grafo; `/understand-dashboard` abre un panel web
interactivo para explorarlo. El grafo se guarda en la carpeta `.ua/`, que **no se sube a Git** (está excluida
localmente): es tuyo.
**Por qué.** Ayuda a entender un proyecto grande sin leer cada archivo. **Alternativa:** leer el código a mano.

## 20. Conceptos de fútbol y de datos que conviene saber

- **Temporada "2024"** significa la 2024-25: la API la identifica por el año en que empieza.
- **Plantilla por temporada:** la API devuelve la plantilla *de esa temporada* (Real Madrid tuvo 40 jugadores
  en 2024 y 28 en 2026). Por eso existe la tabla `squad_members`. El **entrenador**, en cambio, es siempre el
  actual en cualquier temporada.
- **xG (goles esperados):** una cifra que estima cuántos goles "merecía" un equipo según la calidad de sus
  ocasiones. Viene de los CSV de football-data.co.uk, por partido. En el plan gratuito no hay xG de jugadores.
- **Datos no disponibles:** donde no hay fuente gratuita y permitida (estadísticas avanzadas de jugadores en
  2025 y 2026) lo indicaremos en la web con claridad, en lugar de mostrar algo falso.
- **Desempate de la clasificación:** usamos diferencia de goles y luego goles a favor, no el enfrentamiento
  directo de LaLiga. Está avisado en el README y en la propia página.

## 21. Cómo trabajamos: ayudantes que construyen y ayudantes que revisan

Para la fase de datos usamos un método con **subagentes**: por cada tarea, un ayudante nuevo la programa y otro,
distinto, la revisa sin haberla escrito. Al final, un revisor con el modelo más capaz mira la rama entera.
**Por qué.** Quien escribe un código no ve sus propios fallos; una segunda mirada fresca sí. Entre las revisiones
encontraron, por ejemplo: la posición de los jugadores borrada por la lista de goleadores, nombres de equipo
ambiguos que se asignaban al azar, y un archivo de alias que se rompía con un error ilegible.


## 22. Chuleta de comandos

Desde la carpeta `01-dashboard-deportes` (salvo donde se indique):

```bash
# ARRANCAR TODO
docker compose up -d                       # levanta PostgreSQL (puerto 5433)
python -m sports_dashboard.ingest --competitions PD,PL,SA,BL1,FL1 --seasons 2024,2025,2026   # descarga datos
python -m sports_dashboard.stats_import    # importa los CSV de football-data.co.uk
cd web
npm run dev                                # web en http://localhost:3000

# PARAR TODO
# Ctrl+C en la terminal del `npm run dev`
docker compose stop                        # apaga PostgreSQL (los datos se conservan)

# TESTS Y COMPROBACIONES
pytest -q                                  # tests de Python (desde 01-dashboard-deportes)
npm test                                   # tests de la web (Vitest, desde web/)
npm run lint                               # ESLint
npm run typecheck                          # comprueba los tipos de TypeScript
npm run build                              # versión de producción (con `dev` PARADO)
npm run screenshots                        # capturas del README (web arrancada)
python scripts/make_demo_gif.py            # GIF a partir de las capturas (desde 01-dashboard-deportes)
```

## 23. Glosario rápido

| Palabra | Significado sencillo |
|---|---|
| API | Camarero que te trae datos de otro programa |
| JSON / CSV | Dos formatos de archivo de datos (el primero para APIs, el segundo como una hoja de cálculo) |
| DataFrame | Tabla de pandas |
| Clave primaria / foránea | DNI de una fila / referencia a otra fila |
| Upsert | Insertar o actualizar, según exista o no |
| Idempotente | Repetirlo no cambia el resultado |
| Contenedor | Caja aislada con un programa dentro (Docker) |
| Rama | Copia paralela del código |
| CI | Robot que ejecuta los tests al subir código |
| TDD | Escribir el test antes del código |
| Componente | Pieza reutilizable de la pantalla (React), como una pieza de Lego |
| Prop | Dato que le pasas a un componente para que se configure |
| Ruta dinámica | Carpeta con corchetes (`[season]`) que sirve para muchas direcciones |
| SSR / componente de servidor | La página se prepara en el servidor, con los datos, y llega ya hecha |
| Build | Crear la versión final optimizada para publicar (`npm run build`) |
| Tipo (TypeScript) | Etiqueta que dice qué clase de dato cabe en una variable |
| Token de diseño | Valor con nombre (color, tamaño) definido una vez y reutilizado |
| Utilidad (Tailwind) | Clase corta que aplica un solo estilo (`bg-card`) |
| Contraste | Cuánto se distingue el texto del fondo; medido, debe ser suficiente |
| Consulta parametrizada | SQL con huecos para los datos, que evita la inyección SQL |
| Inyección SQL | Ataque que cuela órdenes maliciosas en un campo de texto |
| Pool de conexiones | Grupo de conexiones a la base de datos que se reutilizan |
| Lint | Corrector automático de malas prácticas en el código |
| Grafo de conocimiento | Mapa de cajas y flechas del código (Understand-Anything) |
