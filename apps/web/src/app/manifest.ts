import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Just1date — Meet someone worth choosing",
    short_name: "Just1date",
    description:
      "Meaningful connections, shared intentions and thoughtful conversations.",
    start_url: "/discover?source=installed",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    lang: "en",
    orientation: "portrait-primary",
    categories: ["social", "lifestyle"],
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
      {
        name: "Discover",
        url: "/discover",
        description: "Find a thoughtful connection",
      },
      {
        name: "Messages",
        url: "/messages",
        description: "Continue a conversation",
      },
    ],
  };
}
