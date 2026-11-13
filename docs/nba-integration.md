# Marcador NBA · datos, modelos y reproducción

La sección NBA comparte la identidad de Marcador y conserva su propio calendario, jugadores, equipos, seguimiento y quinteto. Sus tablas `nba_*` y su almacenamiento de navegador son independientes del fútbol.

## Fuente y atribución

Se usan archivos públicos de **SportsDataverse / hoopR.nba.stats**, derivados de NBA Stats. Los IDs de los 30 equipos se validan con el catálogo local de `nba_api`. La conexión directa con `stats.nba.com` agotó el tiempo de espera en las pruebas iniciales y el CDN devolvió HTTP 403; no se ha intentado eludir esas restricciones. Los archivos públicos permiten importar las estadísticas gratuitamente sin claves NBA y sin depender de esa conexión durante la navegación.

- [Productor de los archivos y licencia](https://github.com/sportsdataverse/hoopR-nba-stats-data).
- [Archivos de tiros](https://github.com/sportsdataverse/sportsdataverse-data/releases/tag/nba_stats_shots).
- [Archivos de partidos de equipos](https://github.com/sportsdataverse/sportsdataverse-data/releases/tag/nba_stats_team_game_logs).
- [Cliente nba_api](https://github.com/swar/nba_api).

El archivo declara CC BY 4.0, atribuido a sus autores. Marcador normaliza los datos y calcula características, modelos y simulaciones propios; no representa una aprobación de NBA ni de SportsDataverse. Los archivos externos y modelos binarios no se publican en este repositorio.

## Importación y entrenamiento

Desde `01-dashboard-deportes`, con el entorno virtual y PostgreSQL iniciados según el README:

```powershell
.venv/Scripts/python.exe -m pip install -r requirements.txt
# Usa solo DATABASE_URL de .env; no necesita las claves de fútbol.
.venv/Scripts/python.exe -m sports_dashboard.nba.ingest --season 2026 --history 10
.venv/Scripts/python.exe -m sports_dashboard.nba.train --season 2026 --history 10 --shot-history 3 --runs 10000
```

Abre `/nba/2026`. El año de la ruta y del CLI es el **inicio** de temporada; los archivos del proveedor utilizan el **final**: `shots_2027.parquet` es 2026-27.

La caché está en `data/external/nba/`, excluida de Git. Las descargas tienen un límite de 80 MiB, tiempos de espera y un registro de URL, fecha y SHA-256. Se valida el esquema y la temporada antes de sustituir la caché. Una caché con firma incorrecta se rechaza. `--refresh` en la ingesta vuelve a descargar los archivos; las respuestas fallidas no sustituyen una copia válida. No se reintenta indefinidamente una restricción del proveedor.

La importación sustituye una instantánea NBA de temporada en una transacción, sin modificar las tablas de fútbol. Concilia los resultados del calendario con registros terminados más recientes mediante IDs exactos de partido y equipos. Descarta del calendario las plazas con equipos aún sin asignar y conserva su recuento en los metadatos. Una nueva ingesta invalida los modelos de esa temporada para evitar mezclar instantáneas: ejecuta de nuevo el entrenamiento para publicarlos.

`--history 10` conserva diez temporadas completas para el modelo de partidos. `--shot-history 3` usa las tres últimas completas para el modelo de tiros; admite de tres a diez. Entrenamiento y simulación se ejecutan en CPU, con cuatro hilos como límite del proceso de entrenamiento. La web consulta exclusivamente PostgreSQL.

## Regresión logística de partidos

Objetivo: probabilidad de victoria del equipo local. Se usan diez temporadas completas: **2016-17 a 2025-26**, incluidas actuaciones de postemporada disponibles. Se omiten partidos sin cinco observaciones previas por cada equipo. El calentamiento se reinicia por temporada.

Variables: diferencias de eficiencia ofensiva y defensiva **estimadas**, pace estimado, eFG%, tasa de pérdidas, rebote ofensivo, tiros libres, porcentaje previo de victorias, ataque/defensa de los últimos diez partidos y días libres; más localía e indicador de playoffs. Cero días libres representa encuentros consecutivos. Las métricas de esta capa son distintas de los ratings oficiales del panel estadístico.

Las posesiones por partido se aproximan con la media de `FGA + 0,44 × FTA − OREB + TOV` de ambos equipos. OffRtg y DefRtg estimados se obtienen por cada cien posesiones; el pace se ajusta a 48 minutos usando los minutos totales del equipo. Las medias previas se desplazan una observación: el encuentro que se predice y sus resultados futuros quedan fuera. No se utilizan ratings finales de temporada para predecir sus partidos anteriores.

El calendario identifica local y visitante por ID: algunas etiquetas de los registros de partidos son ambiguas en sedes neutrales. Se anula la localía en la burbuja y cuando ambos equipos constan como visitantes. No se dispone de una clasificación completa de futuras sedes neutrales en el archivo de calendario.

La validación es cronológica: periodos antiguos para entrenamiento, 2024-25 como validación y **2025-26 como prueba reservada**. El imputador y escalador se ajustan exclusivamente con los datos de entrenamiento correspondientes. La configuración está fijada: regresión logística L2, `C=0.25`, hasta mil iteraciones. Se compara con una probabilidad constante de victoria local y un Elo sencillo. El Elo y las características del periodo de prueba pueden actualizarse con partidos ya terminados, nunca con encuentros posteriores.

Tras congelar la evaluación se reajusta un modelo de producción con las diez temporadas completas. Las métricas publicadas pertenecen al modelo evaluado antes de ese reajuste; no son una evaluación futura del modelo de producción.

## Simulador de clasificación, rondas y título

Se ejecutan **10.000 simulaciones**, semilla 42: resultados conocidos, encuentros pendientes del calendario publicado, play-in de las posiciones 7–10 y series al mejor de siete con distribución de localía 2-2-1-1-1. La final NBA utiliza el porcentaje de victorias y el enfrentamiento directo para la ventaja de campo, con sorteo reproducible si persiste el empate. El play-in utiliza el indicador de fase correspondiente, separado del de playoffs.

Se muestran probabilidades de acceso a playoffs, segunda ronda, final de conferencia, final NBA y título, además de victorias esperadas y su intervalo central del 90% entre simulaciones. Los valores próximos a cero y uno se presentan sin sugerir certeza por redondeo.

**La instantánea actual solo asigna 1.200 de los 1.230 encuentros de temporada regular.** Hay treinta partidos pendientes de definición, relacionados con el calendario de NBA Cup; seis plazas sin equipos ya aparecen en el archivo y otras no están listadas todavía. La simulación es un escenario **condicionado al calendario conocido**, con ochenta encuentros por equipo. No debe interpretarse como una proyección definitiva sobre 82 partidos.

Los desempates de conferencia son aproximados: porcentaje de victorias, enfrentamientos directos, porcentaje de victorias de conferencia y sorteo. No reproducen todos los criterios oficiales de división y rivales elegibles. La fuerza de cada equipo permanece fija; no se simulan lesiones ni traspasos futuros. El descanso se recorre según las fechas conocidas; para la postemporada todavía sin fechas se supone un día libre por equipo. El error Monte Carlo de cada probabilidad no recoge la incertidumbre del modelo. Esta versión simula una postemporada futura; no es un seguidor de eliminatorias ya iniciadas.

## Modelo de acierto y calidad contextual del tiro

Modelo: `HistGradientBoostingClassifier`, comparado con una regresión logística y referencias constantes y por valor de dos/tres puntos. Se utilizan tiros de temporada regular de **2023-24, 2024-25 y 2025-26**; la última temporada es la prueba reservada. La configuración es fija: cien iteraciones, quince hojas, mínimo de 150 muestras por hoja, tasa 0,08 y regularización L2 de 5. No se activa una partición aleatoria interna para early stopping.

Variables confirmadas: coordenadas en pies, distancia, ángulo derivado, periodo, tiempo restante del **cuarto** y valor de dos/tres puntos. Objetivo: acierto/fallo. Las descripciones del evento, el resultado del lanzamiento y el marcador posterior no son variables del modelo. Todos los tiros de un partido quedan en el mismo bloque temporal. Se incluyen los lanzamientos lejanos; no se eliminan fallos de final de periodo.

**No se dispone de distancia al defensor ni reloj de posesión por tiro.** Los endpoints agregados por rangos no permiten asignarlos como observaciones de cada lanzamiento. Tampoco se añaden estadísticas de jugador posteriores al tiro. Por ello el modelo mide probabilidad según ubicación y contexto disponible, no toda la presión defensiva ni la capacidad individual del tirador.

El archivo utilizado no incluye el ID de evento individual. Se conservan las filas del proveedor, con IDs válidos solo dentro de la instantánea; no se afirma haber deduplicado eventos por `(partido, evento)`. No se eliminan automáticamente dos tiros visualmente idénticos, que podrían ser acciones distintas.

Se publican log loss, Brier, AUC, calibración por intervalos y evaluación separada para tiros de dos y tres puntos. Las probabilidades no llevan un calibrador posterior; se muestra su fiabilidad observada, incluida la descalibración de intervalos extremos con poca muestra.

El mapa permite resultados o probabilidades, dos/tres puntos y media cancha/cancha completa. Su tabla ofrece coordenadas, periodo, reloj, resultado y probabilidad. xFG es la media de P(acierto); los puntos esperados suman P(acierto) × valor del tiro. Las estadísticas se refieren a la muestra seleccionada, con un máximo de tres mil tiros recientes por ficha, y pueden diferir de los agregados de temporada.

Los perfiles incluyen la plantilla completa: 464 jugadores tienen agregados del proveedor, uno tiene medias calculadas desde sus actuaciones disponibles y 63 figuran en plantilla sin agregados. Estos últimos conservan sus valores estadísticos como desconocidos, sin rellenarlos con ceros.

## Resultados medidos y cobertura

Importación y evaluación del **13 de noviembre de 2026**:

| Elemento | Observación |
|---|---:|
| Equipos / perfiles de jugadores | 30 / 528 |
| Encuentros asignados / terminados | 1.200 / 174 |
| Registros jugador-partido | 3.933, en los 174 encuentros |
| Tiros / partidos con tiros | 29.857 / 170 |
| Tiros actuales con probabilidad publicada | 29.857 |
| Partidos de prueba del modelo logístico | 1.236 |
| Tiros de prueba del gradient boosting | 219.159 |

| Evaluación 2025-26 | Log loss ↓ | Brier ↓ | AUC ↑ |
|---|---:|---:|---:|
| Regresión logística de partidos | 0,6019 | 0,2071 | 0,7355 |
| Elo de referencia | 0,6219 | 0,2150 | 0,7106 |
| Gradient boosting de tiros | 0,6486 | 0,2286 | 0,6512 |
| Regresión logística de tiros | 0,6605 | 0,2339 | 0,6429 |

Son resultados de una prueba temporal concreta, no garantías de rendimiento futuro. AUC no es porcentaje de predicciones acertadas. Los resultados completos, las particiones, las huellas de código y fuentes y las versiones de bibliotecas están en [el informe JSON](nba-evaluation-2026.json). Las huellas del código normalizan los saltos de línea para poder compararse en Windows y Linux.

## Rutas y almacenamiento personal

`/nba` abre la última temporada disponible. En `/nba/{año}` están clasificación, `/partidos`, `/jugadores`, `/modelos`, `/seguimiento` y `/quinteto`; las fichas usan `/equipo/{id}`, `/jugador/{id}` y `/partido/{id}`. Los IDs de partido conservan sus ceros iniciales. La búsqueda de jugadores ignora tildes y la comparación permite teclado y enlaces con filtros compartidos.

El quinteto permite dos G, dos F y un C según las posiciones del proveedor, aceptando perfiles mixtos y evitando duplicados. Favoritos y selección se guardan en `marcador.nba.personal.v1`, sin cuentas, separados de los datos personales del fútbol. No se sincronizan entre dispositivos ni modifican la predicción del modelo.

## Verificación

```powershell
# Desde 01-dashboard-deportes, contra sports_test para integración
.venv/Scripts/python.exe -m pytest -q
# Después, desde web
npm test
npm run lint
npm run typecheck
npm run build
```

Las suites Python y web no se ejecutan a la vez sobre la misma base de prueba. Los datos de ejemplo están limitados a las pruebas; la base de producción contiene los archivos importados de la fuente indicada. Se comprueban ausencia de información futura, particiones temporales, caché, coordenadas, probabilidades, simulación reproducible, anidamiento de rondas, estado personal, consultas y convivencia con fútbol. La revisión visual cubre 390, 768 y 1440 píxeles, búsqueda con teclado y persistencia tras recarga.
