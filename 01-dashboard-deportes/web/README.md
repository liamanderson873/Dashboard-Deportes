# Web de clasificaciones

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

## Rutas

- `/` redirige a la temporada más reciente de LaLiga (o de la primera liga con datos).
- `/{liga}/{año}`, por ejemplo `/pl/2026`: clasificación. Ligas: `pd`, `pl`, `sa`, `bl1`, `fl1`.
- Si la base de datos no responde se muestra una pantalla de error con los pasos para arrancarla.

## Notas

- Los tests de base de datos usan `sports_test` (nunca la base `sports`) y se niegan a
  ejecutarse contra otra.
- Usa `127.0.0.1` y no `localhost` en `DATABASE_URL` (en Windows `localhost` puede resolver a IPv6).
