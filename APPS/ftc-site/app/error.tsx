"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to the console so it appears in server/browser logs
    console.error(error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "calc(100vh - 140px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "64px 24px",
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontSize: "0.8rem",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "var(--accent)",
          marginBottom: "16px",
        }}
      >
        Something went wrong
      </p>
      <h1
        style={{
          fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
          marginBottom: "16px",
          color: "var(--text)",
        }}
      >
        An unexpected error occurred
      </h1>
      <p
        style={{
          color: "var(--muted)",
          maxWidth: "48ch",
          marginBottom: "40px",
          lineHeight: "1.7",
        }}
      >
        We hit a snag on our end. You can try again or head back home.
      </p>
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={reset}
          style={{
            padding: "12px 32px",
            background: "var(--accent)",
            color: "var(--text)",
            border: "none",
            borderRadius: "var(--radius)",
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
            color: "var(--muted)",
            border: "1px solid var(--glass-border)",
            borderRadius: "var(--radius)",
            fontWeight: 600,
            fontSize: "0.95rem",
            textDecoration: "none",
          }}
        >
          Back to home
        </a>
      </div>
    </div>
  );
}
