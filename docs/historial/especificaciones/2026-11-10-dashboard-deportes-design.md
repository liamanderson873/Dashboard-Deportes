# Dashboard de deportes (proyecto 1): documento de diseño

Estado: borrador pendiente de aprobación del usuario. Fecha: 2026-11-10.

## Intención y porqué
El usuario busca prácticas en desarrollo de software y quiere un portfolio en GitHub con proyectos que demuestren conocimientos distintos. Este es el primero y debe ser el de **datos**: obtener datos reales de APIs públicas, guardarlos en PostgreSQL, limpiarlos y mostrarlos en un dashboard. Las ofertas de prácticas revisadas piden Git/GitHub activo, SQL, APIs REST, algo de cloud, tests y proyectos propios documentados, con inglés visible.
El tema (deportes) lo eligió el usuario porque le gusta; eso cuenta en entrevistas.

## Forma de trabajo (decisión del usuario)
- Claude escribe todo el código y **explica en detalle** cada paso mientras se hace: qué se hace, por qué, qué alternativas había. El usuario debe poder defender el proyecto en una entrevista.
- El proyecto debe completarse pronto. Estimación de Claude, no verificada: 4-8 horas de sesión solo con fútbol.

## Objetivos
1. Dashboard web de fútbol con tablas de liga, resultados y evolución de equipos.
2. Descarga programada de datos desde football-data.org hacia PostgreSQL, con limpieza (pandas).
3. Repositorio público con README en inglés, tests (pytest), Docker Compose y despliegue gratuito.

## Fases
- **Fase 1 (obligatoria): fútbol.**
- **Fase 2 (opcional, solo si vamos rápido): ML.** Predictor de victoria/empate/derrota con scikit-learn, evaluado contra una línea base ("gana el local"), como pestaña nueva. Depende de que los datos históricos disponibles basten; sin verificar.
- **Fase 3 (opcional): baloncesto** con balldontlie, reutilizando la estructura de descarga de la fase 1.

## Fuera de alcance
Steam, esports (PandaScore: el plan gratuito no da históricos de estadísticas), datos en directo, cuentas de usuario, apuestas.

## Antiobjetivos
- Un dashboard que solo funciona llamando a las APIs en vivo desde la interfaz: los límites del plan gratuito lo rompen. La interfaz debe leer siempre de PostgreSQL.
- Datos o claves de API en el repositorio público.

## Restricciones
- Planes gratuitos, sin coste. Football-data.org gratis: unos 10 requests por minuto, 12 competiciones, sin estadísticas por partido (cifras de fuentes de terceros, a confirmar al registrar la clave).
- Equipo del usuario: Windows 11, 15,7 GB de RAM, sin GPU dedicada.
- Hay que citar la fuente de datos en el README.

## Decisiones de Claude (el usuario las puede cambiar)
- Stack: Python, pandas, PostgreSQL en Docker (decisión del usuario: PostgreSQL desde el principio), Streamlit para el dashboard, pytest.
- Descarga: script de ingesta que guarda en tablas crudas y limpias, ejecutable en local y programable.
- Despliegue: Streamlit Community Cloud con una base PostgreSQL gratuita (Neon o Supabase).
- Ubicación: `<repo-root>`. Un subdirectorio por proyecto.

## Pendiente de resolver durante la construcción
- Qué ligas concretas (dentro de las 12 gratuitas) y cuántas temporadas hay disponibles.
- Que el usuario se registre en football-data.org y proporcione su propia clave (Claude no crea cuentas ni maneja claves por él).
- Elegir el modelo ML y las variables si se llega a la fase 2.
