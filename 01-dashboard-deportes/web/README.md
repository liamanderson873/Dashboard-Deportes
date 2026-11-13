# Marcador · web de análisis de fútbol

Aplicación Next.js que lee la base de datos PostgreSQL local del proyecto y
muestra las clasificaciones de fútbol en español.

## Cómo arrancar

1. Levanta la base de datos del proyecto (puerto 5433).
2. Copia `.env.example` a `.env.local` (no se sube a git).
3. `npm install`
4. `npm run dev` y abre http://localhost:3000

## Scripts

- `npm run dev`: servidor de desarrollo.
- `npm run build` y `npm start`: compilar y servir en modo producción.
- `npm run lint`: ESLint.
- `npm run typecheck`: TypeScript sin emitir código.
- `npm test`: tests con Vitest.
- `npm run screenshots [url]`: regenera las capturas y los fotogramas de `../docs/img/` (por defecto contra `http://localhost:3000`). Requiere Microsoft Edge instalado y el servidor arrancado con datos. Después, `../.venv/Scripts/python ../scripts/make_demo_gif.py` (desde `web/`) construye `demo.gif`.

## Rutas

- `/` redirige a la temporada más reciente de LaLiga (o de la primera liga con datos).
- `/{liga}/{año}`, por ejemplo `/pl/2026`: clasificación. Ligas: `pd`, `pl`, `sa`, `bl1`, `fl1`.
- `/{liga}/{año}/resultados/{jornada}`: resultados por jornada (sin jornada, abre la última jugada).
- `/{liga}/{año}/goleadores`: los 50 máximos goleadores.
- `/{liga}/{año}/equipo/{id}`: ficha del equipo (datos del club, resumen, evolución de puntos por
  temporada, estadísticas por partido, plantilla de esa temporada y partidos).
- `/{liga}/{año}/comparar?a={id}&b={id}`: comparador de dos equipos y enfrentamientos directos.
- `/{liga}/{año}/jugadores`: explorador y comparación individual. `?tab=comparar` abre el comparador y conserva sus filtros en la URL.
- `/{liga}/{año}/jugador/{id}`: ficha de jugador del proveedor Bzzoiro.
- `/{liga}/{año}/partidos`: calendario, próximos encuentros primero y resultados recientes.
- `/{liga}/{año}/partido/{id}`: detalle de partido con eventos, alineaciones y tiros disponibles.
- `/{liga}/{año}/seguimiento`: equipos y jugadores favoritos, con sus próximos encuentros.
- `/{liga}/{año}/mi-once`: campo visual 4-3-3, selección por nombre y guardado local.
- Los antiguos enlaces `/jugadores?tab=partidos|favoritos|once` redirigen a las nuevas secciones.
- Si la base de datos no responde se muestra una pantalla de error con los pasos para arrancarla.

## Notas

- Los tests de base de datos usan `sports_test` (nunca la base `sports`) y se niegan a
  ejecutarse contra otra.
- Usa `127.0.0.1` y no `localhost` en `DATABASE_URL` (en Windows `localhost` puede resolver a IPv6).

## NBA

El selector Fútbol/NBA conserva dos espacios distintos. `/nba` redirige a la última temporada NBA importada. `/nba/{año}` ofrece clasificación; sus secciones son `/partidos`, `/jugadores`, `/modelos`, `/seguimiento` y `/quinteto`. Las fichas se encuentran en `/equipo/{id}`, `/jugador/{id}` y `/partido/{id}`. El año indica inicio de temporada: 2026 es 2026-27.

La web consulta las tablas `nba_*` sin llamar al proveedor ni entrenar modelos durante una petición. Si faltan datos o modelos se muestran estados vacíos explicativos. La comparación por nombre acepta teclado y sus filtros se reflejan en la URL. El estado personal NBA tiene su propia clave de navegador y admite cinco posiciones sin duplicados.

El panel de modelos publica evaluación temporal, calibración y supuestos. Las simulaciones actuales son condicionales al calendario parcial; los mapas de tiro no incluyen tracking del defensor ni reloj de posesión. Consulta la [metodología NBA](../../docs/nba-integration.md).

## Identidades visuales y logos

Fútbol combina verde profundo y superficies claras; NBA utiliza azul noche, cobre y fondos cálidos. Los tokens semánticos cambian con el deporte renderizado, sin esperar a JavaScript. Las cabeceras muestran trazados decorativos de campo o cancha y las dos paletas tienen comprobaciones de contraste.

`TeamCrest` sirve los escudos de fútbol almacenados en `public/logos/`; `NbaTeamLogo` utiliza los 30 logos NBA locales. `team-logos.json` conserva procedencia y SHA-256. Los recursos mantienen proporciones, colores y espacio reservado; un fallo de carga presenta la abreviatura. Consulta los [criterios visuales](../../docs/diseno-marcador.md).
