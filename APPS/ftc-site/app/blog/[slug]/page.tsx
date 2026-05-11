export const dynamic = "force-dynamic";
export const runtime = "edge";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { blogPosts, getBlogPost } from "../../../lib/blog";
import { SITE_URL } from "../../../lib/site";

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getBlogPost(params.slug);
  if (!post) {
    return {
      title: "Blog | Una Labs"
    };
  }

  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    alternates: {
      canonical: `/blog/${post.slug}`
    },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url: `${SITE_URL}/blog/${post.slug}`,
      siteName: "Una Labs",
      images: [
        {
          url: `${SITE_URL}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: "Una Labs - Creative AI Studio - Building AI products"
        }
      ],
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [`${SITE_URL}/opengraph-image`]
    }
  };
}

export default function BlogDetailPage({ params }: { params: { slug: string } }) {
  const post = getBlogPost(params.slug);
  if (!post) notFound();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: {
      "@type": "Organization",
      name: "Una Labs"
    },
    publisher: {
      "@type": "Organization",
      name: "Una Labs",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo.png`
      }
    },
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
    keywords: post.keywords.join(", ")
  };

  return (
    <div className="home-page home-page--sunrise" style={{ background: "#f5f7f9" }}>
      <article className="container case-study blog-detail">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData)
        }}
      />
      <p className="card-kicker">Blog</p>
      <h1>{post.title}</h1>
      <p className="muted">
        Published{" "}
        <time dateTime={post.publishedAt}>
          {new Date(post.publishedAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric"
          })}
        </time>{" "}
        | Updated{" "}
        <time dateTime={post.updatedAt}>
          {new Date(post.updatedAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric"
          })}
        </time>
      </p>
      <p className="page-intro">{post.excerpt}</p>

      {post.sections.map((section) => (
        <section key={section.heading}>
          <h2>{section.heading}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>
      ))}

      <section>
        <h2>Related Links</h2>
        <ul>
          {post.relatedLinks.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="inline-link">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <p className="section-link-row">
          <Link href="/blog" className="inline-link">
            Back to all blog posts
          </Link>
        </p>
      </section>
      </article>
    </div>
  );
}
