# Guía explicada: qué hemos usado, cómo funciona y por qué

Esta guía está escrita para alguien que empieza de cero. Cada herramienta tiene cuatro partes:
**qué es** (con una comparación de la vida real), **cómo se usa en este proyecto**, **por qué la elegimos**
y **qué alternativas había**. Lo que todavía no está construido se marca como *pendiente*.

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

## 10. Streamlit (la primera interfaz) y la web Next.js

**Streamlit** convierte un script de Python en una web de datos con pocas líneas. Lo elegimos primero porque es
rápido y deja ver los datos pronto. Su límite es el aspecto visual, así que fue la **primera interfaz** y ya se
ha **retirado**: la sustituye la web de Next.js, que cubre las mismas secciones y más.

- **Next.js:** un marco para hacer webs completas. Permite un diseño totalmente a medida y lee directamente
  de PostgreSQL (carpeta `web/`).
- **React y TypeScript:** React construye la interfaz con piezas reutilizables; TypeScript es JavaScript con
  "avisos" que cazan errores antes de ejecutar.
- **Tailwind CSS:** pone el estilo con clases cortas.

## 11. Conceptos de fútbol y de datos que conviene saber

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

## 12. Cómo trabajamos: ayudantes que construyen y ayudantes que revisan

Para la fase de datos usamos un método con **subagentes**: por cada tarea, un ayudante nuevo la programa y otro,
distinto, la revisa sin haberla escrito. Al final, un revisor con el modelo más capaz mira la rama entera.
**Por qué.** Quien escribe un código no ve sus propios fallos; una segunda mirada fresca sí. Entre las revisiones
encontraron, por ejemplo: la posición de los jugadores borrada por la lista de goleadores, nombres de equipo
ambiguos que se asignaban al azar, y un archivo de alias que se rompía con un error ilegible.

## 13. Chuleta de comandos

Desde la carpeta `01-dashboard-deportes`:

```bash
docker compose up -d                       # levanta PostgreSQL
python -m sports_dashboard.ingest --competitions PD,PL,SA,BL1,FL1 --seasons 2024,2025,2026
python -m sports_dashboard.stats_import    # importa los CSV de football-data.co.uk
pytest -q                                  # ejecuta los tests
```

## 14. Glosario rápido

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
