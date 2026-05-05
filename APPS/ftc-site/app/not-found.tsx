import Link from "next/link";

export default function NotFound() {
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
        404
      </p>
      <h1
        style={{
          fontSize: "clamp(2rem, 5vw, 3rem)",
          marginBottom: "16px",
          color: "var(--text)",
        }}
      >
        Page not found
      </h1>
      <p
        style={{
          color: "var(--muted)",
          maxWidth: "48ch",
          marginBottom: "40px",
          lineHeight: "1.7",
        }}
      >
        This link may have moved or no longer exists. Head back home and we will
        point you in the right direction.
      </p>
      <Link
        href="/"
        style={{
          display: "inline-block",
          padding: "12px 32px",
          background: "var(--accent)",
          color: "var(--text)",
          borderRadius: "var(--radius)",
          fontWeight: 600,
          textDecoration: "none",
          fontSize: "0.95rem",
        }}
      >
        Back to home
      </Link>
    </div>
  );
}
