import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 20px',
        textAlign: 'center',
        background: '#0a0a0a',
        color: '#f5f5f5',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
      }}
    >
      <p
        style={{
          fontSize: '0.75rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: '#ffd23f',
          marginBottom: '16px',
        }}
      >
        404
      </p>
      <h1
        style={{
          fontSize: 'clamp(2rem, 6vw, 3.5rem)',
          fontWeight: 800,
          letterSpacing: '-1px',
          lineHeight: 1,
          marginBottom: '16px',
        }}
      >
        Page not found
      </h1>
      <p
        style={{
          color: '#a0a0a0',
          maxWidth: '40ch',
          marginBottom: '40px',
          lineHeight: 1.7,
        }}
      >
        This link doesn&apos;t exist. Head back to the portal and keep running.
      </p>
      <Link
        href="/"
        style={{
          display: 'inline-block',
          padding: '12px 32px',
          background: '#ffd23f',
          color: '#0a0a0a',
          borderRadius: '6px',
          fontWeight: 700,
          fontSize: '0.95rem',
          textDecoration: 'none',
        }}
      >
        Back to home
      </Link>
    </div>
  );
}
