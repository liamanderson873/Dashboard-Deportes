# Revisión final de Marcador para portfolio

Revisión del 14 de noviembre de 2026, completada con la publicación. **88/100: demo pública operativa y preparada para presentar en el CV.** Es una prioridad de trabajo orientativa, no una medida estadística de calidad.

## Evidencia comprobada

| Área | Resultado |
|---|---|
| Navegación y responsive | Las cinco ligas y los espacios NBA se revisaron en móvil. En la compilación final se comprobaron 12 rutas en 375 y 1440 px: 24 vistas sin desbordamiento, un único h1, pie de información, controles con etiqueta e imágenes cargadas en la muestra. Incluye fichas, comparación, seguimiento, alineaciones, mapa NBA y 404. |
| Recorridos personales | Búsqueda de Mbappé sin tilde; comparación Mbappé/Yamal mediante teclado; favorito conservado en seguimiento; Courtois conservado en portería tras recarga y rechazo de un delantero para esa plaza; Curry conservado en el quinteto NBA. Las comprobaciones esperan a la hidratación del almacenamiento local. |
| Modelos | Contraste de documentación, consultas e informe de evaluación existente. Se conservan la separación temporal y las probabilidades entrenadas; no se reentrenó ni se añadieron variables durante esta revisión. |
| Servicios | Readiness 200 con el esquema requerido. Historial 200 con 1.017 pronósticos distintos en la instantánea. Temporada inválida en simulación: 400. Pruebas de 503 para errores de conexión y tablas ausentes. |
| Errores | Pruebas para ocultar detalles privados de conexión, distinguir historial vacío de indisponibilidad y liberar la exclusión de simulación después de un fallo. La interfaz permite reintentar sin mostrar comandos técnicos al visitante. |
| Copia de demo | Dump privado de 7,36 MiB. Restauración real en otra base PostgreSQL 16 con 24 recuentos verificados. Conserva 528 jugadores NBA, 29.857 tiros, cuatro registros de modelos y 3.051 versiones del historial. Sin consultas a proveedores. |
| Restauración | Otro destino vacío, SHA-256 coincidente y transacción única, sin borrado ni `--clean`. Pruebas de rechazo de origen, destino ocupado y archivo modificado. Credenciales por entorno, fuera de argumentos y errores publicados. |
| Calidad | 137 pruebas Python y 201 web en local; Ruff, ESLint, TypeScript y build de producción correctos. Las suites usan sports_test, separada del origen y la demo restaurada. |
| Presentación | Página `/acerca`, pie con documentación/código, fechas visibles, README, guía de despliegue y CV, y MP4 de 90 segundos con diez escenas reales y rótulos. |

La revisión visual observa una muestra concreta; no certifica todos los navegadores ni accesibilidad completa. La migración a Neon y el despliegue público están comprobados; no se ha realizado una prueba de carga ni medido tráfico sostenido.

## Correcciones aplicadas

- Mensajes de error y estados vacíos orientados al visitante; configuración técnica en documentación.
- Errores 503 claros de historial/simulador sin excepciones privadas y endpoint `/api/health` sin detalles internos.
- Fecha del calendario NBA y de la importación individual de fútbol visibles sin abrir detalles; aviso de ausencia de directo.
- Página de contexto con recorrido, fuentes, metodología y código, enlazada desde todas las páginas.
- Margen de desplazamiento para evitar que la cabecera fija oculte controles al navegar por teclado o anclas.
- Exportación/restauración de la demo, incluyendo el ajuste de sesión incompatible entre clientes PostgreSQL 17 y servidor 16.

## Publicación completada

**[marcador-xi.vercel.app](https://marcador-xi.vercel.app)** está publicada en Vercel Hobby y Neon Free. Se restauraron las 24 tablas y se verificó un rol de lectura con acceso SELECT y sin INSERT/UPDATE/DELETE. La conexión de administración permanece local; Vercel recibe exclusivamente la conexión pooled de lectura como secreto de producción. Las funciones están en Frankfurt, cerca de la base.

Se comprobaron nueve lecturas HTTP sin cookies de autenticación: salud, información del proyecto, fútbol, jugadores, NBA, ficha de Curry, mapa, modelos e historial. Todas devolvieron 200. El navegador mostró el mapa interactivo con 266 jugadores iniciales. El historial contiene 1.017 pronósticos distintos. El simulador devolvió 200 tanto en el escenario base como al condicionar un resultado, con 2.000 simulaciones por petición (3,88 y 2,34 segundos en esta observación).

El manifiesto de 275 archivos de subida se revisó para excluir credenciales, archivos `.env`, estado de Vercel, cachés, pruebas y dumps. No se activó ningún plan de pago. La publicación se hizo por CLI; la CI de GitHub sigue validando el repositorio y todavía no hay despliegue automático por cada push. Pasos de mantenimiento y recuperación en [despliegue-demo.md](despliegue-demo.md).

El código, la demo pública y el [recorrido visual](media/marcador-90s.mp4) ya se pueden enlazar desde el CV.

## Material para presentar

- [Recorrido visual de 90 segundos](media/marcador-90s.mp4), con [capítulos y formato](media/README.md).
- [Texto para el CV y preguntas de entrevista](portfolio-cv.md).
- [Fuentes, entrenamiento y evaluación NBA](nba-integration.md).
- [Simulación y aproximaciones](nba-laboratory.md).
- [Lectura de gráficos y corrección de unidades](nba-visual-analysis.md).

Mantener como mejoras futuras el backtesting en más temporadas, la calibración en extremos y la actualización del calendario. No son requisitos para presentar honestamente el alcance actual.
