import type { Metadata } from "next";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import { es } from "@/lib/es";
import Link from "next/link";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Narrow scoreboard figures and titles use the width axis (font-stretch 75%).
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: es.appTitle,
  description: es.appDescription,
};

// The ink band and the page header are rendered by each page (LeagueHeader or
// SiteBand), because only the page knows the current league.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${archivo.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-2 focus:z-50 focus:rounded-control focus:bg-card focus:px-4 focus:py-2 focus:font-semibold focus:text-accent"
        >
          {es.skipLink}
        </a>
        <main className="shell min-h-dvh">{children}</main>
        <footer className="border-t border-border bg-card px-4 py-6 text-sm text-muted sm:px-6">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>Marcador · Proyecto personal · Datos importados, sin directo</p>
            <nav aria-label="Información del proyecto" className="flex flex-wrap gap-x-6 gap-y-2">
              <Link className="inline-flex min-h-11 items-center font-semibold text-accent" href="/acerca">Sobre el proyecto</Link>
              <a className="inline-flex min-h-11 items-center font-semibold text-accent" href="https://github.com/liamanderson873/Dashboard-Deportes">Código en GitHub</a>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
