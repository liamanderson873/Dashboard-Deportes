# Dashboard de deportes, versión web con Next.js: documento de diseño

Estado: borrador pendiente de aprobación del usuario. Fecha: 2026-11-11.
Complementa a `2026-11-10-dashboard-deportes-design.md` (fase 1 en Streamlit, ya terminada).

## Intención y porqué
El usuario quiere un portfolio para optar a prácticas. La fase 1 (Streamlit + PostgreSQL) funciona, pero visualmente no basta: quiere que "se vea increíble". Decide pasar a **Next.js** para la interfaz, ampliar los datos (más ligas, plantillas, goleadores, estadísticas avanzadas) y todo **en español**. Además quiere, al final, una **guía explicada como si fuera "tonto"** de cada herramienta usada. Los datos y la base de datos se reutilizan; se reescribe solo la interfaz.

## Hechos verificados (con la clave del usuario, 2026-11-11)
- football-data.org gratis: partidos (temporadas 2024, 2025, 2026 de LaLiga), goleadores (goles, asistencias, penaltis, partidos jugados), ficha de equipo (plantilla con nombre, posición, nacionalidad y nacimiento; entrenador; estadio; escudo; colores). Límite de unas 10 peticiones por minuto.
- API-Football gratis: 100 peticiones al día, 10 por minuto, con la cabecera `x-ratelimit-requests-remaining`. **Solo temporadas 2022 a 2024** (`Free plans do not have access to this season`). Estadísticas por jugador: partidos, goles, pases, tiros, regates, duelos, entradas, faltas, tarjetas, penaltis. No se ha visto xG.
- football-data.co.uk (archivos CSV gratuitos por liga y temporada): el de LaLiga 2026-27 tiene 119 partidos hasta el 8-11-2026 con **xG por partido** (`HxG`, `AxG`), tiros, tiros a puerta, córners, faltas, tarjetas, goles al descanso y árbitro (más cuotas, que no se usan). Cubre LaLiga, Premier, Serie A, Bundesliga, Ligue 1 y otras ligas, con unas 27 temporadas de estadísticas. No trae datos de jugadores. Sus condiciones: uso para particulares, no comercial, no para entrenar IA y datos "para predicción de partidos".
- StatsBomb Open Data (GitHub): datos de eventos por partido, gratis, con atribución. Cobertura según su `competitions.json`: LaLiga 2004-05 a 2020-21, Premier 2015-16 y 2003-04, Bundesliga 2015-16 y 2023-24, Ligue 1 2015-16, 2021-22 y 2022-23, Euro 2024, Copa América 2024. Ninguna temporada actual.
- Descartadas: raspado de webs (FBref y Sports Reference lo prohíben sin permiso, FotMob también y FBref retiró sus estadísticas avanzadas en enero de 2026), la API de la Fantasy Premier League (no oficial, sin condiciones encontradas, solo Premier) y el dataset de Wyscout (solo 2017-18).

## Objetivos
1. Aplicación web en **español**, con diseño cuidado, adaptada a móvil y accesible (contraste 4,5:1, foco visible, tabla de datos como alternativa a los gráficos).
2. Secciones: **Clasificación** (tarjetas de resumen y tabla con zonas), **Resultados** por jornada, **Equipo** (ficha, plantilla, estadísticas calculadas, forma), **Comparador** de dos equipos, **Goleadores**, **Temporadas** (evolución de un equipo), selector de **liga** y **temporada**.
3. **Estadísticas avanzadas de equipo** (xG, tiros, córners, faltas, tarjetas, goles al descanso) desde football-data.co.uk, en las temporadas actuales.
4. **Fase B**: estadísticas avanzadas de jugadores desde API-Football (solo hasta la temporada 2024), mediante una ingesta que respeta la cuota diaria.
5. **Fase D**: sección de análisis histórico con StatsBomb Open Data (mapas de tiros y estadísticas de eventos en las competiciones disponibles).
6. Funciona en local, con repositorio documentado y capturas y vídeo corto en el README; **guía explicada** en `docs/guia-explicada.md`.

## Fuera de alcance
Datos en directo, cuentas de usuario, apuestas (las cuotas de los CSV no se usan), datos que no se hayan visto en las fuentes, **raspado de webs**, despliegue público (decisión del usuario: solo local), app móvil nativa, varios idiomas. Sin fuente gratuita y permitida: estadísticas avanzadas de jugadores en las temporadas 2025 y 2026, que se indican como "no disponibles".

## Antiobjetivos
- Llamar a una API externa desde el navegador o al renderizar una página: la web **solo lee de PostgreSQL**.
- Claves o datos personales en el repositorio.
- Presentar como actual un dato de una temporada que la API gratuita no da (se debe indicar "no disponible en el plan gratuito").
- Reescribir lo que ya funciona: la ingesta, las pruebas y la base se mantienen.
- Subir a git los CSV de football-data.co.uk, los datos de StatsBomb o cualquier dato de terceros: van en una carpeta ignorada por git, y el repositorio solo lleva el código.

## Arquitectura (decisiones de Claude; el usuario puede cambiarlas)
- **Ingesta: Python**, como ahora (`sports_dashboard`). Nuevas ingestas: ligas, equipos y plantillas, goleadores, y API-Football.
- **Web: Next.js (App Router, TypeScript)** en `01-dashboard-deportes/web/`. Los componentes de servidor consultan PostgreSQL directamente con SQL; no hay API intermedia.
- **Estilo:** Tailwind CSS + shadcn/ui + gráficos de shadcn (Recharts), tipografía Fira Sans con `next/font`, colores del sistema de diseño ya acordado (azul `#1E40AF` principal, un solo acento, fondo `#F8FAFC`, sin degradados). Textos en un módulo único `es.ts`.
- **Base de datos:** la misma PostgreSQL. El driver de la web necesita `postgresql://` (sin `+psycopg`); se normaliza la URL en un solo sitio.
- **Pruebas:** Vitest para consultas y formateo; las pruebas de Python se mantienen; el CI añade un trabajo de la web (tipos, lint, tests, build).
- **Ejecución: solo local** (decisión del usuario). PostgreSQL en Docker y la web con `npm run dev` o `npm run build` y `npm start`. No hay Vercel ni Neon; el diseño no depende de ellos y se podrían añadir más adelante.
- **Datos de football-data.co.uk:** el usuario descarga los CSV a mano a una carpeta local ignorada por git (son pocos archivos), y un script de Python los importa. Una tabla de equivalencias une los nombres de equipo de esta fuente con los de football-data.org.
- **Streamlit:** `app.py` se conserva hasta que la web tenga las mismas secciones; después se elimina en un commit propio.

## Ingesta de API-Football con cuota (Fase B)
- Tablas: presupuesto diario (`día`, `usadas`), cola de tareas (`endpoint`, `parámetros`, `prioridad`, `estado`, `intentos`) y respuestas guardadas.
- El ejecutor consume como máximo `restantes − reserva` (reserva: 10 peticiones), espera al menos 6,5 s entre llamadas (límite de 10 por minuto), lee `x-ratelimit-requests-remaining` en cada respuesta y se detiene al llegar al margen, a un 429 o a un error de plan. Cada tarea se marca hecha y no se repite; la ejecución es reanudable al día siguiente.
- Prioridad: primero lo que más aporta (jugadores de los equipos de la liga principal en la temporada 2024), después el resto.
- Nunca se llama desde la web.

## Fases
- **A1** Modelo de datos e ingestas de football-data.org (más ligas, equipos, plantillas, goleadores) y de football-data.co.uk (estadísticas avanzadas de equipo, con la tabla de equivalencias de nombres), con pruebas.
- **A2** Base de la web: proyecto, tema, componentes y página de Clasificación en español.
- **A3** Resultados, Equipo, Comparador, Goleadores y Temporadas.
- **A4** CI de la web y README con capturas y vídeo corto (sin despliegue).
- **B** Estadísticas avanzadas de jugadores con API-Football y su cuota.
- **D** Análisis histórico con StatsBomb Open Data.
- **C** `docs/guia-explicada.md`: cada herramienta (Python, pandas, PostgreSQL y SQL, Docker, API REST, Git y GitHub, CI, pytest, Streamlit, Next.js, React, TypeScript, Tailwind, shadcn/ui, Vercel, Neon, variables de entorno y cuotas) con analogías, cómo se usa, por qué se eligió y qué alternativas había, en lenguaje sencillo.

## Decisiones tomadas por Claude (a revisar)
- Ligas iniciales: LaLiga, Premier League, Serie A, Bundesliga y Ligue 1, siempre que la clave las dé; se comprueba con la lista de competiciones antes de cargarlas.
- Temporadas: 2024, 2025 y 2026.
- Tiempo: no se estima en horas; cada fase se entrega y se revisa por separado.

## Pendiente
- Confirmar que las cinco ligas entran en el plan gratuito de football-data.org.
- Descargar los CSV de football-data.co.uk (el usuario) al llegar a A1 y confirmar que su uso local encaja con sus condiciones.
- Confirmar la lista actual de competiciones de StatsBomb Open Data antes de la fase D.
- Decidir al final de A3 si el aviso de datos no disponibles se muestra por sección o por temporada.
