# Publicar una demo reproducible de Marcador

La aplicación completa necesita un servidor Next.js y PostgreSQL. La propuesta para este proyecto personal es **Vercel Hobby + Neon Free**, con una copia precargada. No necesita las claves deportivas al navegar. Las cuentas todavía no se han creado y no hay URL pública de la aplicación verificada.

- [Vercel Hobby: uso personal y límites](https://vercel.com/docs/plans/hobby).
- [Neon en Vercel Marketplace](https://vercel.com/integrations/neon).
- [Conexiones agrupadas de Neon](https://neon.com/docs/connect/connection-pooling).

Comprueba los planes disponibles al crear las cuentas y selecciona los gratuitos. No hace falta contratar un dominio. El uso real debe caber en sus cuotas; esta guía no activa servicios ni facturación.

## 1. Copia privada, preparada desde los datos existentes

Necesitas las herramientas PostgreSQL `pg_dump`, `pg_restore` y `psql` en PATH, además del entorno Python del proyecto. Desde `01-dashboard-deportes`, con `DATABASE_URL` en `.env` apuntando al origen:

```powershell
.venv/Scripts/python.exe scripts/demo_database.py export data/demo/marcador-demo.dump
```

Genera un archivo comprimido y un manifiesto con fecha, SHA-256 y recuentos por tabla. El dump y el manifiesto deben permanecer privados y fuera de Git. Solo exporta el esquema `public` de esta base deportiva; no exporta variables de entorno, cuentas de PostgreSQL ni claves API. La transacción de lectura fija una instantánea coherente para el dump y sus recuentos.

La copia conserva datos, predicciones publicadas e historial. La caché de descarga y los binarios de entrenamiento no son necesarios para servirla. Para volver a entrenar sí debes seguir la guía NBA y recuperar las fuentes verificadas.

## 2. Crear y cargar una base vacía en Neon

Crea una cuenta y un proyecto gratuito en Neon. Elige una región cercana al futuro servidor web. Guarda la conexión **directa** con TLS en el `.env` privado del proyecto como `DEMO_DATABASE_URL`; no la pegues en el chat, en un comando ni en Git.

```dotenv
# Ejemplo ilustrativo; utiliza el valor privado del panel, sin perder sslmode=require.
DEMO_DATABASE_URL=postgresql://USUARIO:CONTRASENA@HOST/BASE?sslmode=require
```

Restaura únicamente un dump creado por ti y de confianza:

```powershell
.venv/Scripts/python.exe scripts/demo_database.py restore data/demo/marcador-demo.dump
```

El script rechaza la misma base de origen, cualquier destino con tablas en `public` y archivos cuyo SHA-256 no coincide con el manifiesto. Ejecuta la restauración en una sola transacción y verifica los recuentos. No utiliza `DROP`, `--clean` ni sobrescribe una base existente. Si el destino ya contiene datos, crea otra base o rama vacía para la nueva versión.

Se ha ensayado el ciclo completo en una base local independiente PostgreSQL 16, con clientes PostgreSQL 17: **24 tablas verificadas**, incluidos los modelos y el historial. El script omite únicamente el ajuste de sesión `transaction_timeout=0` que emite pg_dump 17 y no reconoce PostgreSQL 16. Una migración a Neon aún necesita su comprobación real.

## 3. Cuenta de lectura para la web

Desde el editor SQL del proveedor, crea un rol separado de la cuenta de importación:

```sql
CREATE ROLE marcador_web LOGIN;
GRANT USAGE ON SCHEMA public TO marcador_web;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO marcador_web;
```

Asigna su contraseña mediante el gestor de roles o `\password marcador_web` en psql, sin guardarla en un archivo SQL. Usa la conexión **pooled** con ese rol para la web y conserva TLS. Las rutas web solo leen la base; la simulación calcula en memoria. Las importaciones y restauraciones requieren la cuenta propietaria, separada de la web. Después de futuras tablas nuevas, concede también su lectura al rol.

## 4. Publicar en Vercel

1. Crea una cuenta Hobby y autoriza el acceso al repositorio `liamanderson873/Dashboard-Deportes`.
2. Importa el repositorio y selecciona **Root Directory: `01-dashboard-deportes/web`** y framework **Next.js**.
3. Usa Node.js **24**, instalación `npm ci` y compilación `npm run build`.
4. Configura únicamente `DATABASE_URL` como variable privada del servidor, con la conexión pooled de lectura. Nunca uses el prefijo `NEXT_PUBLIC_`.
5. Publica la rama `main`. No añadas FOOTBALL_API_KEY ni BZZOIRO_API_KEY a Vercel: la demo no las consume.

El entrenamiento permanece fuera de la petición web, en CPU local. No se ejecutan ingestas al arrancar ni se necesitan credenciales de las APIs para una demo precargada. Un fallo del proveedor no borra esta copia de datos; un fallo del alojamiento PostgreSQL sí impedirá consultarla y mostrará el estado de error.

## 5. Comprobación de la URL publicada

- `GET /api/health` debe devolver `200 {"status":"ok"}`: comprueba conectividad y presencia de tablas esenciales, no certifica actualidad ni exactitud de los datos. Un fallo devuelve 503 sin detalles de conexión.
- Abre fútbol, NBA, una ficha, el mapa de jugadores y el simulador. Comprueba que las fechas de importación siguen visibles y que no hay claves en respuestas ni en el navegador.
- Confirma que se carga el historial, que la simulación termina y que un escenario no modifica la base. Verifica `/acerca`, un enlace inexistente y móvil.
- Añade la URL real al README y al CV solo después de esa comprobación. Usa una ventana privada para confirmar que el visitante no necesita cuenta.

## Recuperación

Para un fallo de interfaz, vuelve al despliegue anterior desde Vercel. Para un cambio de datos, restaura el dump privado anterior en otra base vacía, verifica sus recuentos y cambia `DATABASE_URL` al nuevo destino; conserva la anterior hasta terminar la comprobación. No hay migraciones destructivas ni tareas automáticas de importación en este despliegue.

## Estado actual

Código, pruebas, snapshot privado y ensayo local de restauración preparados. **Pendiente: crear las cuentas, restaurar en Neon, desplegar en Vercel y verificar la URL pública.**
