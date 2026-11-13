# Jugadores y análisis 2026-27

La ampliación conserva el diseño Marcador y las fuentes anteriores. Python importa datos de Bzzoiro Sports Data en tablas `bsd_*`; la web consulta exclusivamente PostgreSQL. No hay llamadas a la API al abrir una ficha, cambiar filtros o comparar jugadores.

## Funciones

- **Jugadores** en la navegación de cada liga: búsqueda por nombre, equipo, posición, edad máxima, mínimo de minutos y orden estadístico. Los filtros se reflejan en la URL.
- **Plantilla con rendimiento** dentro de cada ficha de equipo vinculada: ordenación por métrica y acceso a fichas individuales.
- **Ficha de jugador**: bio, estadísticas, totales/por 90, temporada/últimos cinco, registro por partido, evolución acumulada de goles y asistencias cuando los datos están completos, y jugadores similares.
- **Comparador**: dos jugadores, cobertura de cada métrica y percentiles por posición dentro del ámbito seleccionado.
- Los dos selectores del comparador permiten buscar por nombre sin tildes y seleccionar con flechas/Enter. El centro de partidos y el seguimiento abren los próximos encuentros del más cercano al más lejano, con resultados recientes y calendario cronológico en vistas separadas. Se muestran doce tarjetas por lote.
- **Centro de partidos**: calendario y resultados, alineaciones, suplentes, cambios, tarjetas, estadísticas individuales y mapa de tiros con filtros y tabla accesible. Accesible también desde los resultados de jornada cuando existe un cruce inequívoco.
- **Seguimiento** de equipos y jugadores, y **Mi once** 4-3-3 con plazas por posición y sin duplicados. Se guardan solo en el navegador; no requieren cuentas. Los IDs se conservan al cambiar de liga y los paneles muestran los jugadores disponibles de la liga abierta.

## Navegación

Las herramientas tienen rutas propias por liga y temporada: `/pd/2026/jugadores`, `/pd/2026/partidos`, `/pd/2026/seguimiento` y `/pd/2026/mi-once`. El comparador individual permanece en Jugadores; los resultados por jornada están dentro de Partidos. Los enlaces antiguos con `tab=partidos`, `tab=favoritos` o `tab=once` se redirigen.

Mi once muestra el campo 4-3-3 y un selector con búsqueda para la plaza elegida. Permite combinar ligas sin duplicar jugadores. Las tablas largas cargan cincuenta filas por lote; los filtros siguen considerando todo el catálogo.

## Configuración e importación

Crear una cuenta gratuita en https://sports.bzzoiro.com/register/ y guardar `BZZOIRO_API_KEY` en `01-dashboard-deportes/.env`, junto a `DATABASE_URL`. Nunca subir ese archivo ni pegar la clave en documentación o capturas.

Desde `01-dashboard-deportes` con el entorno Python del proyecto:

```powershell
.venv/Scripts/python.exe -m sports_dashboard.bsd --schema-only
.venv/Scripts/python.exe -m sports_dashboard.bsd --discover
.venv/Scripts/python.exe -m sports_dashboard.bsd --competitions PD PL SA BL1 FL1 --season 2026
.venv/Scripts/python.exe -m sports_dashboard.bsd --mapping-file data/bsd_team_map.json
```

El último comando aplica 96 correspondencias de equipos revisadas para estas cinco ligas en 2026-27. Los IDs del proveedor y los de football-data.org son espacios separados; no se unen automáticamente por nombre. Para otro equipo se puede utilizar `--map-team LOCAL:BSD`, comprobando antes ambas identidades. Un mapeo no identifica automáticamente a los jugadores de la otra fuente.

Opciones: `--limit-matches 3` permite una prueba parcial, `--refresh` vuelve a descargar detalles, `--workers 1` reduce concurrencia y `--budget 500` limita las peticiones de esa ejecución. El valor predeterminado es 7000, con máximo 7500; no crea cuentas ni contrata planes. La cuota real de la cuenta es compartida entre ejecuciones y se respeta el 429 del proveedor.

El importador valida competición y año antes de guardar. La paginación es acotada y no envía la clave a enlaces externos ni sigue redirecciones. Los reintentos son limitados. Las transacciones de un partido son atómicas. Las alineaciones con personas sin ID conservan el nombre, sin inventar una ficha. El estado de lesión de la plantilla actual no se presenta como histórico.

Las importaciones ordinarias saltan detalles completos ya consolidados; los descargados antes de 48 horas desde el inicio del partido vuelven a consultarse en la siguiente ejecución para recoger correcciones. Los datos sin registros individuales quedan pendientes de reintento. Un fallo aislado no impide importar los demás partidos: se imprime su ID y la ejecución termina con código 2 si quedan pendientes. Un error de autenticación o cuota detiene la carga. Ningún fallo vacía las tablas de las fuentes anteriores.

## Interpretación

Los ceros observados se conservan; los valores desconocidos son `null` y aparecen como «—». Cada métrica informa de cuántos partidos tienen dato. Para calcular por 90 se suman únicamente los minutos de las actuaciones que informan esa métrica, sin usar partidos desconocidos como ceros. Las comparaciones con distinta cobertura se deben interpretar con cautela.

Los percentiles usan jugadores de la misma posición, liga y periodo; un filtro de equipo limita también el ámbito. Exigen al menos 180 minutos de temporada o 90 en últimos cinco y un 75 % de cobertura por métrica. P100 significa el valor más alto; no una mejor actuación, especialmente para tarjetas.

La similitud utiliza distancia RMS entre métricas por 90 estandarizadas, con al menos tres métricas comunes, misma posición, mínimo de minutos y cobertura mínima del 75 %. La puntuación `100 / (1 + distancia)` expresa afinidad estadística, no calidad ni una predicción. Las métricas utilizadas se muestran en cada resultado. No se calculan similitudes si la muestra no alcanza los requisitos.

Los tiros utilizan las coordenadas originales normalizadas de 0 a 100. Se excluyen las tandas de penaltis; no representan seguimiento continuo. La tabla indica si el xG fue estimado por el proveedor. Los tiros y las estadísticas agregadas pueden proceder de registros distintos y discrepar; no se corrigen inventando acciones.

## Verificación y límites conocidos

La integración se probó con respuestas autenticadas de 2026-27. En la carga del 13 de noviembre de 2026: 1752 encuentros de calendario, 500 terminados, 499 con estadísticas individuales; 3031 perfiles y 21493 registros jugador-partido, sin duplicados por pareja. El partido BSD **209631, Leeds United–Tottenham Hotspur (7 de noviembre)** no entregó estadísticas individuales en dos intentos: conserva el detalle disponible y muestra la ausencia de registros.

La web no ofrece un servicio en directo ni actualización automática programada. Hay que volver a ejecutar la ingesta para actualizar los datos. Las pruebas y estas observaciones no garantizan exactitud o disponibilidad futura de un tercero. El uso de datos está sujeto a las condiciones de Bzzoiro: https://sports.bzzoiro.com/docs/api-license/ .

## Pruebas

```powershell
# Desde 01-dashboard-deportes: las pruebas destructivas exigen sports_test
.venv/Scripts/python.exe -m pytest -q
# Desde 01-dashboard-deportes/web
npm test
npm run typecheck
npm run lint
npm run build
```

No ejecutar simultáneamente ambas suites de integración contra `sports_test`: comparten esa base. Las importaciones reales usan `sports` y no se ejecutan desde fixtures de pruebas. Las muestras ficticias se limitan a tests.
