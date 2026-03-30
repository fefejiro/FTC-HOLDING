import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title: string;
  description: string;
  ogImage?: string;
  ogType?: string;
  keywords?: string;
  canonical?: string;
  noindex?: boolean;
  jsonLd?: object;
  article?: {
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
  };
}

const defaultKeywords = "co-parenting app, co-parent communication, calm messaging, prep chat, custody calendar, separated parents, divorce communication, parallel parenting";

export function SEOHead({
  title,
  description,
  ogImage = "https://peacepad.ca/og-image.png",
  ogType = "website",
  keywords,
  canonical,
  noindex = false,
  jsonLd,
  article,
}: SEOHeadProps) {
  const baseUrl = "https://peacepad.ca";
  const fullCanonical = canonical || window.location.pathname;
  const canonicalUrl = fullCanonical.startsWith('http') ? fullCanonical : `${baseUrl}${fullCanonical}`;
  const fullTitle = title.includes("PeacePad") ? title : `${title} | PeacePad`;
  const fullKeywords = keywords ? `${keywords}, ${defaultKeywords}` : defaultKeywords;
  
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={fullKeywords} />
      <meta name="author" content="PeacePad" />
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
      )}
      <meta name="googlebot" content={noindex ? "noindex, nofollow" : "index, follow"} />
      
      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={title} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content="PeacePad" />
      <meta property="og:locale" content="en_CA" />
      
      {/* Article specific OG tags */}
      {article && ogType === "article" && (
        <>
          {article.publishedTime && <meta property="article:published_time" content={article.publishedTime} />}
          {article.modifiedTime && <meta property="article:modified_time" content={article.modifiedTime} />}
          {article.author && <meta property="article:author" content={article.author} />}
        </>
      )}
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@peacepadca" />
      <meta name="twitter:creator" content="@peacepadca" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={title} />
      
      {/* Canonical */}
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Custom JSON-LD */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
}
