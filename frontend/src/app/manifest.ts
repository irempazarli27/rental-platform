import type { MetadataRoute } from "next";

// Makes the site installable ("Add to Home Screen") as a standalone app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Paylaşımlık",
    short_name: "Paylaşımlık",
    description: "Güvenli P2P eşya kiralama platformu",
    lang: "tr",
    start_url: "/",
    display: "standalone",
    background_color: "#fafaf9",
    theme_color: "#ec003f",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
