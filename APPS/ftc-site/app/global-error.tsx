"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // global-error replaces the root layout entirely, so html/body are required
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "#0b0b0f",
          color: "#ffffff",
          fontFamily: "Inter, sans-serif",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "48px 24px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: "0.8rem",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "#6c5ce7",
            marginBottom: "16px",
          }}
        >
          Critical error
        </p>
        <h1
          style={{
            fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
            marginBottom: "16px",
            lineHeight: 1.15,
          }}
        >
          Something went seriously wrong
        </h1>
        <p
          style={{
            color: "#b8b8c0",
            maxWidth: "48ch",
            marginBottom: "40px",
            lineHeight: "1.7",
          }}
        >
          The page failed to load entirely. Try refreshing or return home.
        </p>
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}>
          <button
            onClick={reset}
            style={{
              padding: "12px 32px",
              background: "#6c5ce7",
              color: "#ffffff",
              border: "none",
              borderRadius: "16px",
              fontWeight: 600,
              fontSize: "0.95rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          <a
            href="/"
            style={{
              display: "inline-block",
              padding: "12px 32px",
              background: "transparent",
              color: "#b8b8c0",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "16px",
              fontWeight: 600,
              fontSize: "0.95rem",
              textDecoration: "none",
            }}
          >
            Back to home
          </a>
        </div>
      </body>
    </html>
  );
}
