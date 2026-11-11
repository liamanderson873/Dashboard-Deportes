import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clasificaciones de fútbol",
  description: "Clasificaciones de las cinco grandes ligas europeas",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
