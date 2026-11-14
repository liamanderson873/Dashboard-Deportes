# Rediseño visual de la web: "Marcador"

Fecha: 2026-11-13. Sustituye a la sección "Dirección visual" del spec `2026-11-11-dashboard-web-nextjs-design.md` (maqueta A). Encargo del usuario: rediseño completo con acabado profesional, elegante y tecnológico, conservando rutas, consultas, cálculos y datos.

## Dirección

**"Marcador"**: la web se lee como el marcador de un estadio impreso en papel técnico. Tema claro único (sin modo oscuro). Fondo tiza, tinta casi negra y un único acento verde césped para los datos que importan. La identidad viene de tres recursos, no de adornos:

1. **Cifras de marcador.** Puntos, marcadores, goles y valores de indicadores van en Archivo estrecho (eje `wdth` ≈ 75), negrita y tabulado. Es lo primero que ve el ojo en cada pantalla.
2. **Banda de marcador.** Una barra superior en tinta (`--ink`) con la marca y las ligas: separa la identidad de la app del contenido y fija la jerarquía.
3. **Duelo.** En el comparador, cada métrica se dibuja como dos barras enfrentadas desde el centro, proporcionales al valor real (no normalizadas a ganador/perdedor).

Nada de degradados, neón, cristal, sombras grandes ni animaciones continuas. Transiciones de 120–180 ms solo en hover/foco/selección.

## Tokens (`src/app/globals.css`)

Sustituyen a los actuales; se mantienen los nombres semánticos que ya usan los componentes cuando tengan equivalente (`bg`, `card`, `border`, `fg`, `muted`, `accent`, `accent-soft`, `win`, `draw`, `loss`, `zone-bottom`) y se añaden los nuevos.

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#F4F5F2` | fondo de página (tiza) |
| `--card` | `#FFFFFF` | superficies |
| `--surface-2` | `#EEF0EC` | cabeceras de tabla, hover de fila, pistas de barras |
| `--border` | `#DADDD6` | separadores finos (1px) |
| `--border-strong` | `#B9BDB4` | separadores de sección, ejes |
| `--fg` | `#121614` | texto principal / tinta |
| `--muted` | `#4A514C` | texto secundario (≥ 7:1 sobre blanco) |
| `--subtle` | `#5F6661` | metadatos, unidades (≥ 4.5:1 sobre `--bg` y blanco) |
| `--accent` | `#0D6B4C` | verde césped: dato destacado, temporada/sección activas, serie destacada, franja de zona alta |
| `--accent-soft` | `#DCEFE6` | fondo de selección y relleno suave |
| `--win` | `#0D6B4C` | V |
| `--draw` | `#646B66` | E |
| `--loss` | `#B42318` | D y zona de descenso |
| `--zone-bottom` | `#B42318` | |
| `--ink` | `#121614` | banda superior |
| `--on-ink` | `#F4F5F2` | texto sobre la banda |
| `--on-ink-muted` | `#A9AFA9` | texto secundario sobre la banda (≥ 4.5:1 sobre `--ink`) |

Comprobar todos los pares de texto con el test de contraste existente (`src/lib/design-tokens.test.ts`), actualizándolo a los nuevos tokens y pares (incluidos blanco sobre `--win/--draw/--loss/--accent` y `--on-ink-muted` sobre `--ink`).

Radios: `--radius-card: 10px`, `--radius-panel: 12px`, controles 8px, píldoras `9999px` solo para chips de forma. Sombras: ninguna salvo `0 1px 0 var(--border)` en la banda pegajosa. Espaciado: escala de Tailwind (4/8/12/16/24/32/48).

## Tipografía

`next/font/google` (sin dependencias nuevas), sustituye Fira:

- **Inter** (variable) — texto y UI. `font-feature-settings: "tnum", "cv11"` en celdas numéricas mediante la utilidad `.num` (tabulado, Inter, no monoespaciada).
- **Archivo** (variable, `axes: ["wdth"]`) — cifras de marcador y títulos: utilidad `.score` = Archivo, `font-stretch: 75%`, peso 700–800, `tnum`, `line-height: 1`.
- **JetBrains Mono** — solo metadatos de precisión: fechas/horas de partido, códigos (TLA), etiquetas de ejes. Utilidad `.mono`.

Escala (rem): 0.75 (meta) · 0.8125 (tabla densa) · 0.875 (UI) · 1 (texto) · 1.25 (h3) · 1.5 (h2, Archivo 700 estrecho) · 2.25–3 (h1, Archivo 800 estrecho) · cifras KPI 2–2.5 (Archivo). Etiquetas de sección en versalitas: 0.6875rem, `tracking-[0.08em]`, mayúsculas, `--subtle`.

## Estructura y navegación

- **Banda superior (sticky, `--ink`)**: a la izquierda la marca (pequeño símbolo SVG del círculo central de un campo, decorativo con `aria-hidden`, + "Estadísticas de fútbol"); a la derecha/debajo las **ligas** como pestañas de texto sobre la banda (activa: texto `--on-ink` + subrayado verde de 2px; resto `--on-ink-muted`). En móvil la fila de ligas se desplaza horizontalmente dentro de su propio contenedor (sin desbordar la página), con `scroll-snap`.
- **Cabecera de página** (sobre `--bg`): título grande de la liga (h1, Archivo) y subtítulo con temporada y partidos jugados; a la derecha (debajo en móvil) el **selector de temporada** como control segmentado compacto (enlaces; activa en `--accent-soft` + texto `--accent`).
- **Secciones**: pestañas con subrayado (Clasificación, Resultados, Goleadores, Comparador) en una fila con línea inferior `--border`; activa con texto `--fg` y subrayado `--accent` de 2px. `aria-current="page"` se mantiene en todas.
- Ancho máximo de contenido 1200px; márgenes laterales 16px (móvil) / 24px / 32px.
- La primera pantalla muestra datos: banda + cabecera + indicadores + inicio de la tabla sin desplazarse a 1440×900.

## Indicadores (clasificación)

Una sola **franja de indicadores** (panel blanco con separadores verticales de 1px, no tarjetas sueltas), 4 columnas en escritorio, 2×2 en tablet y móvil. Cada celda: etiqueta en versalitas (`--subtle`) → fila con escudo 24px + nombre del equipo (`--fg`, 600) → valor grande en `.score` + unidad pequeña ("pts", "goles", "goles en contra", "por partido") en `--subtle`. El líder destaca el valor en `--accent`.

## Tablas

- Densidad: filas de 44px (mínimo táctil), `text-[0.8125rem]–0.875rem`, separadores 1px `--border`, cabecera en `--surface-2` con versalitas.
- Números alineados a la derecha con `.num`; **Puntos** en `.score` 1.125rem, columna con fondo `--surface-2` suave para darle protagonismo.
- Posición: número `.num` y, en zonas, una marca a la izquierda de 3px (verde arriba, rojo abajo) **más** un indicador textual accesible: icono/flecha pequeña o abreviatura en la leyenda ("Zona alta: puestos 1–4", "Descenso: últimos 3") y `sr-only` en la celda ("zona alta"/"descenso").
- Hover de fila `--surface-2`; fila enlazada (equipo) con foco visible.
- Escudo 22–24px; si falta, círculo `--surface-2` con TLA en `.mono` (ya existe en `TeamCrest`).
- Forma V/E/D: chips cuadrados redondeados 18px con letra blanca (mantener letras y `aria-label`).
- Barra de puntos: fina (4px) en `--accent` sobre pista `--surface-2`.
- Tablas anchas: contenedor con `overflow-x-auto` propio; la página nunca desborda.

## Resultados

Lista por día con cabecera de día (fecha en `.mono`, versalitas). Cada partido es una fila de rejilla de 3 columnas: local (alineado a la derecha, escudo junto al marcador) · **marcador central en `.score` 1.5rem dentro de una "pastilla" `--surface-2`** · visitante. Debajo, discreto: descanso `(1-0)` y estado. Pendientes: hora en `.mono` o "Hora por confirmar" + etiqueta de estado. Navegación de jornada compacta: anterior/siguiente + selector de jornada en rejilla de números (no 38 botones grandes): botones 36px cuadrados `.num`, activa en `--accent`, envolviendo.

## Goleadores

Tabla con el jugador protagonista (nombre 600 + posición en `--subtle` debajo), equipo con escudo, y **goles en `.score`** con barra horizontal proporcional (`--accent`). Asistencias/penaltis/partidos en `.num` `--muted`. Los tres primeros con número de posición en `.score` grande.

## Ficha de equipo

- **Cabecera de club**: escudo 64–80px, nombre en h1 Archivo, liga y temporada, y una línea de datos (estadio, fundado, colores, entrenador actual) en lista de definición horizontal separada por hairlines.
- Agrupar por significado en paneles con encabezado h2 en versalitas: **Rendimiento** (posición, puntos, V-E-D, GF/GC, forma) como franja de indicadores; **Casa / Fuera** como dos columnas comparables; **Evolución** (gráfico + tabla de temporadas); **Estadísticas por partido** en rejilla compacta de valor+etiqueta (xG, tiros, a puerta, córners, faltas, amarillas, rojas; "No disponible" atenuado); **Plantilla** por líneas en columnas; **Partidos** jugados y pendientes con el mismo lenguaje de marcador que Resultados.

## Comparador

Formulario compacto (dos selects con etiqueta + botón) en una fila. Debajo, cabecera equilibrada: equipo A (escudo + nombre, alineado a la izquierda) · "vs" · equipo B (alineado a la derecha). Cada métrica en una fila: valor A · **barras enfrentadas** desde el eje central, longitud proporcional a `valor / max(a, b)` de esa métrica (cuando ambos son ≥ 0; si falta uno, sin barra y "No disponible") · valor B; la etiqueta de la métrica centrada encima. El lado mejor en negrita y color `--accent` + `sr-only` "mejor" (se conserva). La tabla accesible se mantiene (`<table>` con caption): las barras son decoración `aria-hidden` dentro de las celdas. Enfrentamientos directos con el lenguaje de Resultados.

## Gráfico de evolución

Ejes en `.mono` 11px `--subtle`, rejilla horizontal `--border`, serie destacada `--accent` 2.5px, otras `--draw` 1.5px discontinuas con etiqueta al final de la línea (temporada) además de la leyenda; punto final marcado. Altura proporcional (relación ~16:7 en escritorio, más alta en móvil). Mantener `role="img"`, `aria-label` y la tabla alternativa.

## Estados

- **Carga** (`loading.tsx`): esqueleto con la misma estructura (banda, cabecera, franja, tabla) en `--surface-2`, sin parpadeo animado si `prefers-reduced-motion`; si no, pulso suave de 1.6 s.
- **Vacío**: panel con título, explicación y una acción (enlace a otra temporada/sección) en tono neutro.
- **Error**: panel con borde `--loss`, pasos numerados y botón "Reintentar".
- **404**: mismo lenguaje, enlace a inicio.
- Datos parciales: "No disponible" en texto normal atenuado (`--subtle`), con `title` explicativo cuando aplique.

## Accesibilidad y responsive

- Contraste ≥ 4.5:1 en texto; foco visible (`outline 2px --accent`, offset 2px; sobre la banda, outline `--on-ink`).
- Objetivos táctiles ≥ 44px en navegación; las celdas de tabla pueden ser más bajas pero los enlaces tienen área ≥ 24px.
- `prefers-reduced-motion`: sin transiciones.
- Comprobar a 390, 768 y 1440 px: sin desbordamiento de página; tablas con scroll propio solo si lo necesitan; nombres largos truncados con `title`.

## Fuera de alcance

Modo oscuro, nuevas funcionalidades o estadísticas, librerías de gráficos o de componentes, animaciones de scroll.
