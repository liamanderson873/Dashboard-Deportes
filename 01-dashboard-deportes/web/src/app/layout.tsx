import type { Metadata } from "next";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import { es } from "@/lib/es";
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
      </body>
    </html>
  );
}
