# Marcador en el CV y en una entrevista

## Descripción para el CV

**Marcador — Plataforma de análisis deportivo e IA | Proyecto personal**

Python · PostgreSQL · Next.js · TypeScript · scikit-learn · GitHub Actions

- Integración de cinco ligas de fútbol y NBA mediante ingestas con validación y almacenamiento en PostgreSQL.
- Comparación interactiva de jugadores, filtros estadísticos combinables, visualización de tiros y simulación de temporada y playoffs NBA.
- Regresión logística de partidos y gradient boosting de tiros, evaluados con separación temporal y modelos de referencia.
- Pruebas automatizadas de datos, modelos y web, con CI en GitHub y documentación reproducible.

Enlace: [repositorio y capturas](https://github.com/liamanderson873/Dashboard-Deportes). Añade la demo cuando exista una URL pública comprobada; localhost no es accesible para quien lea el CV.

## Presentación de 60–90 segundos

«Marcador es mi proyecto personal de análisis deportivo. Quería resolver un recorrido completo: obtener datos de distintas fuentes, validarlos, almacenarlos y convertirlos en una interfaz que permita explorar fútbol y NBA.

»En la web puedo buscar y comparar jugadores, cruzar estadísticas como puntos y TS%, guardar favoritos y construir una alineación. En NBA añadí modelos de probabilidad y simulaciones de playoffs, diferenciando siempre un resultado real de una estimación.

»Para evaluar los modelos separé las temporadas cronológicamente y construí las variables con lo conocido antes de cada partido. Comparé los resultados con referencias sencillas y publiqué sus métricas y limitaciones.

»También trabajé la fiabilidad: pruebas de regresión, CI, tratamiento de datos ausentes y una copia de demostración que puede restaurarse sin depender de las APIs.»

Adapta la primera persona a lo que puedas explicar y reproducir. Si te preguntan por herramientas de IA, explica cómo las utilizaste y qué comprobaste tú; no atribuyas al modelo conocimientos, resultados o decisiones que no puedas defender.

## Preguntas que debes poder responder

| Pregunta | Respuesta concreta y dónde comprobarla |
|---|---|
| ¿Por qué PostgreSQL? | Relaciones entre competiciones, equipos, partidos y jugadores; consultas agregadas y transacciones de importación. Consulta `sql/schema.sql` y `sql/nba.sql`. |
| ¿Cómo unes proveedores? | IDs separados y correspondencias explícitas verificadas, evitando juntar jugadores/equipos por nombres parecidos. Consulta `docs/bsd-integration.md`. |
| ¿Cómo evitas información futura? | Características anteriores al partido, reinicio por temporada y transformaciones ajustadas solo en entrenamiento. Consulta `nba/features.py`, `nba/train.py` y sus pruebas. |
| ¿Por qué regresión logística? | Objetivo binario, probabilidad interpretable y referencia razonable para el tamaño de datos. No se afirma que sea el mejor modelo posible. |
| ¿Qué aporta el gradient boosting? | Relaciones no lineales entre ubicación/contexto y acierto, comparadas con regresión y referencias simples. No conoce al defensor ni la habilidad individual. |
| ¿Qué resultados mediste? | En la prueba 2025-26: partidos, log loss 0,6019 y AUC 0,7355; tiros, log loss 0,6486 y AUC 0,6512. Son resultados de esa partición histórica, no porcentajes de acierto ni garantías futuras. Informe `docs/nba-evaluation-2026.json`. |
| ¿Cómo funciona la simulación? | Monte Carlo con semilla reproducible, probabilidades de partido y reglas aproximadas de calendario/Copa/desempates. Un recorrido no es un cuadro oficial. Consulta `docs/nba-laboratory.md`. |
| ¿Qué error real encontraste? | Tablas Usage/Scoring sobrescribían cifras Base por partido con totales. Se corrigió la prioridad y se añadió una reparación con firmas de fuente y pruebas de conservación de modelos/historial. Consulta `docs/nba-visual-analysis.md`. |
| ¿Qué pasa si falla una API? | Navegar no llama al proveedor: se lee la última importación. Si falla PostgreSQL, hay un error recuperable y readiness 503, sin inventar datos. |
| ¿Qué mejorarías después? | Backtesting en más temporadas, calibración de probabilidades extremas, actualización del calendario y observación de pronósticos prospectivos. Solo añadir tracking por tiro si hay datos vinculables reales. |

## Antes de enviarlo

Abre el repositorio sin iniciar sesión, comprueba enlaces y capturas, ensaya el recorrido y explica una consulta, una prueba de regresión y la partición temporal. El despliegue público es el único paso que requiere las cuentas externas del usuario; sigue [la guía de demo](despliegue-demo.md).
