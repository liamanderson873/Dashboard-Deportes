import type { Metadata } from "next";
import { Fira_Code, Fira_Sans } from "next/font/google";
import { es } from "@/lib/es";
import "./globals.css";

const firaSans = Fira_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-fira-sans",
  display: "swap",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-fira-code",
  display: "swap",
});

export const metadata: Metadata = {
  title: es.appTitle,
  description: es.appDescription,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${firaSans.variable} ${firaCode.variable}`}>
      <body>
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-card focus:bg-card focus:px-4 focus:py-2 focus:font-semibold focus:text-accent"
        >
          {es.skipLink}
        </a>
        <header className="mx-auto max-w-[1040px] px-6 pt-6">
          <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-accent">
            {es.appTitle}
          </p>
        </header>
        <main id="contenido" className="mx-auto max-w-[1040px] px-6 pb-14 pt-4">
          {children}
        </main>
      </body>
    </html>
  );
}
