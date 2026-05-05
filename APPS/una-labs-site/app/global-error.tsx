'use client';

import { useEffect } from 'react';

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

  // global-error replaces the root layout entirely — html and body are required here
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: '#FFFFFF',
          color: '#0B0E11',
          fontFamily: 'Inter, system-ui, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '48px 24px',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontSize: '0.75rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontWeight: 600,
            color: '#4DB8A8',
            marginBottom: '16px',
          }}
        >
          Critical error
        </p>
        <h1
          style={{
            fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
            fontWeight: 700,
            letterSpacing: '-0.01em',
            lineHeight: 1.2,
            marginBottom: '16px',
            color: '#0B0E11',
          }}
        >
          Something went seriously wrong
        </h1>
        <p
          style={{
            color: '#6B7280',
            maxWidth: '48ch',
            marginBottom: '40px',
            lineHeight: '1.7',
            fontSize: '1.125rem',
          }}
        >
          The page failed to load entirely. Try refreshing or return to the homepage.
        </p>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={reset}
            style={{
              padding: '14px 32px',
              background: '#FF3D00',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          <a
            href="/"
            style={{
              display: 'inline-block',
              padding: '14px 32px',
              background: 'transparent',
              color: '#4DB8A8',
              border: '2px solid #4DB8A8',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '1rem',
              textDecoration: 'none',
            }}
          >
            Back to homepage
          </a>
        </div>
      </body>
    </html>
  );
}
