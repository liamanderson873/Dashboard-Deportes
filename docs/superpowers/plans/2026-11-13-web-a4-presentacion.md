# Web A4: CI de la web, README con capturas y retirada de Streamlit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar el proyecto 1 listo para enseñar: la web se comprueba en GitHub en cada cambio, el README muestra capturas y una animación de la web funcionando, y la app Streamlit antigua desaparece porque la web ya la sustituye.

**Architecture:** Un segundo trabajo (`web`) en el workflow de GitHub Actions con su propio PostgreSQL de servicio. Las capturas se generan con un script reproducible (Playwright usando el Microsoft Edge instalado, sin descargar navegadores) y la animación con un script de Python (Pillow) a partir de esas capturas. La retirada de Streamlit borra solo la interfaz; la ingesta y sus tests se quedan.

**Tech Stack:** GitHub Actions, Node 24, npm, PostgreSQL 16, Playwright (`playwright-core`, canal `msedge`), Python 3 + Pillow.

**Spec:** `docs/superpowers/specs/2026-11-11-dashboard-web-nextjs-design.md` (fase A4 y "Streamlit: se conserva hasta que la web tenga las mismas secciones; después se elimina en un commit propio").

## Global Constraints

- Sin despliegue público (decisión del usuario: solo local).
- Ningún secreto en el repositorio ni en el workflow; las credenciales de CI son las de prueba `sports:sports`.
- Los tests nunca tocan la base `sports`; solo `sports_test`.
- READMEs de proyecto en inglés (`README.md` raíz y `01-dashboard-deportes/README.md`); `web/README.md` en español, como ahora.
- Las imágenes van en `01-dashboard-deportes/docs/img/`, en PNG/GIF, cada una por debajo de 1,5 MB.
- Mensajes de commit en inglés con el formato convencional del repo.

## Review Focus

1. La web en CI usa `TEST_DATABASE_URL` sin el sufijo `+psycopg` (postgres.js no lo acepta) y apunta al puerto 5432 del servicio.
2. `npm run build` en CI no necesita base de datos (páginas dinámicas) pero sí red para las fuentes de Google.
3. Al borrar Streamlit no se rompe ningún import ni test de Python (`queries.py` sigue si lo usan tests o la ingesta).
4. Las capturas no muestran datos personales ni rutas locales del usuario.

---

### Task 1: Trabajo de CI para la web

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1:** Renombrar el trabajo actual a `python` (mismo contenido) y añadir un trabajo `web` en paralelo: `ubuntu-latest`, `working-directory: 01-dashboard-deportes/web`, servicio `postgres:16` igual que el de Python (usuario/contraseña `sports`, base `sports_test`, puerto 5432, healthcheck), `env.TEST_DATABASE_URL: postgresql://sports:sports@localhost:5432/sports_test`, pasos `actions/checkout@v4`, `actions/setup-node@v4` con `node-version: 24`, `cache: npm`, `cache-dependency-path: 01-dashboard-deportes/web/package-lock.json`, y después `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
- [ ] **Step 2:** Validar el YAML (por ejemplo `python -c "import yaml,sys;yaml.safe_load(open('.github/workflows/ci.yml'))"`) y ejecutar localmente `npm test` con `TEST_DATABASE_URL=postgresql://sports:sports@127.0.0.1:5433/sports_test` para confirmar que la variable se respeta.
- [ ] **Step 3: Commit** `ci: run web lint, typecheck, tests and build`.

### Task 2: Retirar la app Streamlit

**Files:**
- Delete: `01-dashboard-deportes/app.py`, `01-dashboard-deportes/.streamlit/`, `01-dashboard-deportes/tests/test_app.py`
- Modify: `01-dashboard-deportes/requirements.txt` (quitar `streamlit` y lo que solo use la app, p. ej. `plotly` si nada más lo importa), `01-dashboard-deportes/README.md` (quitar instrucciones de Streamlit), `docs/guia-explicada.md` (la sección de Streamlit pasa a decir que fue la primera interfaz y se sustituyó por la web)

- [ ] **Step 1:** Comprobar con `grep` qué módulos importan `app.py`, `streamlit` o `plotly` y qué funciones de `queries.py`/`summary.py` usa solo la app. Borrar solo código sin otros usuarios; si una función tiene tests propios y se queda sin uso, se mantiene (la ingesta y sus consultas siguen siendo parte del proyecto).
- [ ] **Step 2:** Borrar los archivos y actualizar dependencias y documentos.
- [ ] **Step 3: Run** `pytest -q` desde `01-dashboard-deportes` con el venv. Expected: pasan (menos los tests borrados).
- [ ] **Step 4: Commit** `refactor: remove the Streamlit app now replaced by the web`.

### Task 3: Capturas, animación y READMEs

**Files:**
- Create: `01-dashboard-deportes/web/scripts/capture-screenshots.mjs`, `01-dashboard-deportes/scripts/make_demo_gif.py`, `01-dashboard-deportes/docs/img/*.png`, `01-dashboard-deportes/docs/img/demo.gif`, `README.md` (raíz)
- Modify: `01-dashboard-deportes/web/package.json` (devDependency `playwright-core` y script `screenshots`), `01-dashboard-deportes/README.md`, `01-dashboard-deportes/web/README.md`

- [ ] **Step 1:** `capture-screenshots.mjs`: con `playwright-core` y `chromium.launch({ channel: "msedge" })`, abre una URL base (argumento, por defecto `http://localhost:3000`) y guarda en `../docs/img/`: `standings.png` (`/pd/2024`, 1280×900), `results.png` (`/pd/2024/resultados/38`), `scorers.png` (`/pd/2024/goleadores`), `team.png` (`/pd/2024/equipo/81`, página completa recortada a 1280×1600), `compare.png` (`/pd/2024/comparar?a=81&b=86`), `mobile.png` (`/pd/2024` a 390×844). Espera a que no haya peticiones pendientes y a que las imágenes de escudos carguen. Además guarda fotogramas `frames/frame-XX.png` (1280×800) de un recorrido: clasificación → pulsar Barça → bajar al gráfico → Comparador → Resultados.
- [ ] **Step 2:** `make_demo_gif.py` (Pillow): lee `docs/img/frames/*.png` en orden, reduce a 960 px de ancho, paleta adaptativa, 1,6 s por fotograma, bucle infinito, guarda `docs/img/demo.gif` (< 1,5 MB; si pasa, reduce a 800 px). Los fotogramas no se suben a git (`.gitignore`).
- [ ] **Step 3:** Ejecutar ambos scripts contra el servidor de desarrollo con datos reales y revisar a ojo cada imagen.
- [ ] **Step 4: READMEs.**
  - `README.md` raíz (inglés): portada del portfolio — quién/para qué en dos líneas, tabla de proyectos (1: Football stats dashboard, enlace a la carpeta, stack, estado; 2: RAG study assistant, "planned"), y `demo.gif` arriba.
  - `01-dashboard-deportes/README.md`: arriba `demo.gif` y una galería con las capturas; sección "Web app" con rutas y cómo arrancar; sección "Architecture" actualizada (Streamlit fuera, web dentro) y CI con los dos trabajos; "Roadmap" con fases B, D, predicción y RAG.
  - `web/README.md`: comando `npm run screenshots` y requisitos (Edge instalado, servidor arrancado).
- [ ] **Step 5: Commit** `docs: add screenshots, demo gif and portfolio README`.
