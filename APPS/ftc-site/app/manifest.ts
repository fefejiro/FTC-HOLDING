import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Garden Cleaners Portal",
    short_name: "Garden Portal",
    description: "Garden Cleaners customer, staff, and admin service operations portal.",
    start_url: "/portal",
    scope: "/portal",
    display: "standalone",
    background_color: "#f5faf5",
    theme_color: "#1a7b62",
    icons: [
      {
        src: "/brand/garden-cleaners-mark.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any"
      },
      {
        src: "/brand/garden-cleaners-mark.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable"
      },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      }
    ]
  };
}
