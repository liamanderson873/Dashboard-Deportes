import type { Metadata } from "next";
import Link from "next/link";
import { SiteBand } from "@/components/SiteBand";

export const metadata: Metadata = { title: "Sobre el proyecto · Marcador", description: "Cómo explorar Marcador, de dónde proceden sus datos y cómo interpretar sus modelos." };
const repo = "https://github.com/liamanderson873/Dashboard-Deportes";

export default function AboutPage() {
  return <>
    <SiteBand />
    <header id="contenido" className="mb-8 mt-8 max-w-3xl">
      <p className="mono text-xs font-semibold uppercase tracking-wider text-accent">Proyecto personal · Ingeniería y análisis deportivo</p>
      <h1 className="display mt-3 text-4xl font-extrabold tracking-tight">El deporte, con contexto</h1>
      <p className="mt-4 text-lg leading-relaxed text-muted">Marcador reúne fútbol y NBA para explorar estadísticas, comparar jugadores y entender qué pueden aportar los modelos predictivos. Desarrollado con Python, PostgreSQL y Next.js.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link className="inline-flex min-h-11 items-center rounded-control bg-ink px-4 font-semibold text-on-ink" href="/">Explorar fútbol</Link>
        <Link className="inline-flex min-h-11 items-center rounded-control border border-border bg-card px-4 font-semibold text-accent" href="/nba">Explorar NBA</Link>
      </div>
    </header>
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-panel border border-border bg-card p-6" aria-labelledby="start">
        <h2 id="start" className="display text-2xl font-bold">Un recorrido de dos minutos</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-muted">
          <li>Abre una liga, revisa su clasificación y consulta los próximos partidos.</li>
          <li>Busca jugadores por nombre y compara sus cifras. Guarda favoritos o construye tu alineación.</li>
          <li>En NBA, abre Jugadores → Mapa de jugadores y cruza puntos por partido con TS%. Filtra por minutos y partidos para comparar muestras suficientes.</li>
          <li>En Simulador, distingue el escenario base de tus condiciones. Consulta la evaluación histórica y las limitaciones.</li>
        </ol>
      </section>
      <section className="rounded-panel border border-border bg-card p-6" aria-labelledby="data">
        <h2 id="data" className="display text-2xl font-bold">Datos reales, importaciones periódicas</h2>
        <p className="mt-4 text-sm leading-relaxed text-muted">Fútbol utiliza football-data.org, football-data.co.uk y Bzzoiro. NBA utiliza archivos públicos de SportsDataverse derivados de NBA Stats. Las fichas muestran la cobertura disponible y las fechas de descarga o importación cuando se conocen.</p>
        <p className="mt-3 text-sm leading-relaxed text-muted">La web lee una instantánea almacenada: no sigue los partidos en directo ni descarga datos al navegar. Un partido en curso puede conservar su estado anterior hasta la siguiente importación. La ausencia de datos se muestra con —; no se inventan ceros ni tiros.</p>
        <a className="mt-3 inline-flex min-h-11 items-center font-semibold text-accent" href={`${repo}/blob/main/docs/bsd-integration.md`}>Fuentes y cobertura de fútbol</a>
      </section>
      <section className="rounded-panel border border-border bg-card p-6" aria-labelledby="models">
        <h2 id="models" className="display text-2xl font-bold">Qué estima cada modelo</h2>
        <p className="mt-4 text-sm leading-relaxed text-muted">La regresión logística de partidos utiliza diez temporadas completas y características anteriores a cada encuentro. Las simulaciones convierten esas probabilidades en recorridos posibles de temporada, NBA Cup y playoffs; los cruces simulados no son cuadros oficiales.</p>
        <p className="mt-3 text-sm leading-relaxed text-muted">El gradient boosting de tiros utiliza tres temporadas completas. Estima el acierto por ubicación y contexto disponible; los puntos más grandes y oscuros representan mayor dificultad. No incluye habilidad individual del tirador, distancia al defensor ni reloj de posesión.</p>
        <p className="mt-3 text-sm leading-relaxed text-muted">La evaluación reserva periodos posteriores al entrenamiento. Sus métricas describen esa prueba histórica, sin garantizar resultados futuros. AUC no equivale a porcentaje de aciertos. El simulador detalla sus aproximaciones de calendario y desempates.</p>
        <a className="mt-3 inline-flex min-h-11 items-center font-semibold text-accent" href={`${repo}/blob/main/docs/nba-integration.md`}>Metodología y resultados medidos</a>
      </section>
      <section className="rounded-panel border border-border bg-card p-6" aria-labelledby="personal">
        <h2 id="personal" className="display text-2xl font-bold">Tu espacio y el código</h2>
        <p className="mt-4 text-sm leading-relaxed text-muted">Favoritos y alineaciones se guardan en este navegador, sin cuenta. No se sincronizan entre dispositivos y pueden desaparecer al borrar sus datos. Los escenarios no modifican resultados reales ni vuelven a entrenar los modelos.</p>
        <p className="mt-3 text-sm leading-relaxed text-muted">El repositorio incluye ingestas, consultas, modelos, pruebas automatizadas, arquitectura e instrucciones de reproducción. Las fuentes y marcas pertenecen a sus respectivos titulares. Marcador no es un producto oficial de NBA ni de sus proveedores.</p>
        <a className="mt-3 inline-flex min-h-11 items-center font-semibold text-accent" href={repo}>Ver código y documentación</a>
      </section>
    </div>
  </>;
}
