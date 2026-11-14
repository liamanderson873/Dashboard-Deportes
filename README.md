# Marcador · fútbol, NBA y modelos predictivos

[![CI](https://github.com/liamanderson873/Dashboard-Deportes/actions/workflows/ci.yml/badge.svg)](https://github.com/liamanderson873/Dashboard-Deportes/actions/workflows/ci.yml)

Cinco grandes ligas europeas y la NBA, estadísticas de equipos y jugadores, favoritos, alineaciones y modelos predictivos evaluados con datos históricos. Una aplicación en español que transforma datos reales con **Python**, los almacena en **PostgreSQL** y los presenta con **Next.js**.

Proyecto personal de portfolio para prácticas. Se ejecuta en local; el repositorio contiene el código, las pruebas y las instrucciones para reproducirlo.

![Centro de partidos de Marcador](01-dashboard-deportes/docs/img/matches-2026.png)

## Fútbol · explora, compara y guarda

| Sección | Qué permite hacer |
|---|---|
| **Liga** | Clasificación, forma reciente, goleadores, fichas de equipos y comparación con enfrentamientos directos. |
| **Partidos** | Abrir primero el próximo encuentro, consultar resultados recientes o recorrer la temporada en orden cronológico. Cambiar a resultados por jornada. |
| **Jugadores** | Buscar y filtrar por equipo, posición, edad y minutos; comparar dos perfiles por nombre, con totales o cifras por 90. |
| **Seguimiento** | Guardar equipos y jugadores; reunir los próximos partidos de los equipos seguidos. |
| **Mi once** | Construir un 4-3-3 sobre un campo visual, con búsqueda por nombre, plazas por posición y sin jugadores repetidos. |

Las fichas individuales incluyen registro de partidos, evolución de goles y asistencias, percentiles y perfiles estadísticamente similares. El detalle de partido incorpora alineaciones, suplentes, eventos, estadísticas y mapas de tiros cuando el proveedor ofrece esos datos.

| Jugadores | Mi once ideal |
|---|---|
| ![Explorador de jugadores](01-dashboard-deportes/docs/img/players-2026.png) | ![Campo del once ideal](01-dashboard-deportes/docs/img/lineup-2026.png) |

Los filtros de jugadores se pueden compartir por URL. Favoritos y alineación se guardan en el navegador, sin registro y sin sincronización entre dispositivos. La interfaz incluye navegación por teclado, controles con etiquetas, tablas alternativas a los gráficos y adaptación a móvil.

## NBA · estadísticas y laboratorio predictivo

Un selector **Fútbol / NBA** separa los dos espacios. Fútbol utiliza verde de estadio y NBA azul noche con cobre; ambos muestran escudos locales de los equipos, cabeceras propias y una navegación coherente. NBA incluye clasificación por conferencias, ratings avanzados, partidos con resultados y box scores, fichas de equipos y jugadores, comparación visual por nombre, seguimiento y un quinteto sobre el campo.

| Clasificación NBA | Simulador de playoffs |
|---|---|
| ![Estadísticas NBA](01-dashboard-deportes/docs/img/nba-standings.png) | ![Simulación NBA](01-dashboard-deportes/docs/img/nba-models.png) |
| **Calidad contextual del tiro** | **Mi quinteto** |
| ![Mapa y probabilidad de tiro](01-dashboard-deportes/docs/img/nba-shots.png) | ![Quinteto NBA](01-dashboard-deportes/docs/img/nba-lineup.png) |

- **Partidos y playoffs:** regresión logística con diez temporadas completas y variables anteriores al partido. El laboratorio ejecuta 2.000 simulaciones de temporada de 82 partidos, NBA Cup, play-in y playoffs; permite condicionar resultados y explorar cuadros con logos.
- **Tiros:** gradient boosting con tres temporadas recientes, coordenadas, distancia, ángulo, periodo, reloj del cuarto y valor del lanzamiento. Mapa de aciertos/fallos, probabilidad estimada, xFG y puntos esperados.
- **Evaluación visible:** prueba temporal reservada de 2025-26, referencias, log loss, Brier, AUC y gráficos de calibración. AUC no equivale al porcentaje de aciertos.

La muestra actual contiene **30 equipos, 528 perfiles de jugadores, 174 encuentros terminados y 29.857 tiros** de 2026-27. Los datos llegan de archivos públicos de NBA Stats publicados por SportsDataverse, sin una clave NBA. La conexión directa con NBA no respondió en las pruebas; la procedencia del archivo se identifica en la web.

**Límites visibles:** el calendario publicado asigna 1.200 encuentros. El laboratorio completa los treinta restantes con emparejamientos hipotéticos dependientes de NBA Cup, sin escribirlos en el calendario real. Los marcadores auxiliares y los desempates por puntos siguen siendo aproximados. El modelo de tiro no incluye distancia al defensor ni reloj de posesión individual. El historial guarda pronósticos antes del partido; las fichas incorporan tendencias de cinco/diez encuentros, análisis por zonas y explicaciones de la regresión. Consulta [el laboratorio NBA](docs/nba-laboratory.md) y [la metodología y reproducción de NBA](docs/nba-integration.md) y [los resultados completos](docs/nba-evaluation-2026.json).


**Mapa de jugadores:** en Jugadores puedes cruzar dos de 21 estadísticas, por ejemplo PTS y TS%, destacar a un jugador y añadir hasta seis condiciones simultáneas. Incluye filtros de equipo, posición, partidos y minutos por partido, escalas numéricas, tabla ordenable y enlaces compartibles con la selección. Los datos ausentes se excluyen del gráfico. Las fichas de forma reciente tienen ejes desde cero, fechas y valores por encuentro.

**Dificultad del tiro:** la representación del modelo utiliza círculos más grandes y oscuros para los tiros más difíciles, con una leyenda de probabilidades de acierto. La estimación describe los tiros registrados según su ubicación y contexto, diferenciada de sus aciertos o fallos reales. Consulta la [guía de lectura de gráficos NBA](docs/nba-visual-analysis.md).

## Datos y temporada actual

**LaLiga, Premier League, Serie A, Bundesliga y Ligue 1.** El año de la ruta identifica el comienzo de la temporada: `/pd/2026` corresponde a **2026-27**. La clasificación y las vistas de equipos admiten también temporadas anteriores cargadas; la ampliación individual se ha verificado con 2026-27.

| Fuente | Uso |
|---|---|
| [football-data.org](https://www.football-data.org/) | Equipos, calendario, resultados, plantillas y goleadores. |
| [football-data.co.uk](https://www.football-data.co.uk/) | Estadísticas de partido importadas desde CSV. |
| [Bzzoiro Sports Data](https://sports.bzzoiro.com/) | Jugadores, actuaciones, alineaciones, eventos y tiros de fútbol. |
| [SportsDataverse / NBA Stats](https://github.com/sportsdataverse/hoopR-nba-stats-data) | Estadísticas NBA e histórico, archivos públicos con atribución CC BY 4.0. |

Las claves de las APIs se configuran solo en Python. **La web consulta PostgreSQL y no consume peticiones de las APIs al navegar.** Los planes gratuitos tienen cuotas y condiciones propias; no se incluyen claves ni archivos externos de datos en el repositorio.

La carga de Bzzoiro del **13 de noviembre de 2026** reunió 1.752 encuentros, 500 terminados, 499 con registros individuales y 3.031 perfiles en las cinco ligas. Es una observación de esa importación, no una garantía de cobertura futura. Un encuentro de Premier League quedó sin estadísticas individuales y pendiente de reintento.

Los datos ausentes aparecen como **—**, nunca como ceros inventados. Las métricas por 90 utilizan únicamente los minutos de las actuaciones que informan esa métrica. Los percentiles y las similitudes explican su muestra y no constituyen predicciones. Consulta los [criterios de cálculo y límites de cobertura](docs/bsd-integration.md).

## Arquitectura

```mermaid
flowchart LR
  A[football-data.org] --> P[Ingesta Python]
  B[football-data.co.uk · CSV] --> P
  C[Bzzoiro Sports Data] --> P
  S[SportsDataverse · NBA Stats] --> P
  P --> D[(PostgreSQL 16)]
  D --> M[Entrenamiento Python · scikit-learn]
  M --> D
  D --> W[Next.js · React · TypeScript]
  W --> N[Navegador]
  N --> L[Almacenamiento local: favoritos y once]
```

Las ingestas realizan actualizaciones idempotentes. Los datos de Bzzoiro viven en tablas `bsd_*`, con correspondencias explícitas de equipos entre proveedores; los IDs no se mezclan por similitud de nombres. Los componentes de servidor consultan la base y los componentes de cliente resuelven filtros e interacciones personales.

| Capa | Tecnologías |
|---|---|
| Datos y modelos | Python 3.12+, pandas, pyarrow, requests, SQLAlchemy, scikit-learn, nba_api |
| Base de datos | PostgreSQL 16, Docker Compose |
| Interfaz | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Calidad | pytest, Vitest, ESLint, TypeScript y GitHub Actions |

## Arranque local

Necesitas **Python 3.12+**, **Node.js 24**, **Docker** y cuentas gratuitas en [football-data.org](https://www.football-data.org/client/register) y [Bzzoiro](https://sports.bzzoiro.com/register/) para importar los datos correspondientes.

Desde la raíz del repositorio, en PowerShell:

```powershell
cd 01-dashboard-deportes
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements.txt
.venv/Scripts/python.exe -m pip install -e .
Copy-Item .env.example .env
docker compose up -d
```

Edita `.env`: añade `FOOTBALL_API_KEY` y `BZZOIRO_API_KEY`. La configuración de ejemplo conecta a PostgreSQL en `127.0.0.1:5433`. No subas `.env` a Git.

```powershell
# Datos base de las cinco ligas, temporada 2026-27
.venv/Scripts/python.exe -m sports_dashboard.ingest --competitions PD,PL,SA,BL1,FL1 --seasons 2026
# Ampliación de jugadores y partidos; puede tardar en la primera carga
.venv/Scripts/python.exe -m sports_dashboard.bsd --competitions PD PL SA BL1 FL1 --season 2026
.venv/Scripts/python.exe -m sports_dashboard.bsd --mapping-file data/bsd_team_map.json

cd web
Copy-Item .env.example .env.local
npm ci
npm run dev
```

Abre [localhost:3000](http://localhost:3000). En Linux/macOS usa `.venv/bin/python` y `cp` en lugar de los comandos equivalentes de Windows. Los CSV de estadísticas de equipo son una ampliación opcional: sigue la [guía técnica de importación](01-dashboard-deportes/README.md).

Para actualizar los datos, vuelve a ejecutar las ingestas. **No hay actualización automática ni servicio en directo.** Si Bzzoiro termina con código `2`, revisa los partidos pendientes que informa: los demás datos importados se conservan. La [guía de Bzzoiro](docs/bsd-integration.md) describe límites de peticiones, reintentos y correspondencias.

## Cargar NBA y entrenar los modelos

Con PostgreSQL, el entorno Python y `DATABASE_URL` ya configurados, desde `01-dashboard-deportes`:

```powershell
.venv/Scripts/python.exe -m sports_dashboard.nba.ingest --season 2026 --history 10
.venv/Scripts/python.exe -m sports_dashboard.nba.train --season 2026 --history 10 --shot-history 3 --runs 10000
```

Abre [localhost:3000/nba](http://localhost:3000/nba). NBA no requiere las claves de fútbol. La primera carga descarga y valida el histórico; las siguientes reutilizan una caché local. Se entrena en CPU y los resultados se guardan en PostgreSQL. Una nueva ingesta invalida los modelos de esa temporada hasta volver a entrenarlos. Los datos externos y artefactos binarios permanecen fuera de Git.

## Validación

```powershell
# Desde 01-dashboard-deportes
.venv/Scripts/python.exe -m pytest -q
# Después, desde 01-dashboard-deportes/web
npm test
npm run lint
npm run typecheck
npm run build
```

Las pruebas de integración requieren PostgreSQL y utilizan exclusivamente **sports_test**. No ejecutes simultáneamente las suites de Python y web contra esa misma base. GitHub Actions ejecuta ambos trabajos con bases independientes. La verificación local de esta versión incluye **133 pruebas Python y 197 pruebas web**, además de lint, tipos y compilación.

## Estructura y documentación

```text
01-dashboard-deportes/
  src/sports_dashboard/    Clientes, transformación e ingestas
  sql/schema.sql          Esquema PostgreSQL y tablas bsd_*
  data/bsd_team_map.json   Correspondencias verificadas de equipos
  tests/                  Pruebas de Python
  web/src/app/            Rutas por liga y temporada
  web/src/components/     Interfaz, gráficos y espacios personales
  web/src/lib/             Consultas y cálculos estadísticos
docs/                     Guías y decisiones del proyecto
```

- [Detalles de datos e ingesta](01-dashboard-deportes/README.md).
- [Rutas y desarrollo de la web](01-dashboard-deportes/web/README.md).
- [Jugadores: configuración, fórmulas y limitaciones](docs/bsd-integration.md).
- [Guía explicada del proyecto](docs/guia-explicada.md).
- [Criterios de interfaz](docs/diseno-marcador.md).
- [NBA: datos, modelos, evaluación y límites](docs/nba-integration.md).

Los siguientes pasos son ampliar el backtesting por temporadas, mejorar la calibración en extremos y completar el calendario NBA cuando se publiquen los encuentros pendientes. El uso de cada fuente está sujeto a sus condiciones; revisa las de [Bzzoiro](https://sports.bzzoiro.com/docs/api-license/) y las condiciones de uso particular de los CSV antes de reutilizar los datos.
