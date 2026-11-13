# Criterios de interfaz · Marcador

Revisión con ui-ux-pro-max, 13 de noviembre de 2026. Se mantienen las tipografías Inter, Archivo y JetBrains Mono, con dos identidades deportivas propias sobre una estructura común de navegación y datos.

Las búsquedas generales de sistema visual produjeron patrones de marketing que no encajan con una aplicación de análisis; no se adoptaron ni se presentan como un sistema validado para este producto. Se aplican las pautas generales de la skill sobre jerarquía, navegación, interacción, accesibilidad y datos.

- Cinco destinos principales, visibles también en móvil: Liga, Partidos, Jugadores, Seguimiento y Mi once. Las vistas secundarias aparecen dentro de su grupo.
- Navegación con enlaces reales, liga y temporada conservadas, estado actual explícito y compatibilidad con enlaces antiguos.
- Verde como acento, superficies blancas, bordes discretos y títulos compactos. Los datos y estados tienen prioridad sobre la decoración.
- Iconos SVG coherentes junto a etiquetas. Foco visible, controles etiquetados y selección de jugadores con teclado.
- Divulgación progresiva de cobertura y gestión de favoritos; las ausencias de datos mantienen su explicación.
- Próximo partido destacado y calendario progresivo; tablas de jugadores en lotes para reducir desplazamiento.
- Once visual sin arrastre obligatorio: cada plaza es un botón, con búsqueda por nombre y restricciones de posición.
- Controles de texto a 16 px en móvil para evitar el zoom de formularios. Se respeta la preferencia de movimiento reducido.

La revisión visual cubre anchos de 390, 768 y 1440 px. Las capturas del README se generan sobre datos locales reales; los datos deportivos reflejan la última importación, no una conexión en directo.

## NBA

NBA combina azul noche, cobre y superficies cálidas; mantiene las tipografías, la jerarquía y los controles compartidos. Un selector de deporte evita mezclar métricas y favoritos. NBA conserva cinco destinos principales: Liga, Partidos, Jugadores, Modelos y Mi NBA; seguimiento y quinteto se agrupan en el espacio personal. El quinteto utiliza una cancha clara, cinco botones y búsqueda con teclado, sin depender del arrastre.

Los mapas ofrecen aciertos y fallos con formas distintas, probabilidad con tamaño/intensidad y una tabla alternativa. La media cancha es la vista inicial; se puede ampliar para ver lanzamientos lejanos. Las probabilidades muy próximas a cero o uno evitan redondeos que sugieran certeza. La advertencia de calendario parcial aparece antes de los resultados del simulador.

## Identidad por deporte y escudos

La consulta de ui-ux-pro-max identificó el estilo **Data-Dense Dashboard**, adecuado para tablas, indicadores y filtros. Su patrón de portada comercial no se aplicó. La búsqueda específica de color devolvió una paleta de club rojo; se descartó para evitar asociar el espacio multiequipo a un club. Las paletas siguientes son una adaptación propia, comprobada mediante pruebas de contraste para cada deporte.

| Rol | Fútbol | NBA |
|---|---|---|
| Fondo | `#F1F5F0` | `#F6F2ED` |
| Tinta de cabeceras | `#082D25` | `#111F33` |
| Acento funcional | `#126344` | `#A24416` |
| Superficie de acento | `#DCEEE2` | `#F8E3D3` |
| Detalle sobre tinta | `#ADF0B7` | `#FFC08C` |

Cada cabecera incorpora geometría decorativa de campo o cancha, un rótulo de deporte y una selección de temporada visible. La marca utiliza el símbolo correspondiente al deporte. Las tarjetas de indicadores tienen bordes, espacio y sombra suaves; la navegación activa incorpora una línea de acento. Se conservan las etiquetas, las alternativas tabulares y el movimiento reducido.

Los 30 logos NBA proceden del CDN oficial de NBA y los 121 escudos de fútbol disponibles en la base proceden de las URLs de football-data.org. Se guardan en `web/public/logos/`, con URL original y SHA-256 en `web/src/lib/team-logos.json`. Son marcas de sus respectivos titulares y se usan para identificar a los equipos; no se recolorean ni deforman. Se muestran como imágenes decorativas junto al nombre visible, sobre una base blanca con dimensiones reservadas. Si falta el recurso o falla su carga, aparece la abreviatura en el mismo espacio.

Los escudos locales evitan solicitudes externas al visitar las tablas. La correspondencia de fútbol en las vistas de Bzzoiro utiliza exclusivamente `localId`, sin equiparar IDs de proveedores diferentes. No se han modificado estadísticas ni modelos predictivos.
