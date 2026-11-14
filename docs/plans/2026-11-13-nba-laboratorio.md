# Laboratorio NBA: alcance aprobado

Objetivo: cuadros visuales de playoffs y NBA Cup, escenarios de resultados, temporada simulada de 82 partidos, historial prospectivo, tendencias y explicación de probabilidades.

Contrato: los resultados publicados son inmutables en escenarios; no se escriben fixtures inventados en el calendario oficial. Los treinta encuentros no asignados se completan dentro de cada simulación, conservando dos partidos adicionales por equipo y distinguiendo los emparejamientos hipotéticos. La final de Cup no cuenta para la temporada regular. La fuerza de equipos se fija al corte disponible.

Historial: solo publicar predicciones cuando la fecha NBA del encuentro sea posterior al día de emisión (no conocemos la hora de inicio). Guardar versión, corte, probabilidad y contribuciones; conservar versiones durante nuevas ingestas. Evaluar únicamente resultados terminados y pronósticos realmente guardados antes del encuentro. Nunca reconstruir un historial aparente a partir de resultados conocidos.

Modelos: reutilizar regresión logística evaluada; explicar su suma exacta de contribuciones en log-odds. Ajustar una regresión Ridge de margen con características previas y evaluación temporal para los desempates simulados. No confundir explicaciones con causas ni el ejemplo de cuadro con un cuadro oficial.

NBA Cup 2026: grupos y fechas contrastados con https://www.nba.com/news/nba-cup-101 ; validar 60 juegos, cuatro por equipo y pertenencia al grupo contra el archivo de calendario. Conservar resultados de grupo y tratar prórrogas según datos de regulación disponibles; no atribuir precisión inexistente a desempates incompletos.

Entrega: SQL aditivo, publicación offline reproducible, motor determinista con pruebas de invariantes, interfaz con teclado y tablas, revisión móvil/escritorio, README y CI. No modificar fútbol ni reentrenar tiros para una mejora de interfaz.
