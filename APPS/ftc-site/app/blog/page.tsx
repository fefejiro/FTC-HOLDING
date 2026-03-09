import type { Metadata } from "next";
import Link from "next/link";
import { blogPosts } from "../../lib/blog";

export const metadata: Metadata = {
  title: "Blog | Una Labs",
  description:
    "Insights from Una Labs on AI product development, automation systems, PeacePad, SayWetin, and creative AI studio execution.",
  alternates: {
    canonical: "/blog"
  }
};

export default function BlogPage() {
  return (
    <div className="container page-content">
      <h1>Una Labs Blog</h1>
      <p className="page-intro">
        Practical writing on AI product development, automation systems, and how Una Labs
        ships real-world products like PeacePad and SayWetin.
      </p>

      <div className="cards-grid">
        {blogPosts.map((post) => (
          <article key={post.slug} className="card">
            <p className="card-kicker">Blog Post</p>
            <h2>{post.title}</h2>
            <p className="muted">
              Published {post.publishedAt} | Updated {post.updatedAt}
            </p>
            <p>{post.excerpt}</p>
            <p className="section-link-row">
              <Link href={`/blog/${post.slug}`} className="inline-link">
                Read article
              </Link>
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
