import type { MetadataRoute } from "next";
import { blogPosts } from "../lib/blog";
import { projectCaseStudies } from "../lib/content";
import { getOgTradesAbsoluteUrl, isOgTradesCustomHost } from "../lib/ogTradesAcademy";
import { getRequestHost } from "../lib/requestHost";
import { SITE_URL } from "../lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const requestHost = getRequestHost();
  const lastModified = new Date();

  if (isOgTradesCustomHost(requestHost)) {
    return [
      { url: getOgTradesAbsoluteUrl("/", { host: requestHost }), lastModified, priority: 1.0 },
      { url: getOgTradesAbsoluteUrl("/about", { host: requestHost }), lastModified, priority: 0.8 },
      { url: getOgTradesAbsoluteUrl("/course", { host: requestHost }), lastModified, priority: 0.9 },
      { url: getOgTradesAbsoluteUrl("/resources", { host: requestHost }), lastModified, priority: 0.8 },
      { url: getOgTradesAbsoluteUrl("/community", { host: requestHost }), lastModified, priority: 0.8 },
      { url: getOgTradesAbsoluteUrl("/contact", { host: requestHost }), lastModified, priority: 0.8 }
    ];
  }

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified, priority: 1.0 },
    { url: `${SITE_URL}/work`, lastModified, priority: 0.9 },
    { url: `${SITE_URL}/projects`, lastModified, priority: 0.9 },
    { url: `${SITE_URL}/blog`, lastModified, priority: 0.8 },
    { url: `${SITE_URL}/peacepad`, lastModified, priority: 0.9 },
    { url: `${SITE_URL}/saywetin`, lastModified, priority: 0.9 },
    { url: `${SITE_URL}/about`, lastModified, priority: 0.7 },
    { url: `${SITE_URL}/capabilities`, lastModified, priority: 0.7 },
    { url: `${SITE_URL}/products`, lastModified, priority: 0.6 },
    { url: `${SITE_URL}/services/drone`, lastModified, priority: 0.6 },
    { url: `${SITE_URL}/work-with-ftc`, lastModified, priority: 0.5 },
    { url: `${SITE_URL}/garden-cleaners`, lastModified, priority: 0.8 },
    { url: `${SITE_URL}/garden-cleaners/about`, lastModified, priority: 0.7 },
    { url: `${SITE_URL}/garden-cleaners/services`, lastModified, priority: 0.8 },
    { url: `${SITE_URL}/garden-cleaners/contact`, lastModified, priority: 0.7 },
    { url: `${SITE_URL}/garden-cleaners/quote`, lastModified, priority: 0.8 },
    { url: `${SITE_URL}/polar-anchor`, lastModified, priority: 0.8 },
    { url: `${SITE_URL}/polar-anchor/about`, lastModified, priority: 0.7 },
    { url: `${SITE_URL}/polar-anchor/services`, lastModified, priority: 0.8 },
    { url: `${SITE_URL}/polar-anchor/contact`, lastModified, priority: 0.7 },
    { url: `${SITE_URL}/polar-anchor/quote`, lastModified, priority: 0.8 },
    { url: `${SITE_URL}/og-trades-academy`, lastModified, priority: 0.8 },
    { url: `${SITE_URL}/og-trades-academy/about`, lastModified, priority: 0.7 },
    { url: `${SITE_URL}/og-trades-academy/course`, lastModified, priority: 0.8 },
    { url: `${SITE_URL}/og-trades-academy/resources`, lastModified, priority: 0.7 },
    { url: `${SITE_URL}/og-trades-academy/community`, lastModified, priority: 0.7 },
    { url: `${SITE_URL}/og-trades-academy/contact`, lastModified, priority: 0.7 }
  ];

  const workEntries = projectCaseStudies.map((project) => ({
    url: `${SITE_URL}/work/${project.slug}`,
    lastModified,
    priority: 0.8
  }));
  const blogEntries = blogPosts.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    priority: 0.7
  }));
  return [...staticEntries, ...workEntries, ...blogEntries];
}
