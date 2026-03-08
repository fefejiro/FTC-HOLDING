import type { MetadataRoute } from "next";
import { projectCaseStudies } from "../lib/content";
import { SITE_URL } from "../lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/capabilities",
    "/work",
    "/products",
    "/about",
    "/work-with-ftc"
  ];

  const staticEntries = staticRoutes.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date()
  }));

  const workEntries = projectCaseStudies.map((project) => ({
    url: `${SITE_URL}/work/${project.slug}`,
    lastModified: new Date()
  }));

  return [...staticEntries, ...workEntries];
}

