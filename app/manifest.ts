import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Manual de Técnicas de Enfermería — UNLa",
    short_name: "Manual Enfermería",
    description:
      "Manual digital de técnicas de enfermería de la Licenciatura en Enfermería, UNLa.",
    lang: "es-AR",
    dir: "ltr",
    start_url: "/inicio",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFFFFF",
    theme_color: "#8A1E3C",
    categories: ["education", "medical"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Inicio", url: "/inicio" },
      { name: "Técnicas", url: "/tecnicas" },
      { name: "Mi perfil", url: "/perfil" },
    ],
  };
}
