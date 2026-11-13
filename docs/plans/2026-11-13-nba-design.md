# Marcador NBA · propuesta para revisión

13 de noviembre de 2026. Alcance solicitado: reproducir la experiencia de fútbol para NBA, añadir estadísticas avanzadas y dos modelos predictivos. La aplicación actual queda preservada; no se han añadido modelos ni cambiado el repositorio durante esta revisión.

## Producto

Selector superior Fútbol / NBA. NBA tendrá clasificación por conferencias, partidos, equipos, jugadores, comparador, seguimiento, quinteto ideal y una sección de modelos. Temporada visible 2026-27; el histórico se utiliza también para evaluar los modelos. El tratamiento de datos, fuentes e identificadores queda separado por deporte.

Las estadísticas incluirán puntos, rebotes, asistencias, pérdidas, robos, tapones y porcentajes de tiro; además OffRtg, DefRtg, NetRtg, pace, eFG%, TS%, porcentajes de rebote, pérdidas y uso cuando el proveedor entregue los campos correspondientes. Las fórmulas estimadas tendrán otro nombre que las métricas oficiales y una explicación.

## Predictor de temporada y playoffs

Se entrenará una regresión logística para estimar P(victoria local) en un partido. Una sola clasificación binaria permite después simular los encuentros pendientes, el play-in y las series para obtener probabilidades de entrar en playoffs, avanzar y ganar el título.

Datos previstos: las diez temporadas completas 2016-17 a 2025-26. La temporada 2026-27 sirve para previsiones actuales y evaluación progresiva, sin usar resultados futuros. Deben comprobarse realmente disponibilidad, cobertura e integridad antes de afirmar que existen diez temporadas utilizables.

Variables candidatas: diferencias de eficiencia ofensiva y defensiva, pace, Four Factors, forma reciente, ventaja local, días de descanso y partidos consecutivos. Toda variable se calcula con información anterior al inicio del encuentro. No se utilizará el rating final de una temporada para predecir sus partidos anteriores. Se regularizará el modelo y se evitará introducir métricas redundantes sin validación.

La evaluación separa temporadas cronológicamente, ajusta hiperparámetros sin acceder al periodo de prueba y compara con modelos sencillos: ventaja local constante, porcentaje previo de victorias y Elo. Se informarán log loss, Brier, calibración y AUC; no se presentará una precisión inventada.

La simulación usará una semilla reproducible y, inicialmente, 10.000 ejecuciones. Mostrará probabilidades, distribución de victorias y margen de error Monte Carlo, diferenciándolo de la incertidumbre del propio modelo. La fuerza de cada equipo se mantendrá fija en el escenario inicial; cambios futuros de plantilla o lesiones no conocidas quedan fuera. El descanso se calcula con las fechas reales disponibles y se explican los supuestos cuando el calendario futuro no está fijado.

Es necesario validar calendario completo, desempates y reglas de cada temporada. No se inventarán los partidos aún no asignados de la NBA Cup. Si falta calendario, se mostrará la cobertura y se limitarán explícitamente las previsiones. El formato de play-in histórico cambia y no se aplicará retrospectivamente una regla única a todas las temporadas.

## Modelo de probabilidad de acierto de tiro

Objetivo binario: encestar o fallar. Modelo candidato: gradient boosting para clasificación, comparado con una referencia por zonas y una regresión logística. Se devolverán probabilidades calibradas; no afirmaciones deterministas.

La primera versión propuesta utiliza distancia, coordenadas, ángulo derivado, valor de dos/tres puntos, periodo y tiempo restante del cuarto. El tipo de acción requiere revisar que no incluya información conocida solo tras el lanzamiento. El marcador previo y otros atributos de situación se añadirán solo si se vinculan inequívocamente con el play-by-play y respetan el orden de eventos.

**Limitación documentada:** ShotChartDetail no incluye la distancia al defensor ni el reloj de posesión de cada tiro. PlayerDashPtShots devuelve estadísticas agrupadas por rangos de defensor y de shot clock. Esos agregados no se asignarán como si fueran observaciones de tiros individuales. Tiempo del cuarto y reloj de posesión son variables distintas. Una versión con tracking exige primero localizar y verificar una fuente gratuita con observaciones individuales vinculables.

Se solicitan tanto aciertos como fallos (ContextMeasure=FGA). Resultado del tiro y etiquetas que lo revelen quedan excluidos de las variables. Los tiros del mismo partido permanecen en el mismo bloque temporal. Las estadísticas previas del jugador, si se añaden, se calculan solo hasta ese día y se separan de un modelo puramente contextual de calidad de la ocasión.

La evaluación incluirá log loss, Brier y calibración, además de resultados por zona, distancia y tipo de tiro. La interfaz podrá mostrar xFG, puntos esperados (probabilidad × valor del tiro) y rendimiento observado frente a esperado. Un modelo sin tracking no se presentará como si midiera toda la presión defensiva.

## Arquitectura y entrenamiento

Python importa y valida datos en PostgreSQL, con caché local y reanudación de descargas. El entrenamiento se ejecuta fuera de las peticiones web; publica predicciones y metadatos en la base. Next.js consulta esos resultados sin depender de la API de NBA durante la navegación. No hace falta contratar GPU para probar regresión logística y gradient boosting tabular: primero se mide la carga real en CPU local.

Cada ejecución conserva rango temporal, variables, versión del código, cobertura, fecha de corte, métricas y semilla. Los artefactos grandes, datos externos y credenciales no se añaden al repositorio; se publican código, esquema, instrucciones y resultados resumidos reproducibles.

## Orden de entrega

1. Auditoría pequeña de la fuente: temporadas antigua, reciente y actual; partidos, estadísticas avanzadas y tiros. Validar IDs, fechas, aciertos y fallos, faltantes y volumen. Sin descargar diez temporadas a ciegas.
2. Módulo NBA: ingesta y navegación con las funcionalidades equivalentes a fútbol, comenzando por clasificación, calendario y perfiles.
3. Regresión logística retrospectiva, informe de evaluación y simulador reproducible.
4. Gradient boosting de tiros y mapa de calidad/probabilidad con sus límites visibles.
5. Comparadores visuales, seguimiento, quinteto y exportaciones, integrados con datos verificados.

## Verificación realizada y pendiente

Se revisaron los contratos públicos de nba_api y el estado actual del repositorio local, limpio en main. Tres peticiones de prueba a LeagueGameFinder (2016-17, 2025-26 y 2026-27) agotaron el tiempo de lectura. Esto no demuestra que la fuente carezca de datos: significa que su acceso todavía no está validado desde este entorno. No hay histórico descargado, modelos entrenados ni resultados de evaluación NBA.

Aprobado por el usuario: primera versión del modelo de tiro con variables individuales confirmadas; defensor y shot clock quedan sujetos a una fuente individual verificable.

## Fuentes revisadas

- https://github.com/swar/nba_api
- https://github.com/swar/nba_api/blob/master/docs/nba_api/stats/endpoint_guide.md
- https://github.com/swar/nba_api/blob/master/docs/nba_api/stats/endpoints/shotchartdetail.md
- https://github.com/swar/nba_api/blob/master/docs/nba_api/stats/endpoints/playerdashptshots.md
- https://www.nba.com/standings

El usuario ha aprobado el objetivo de simular clasificación, avance por rondas y título. Se investigan los archivos públicos de SportsDataverse como alternativa explícita cuando los endpoints directos no responden.
