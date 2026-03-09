import type { MetadataRoute } from "next";
import { blogPosts } from "../lib/blog";
import { projectCaseStudies } from "../lib/content";
import { SITE_URL } from "../lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified,
      priority: 1.0
    },
    {
      url: `${SITE_URL}/work`,
      lastModified,
      priority: 0.9
    },
    {
      url: `${SITE_URL}/projects`,
      lastModified,
      priority: 0.9
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified,
      priority: 0.8
    },
    {
      url: `${SITE_URL}/peacepad`,
      lastModified,
      priority: 0.9
    },
    {
      url: `${SITE_URL}/saywetin`,
      lastModified,
      priority: 0.9
    },
    {
      url: `${SITE_URL}/about`,
      lastModified,
      priority: 0.7
    },
    {
      url: `${SITE_URL}/capabilities`,
      lastModified,
      priority: 0.7
    },
    {
      url: `${SITE_URL}/products`,
      lastModified,
      priority: 0.6
    },
    {
      url: `${SITE_URL}/work-with-ftc`,
      lastModified,
      priority: 0.5
    }
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
