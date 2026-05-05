import { notFound, permanentRedirect } from "next/navigation";
import { ATEAM_SITE_URL } from "../../../lib/site";

export const runtime = "edge";

// This route exists as a safety net for legacy /work/<slug> links used across the site.
// Client launches live under /work and products live under /products (or their dedicated route).
export default function WorkSlugPage({ params }: { params: { slug: string } }) {
  const slug = String(params.slug || "").trim().toLowerCase();

  if (slug === "peacepad") {
    permanentRedirect("/products/peacepad");
  }

  if (slug === "saywetin") {
    permanentRedirect("/saywetin");
  }

  if (slug === "ateam") {
    permanentRedirect(ATEAM_SITE_URL);
  }

  if (slug === "polar-anchor") {
    permanentRedirect("/polar-anchor");
  }

  if (slug === "garden-cleaners") {
    permanentRedirect("/garden-cleaners");
  }

  notFound();
}
