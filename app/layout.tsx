import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Manual de Técnicas de Enfermería | UNLa",
    template: "%s | Manual de Enfermería UNLa",
  },
  description:
    "Manual digital de técnicas de enfermería de la Licenciatura en Enfermería, Departamento de Salud Comunitaria – UNLa.",
};

export const viewport: Viewport = {
  themeColor: "#8A1E3C",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
