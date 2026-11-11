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
