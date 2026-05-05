'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <head>
        <style>{`
          .gle-btn-primary:hover { background-color: #E63500 !important; }
          .gle-btn-primary:focus-visible { outline: 2px solid #4DB8A8; outline-offset: 2px; }
          .gle-btn-secondary:hover { background-color: #E6F7F5 !important; }
          .gle-btn-secondary:focus-visible { outline: 2px solid #4DB8A8; outline-offset: 2px; }
        `}</style>
      </head>
      <body style={{ margin: 0, fontFamily: 'Inter, system-ui, sans-serif', backgroundColor: '#FFFFFF' }}>
        <div
          style={{
            minHeight: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '96px 24px',
            textAlign: 'center',
          }}
        >
          <div style={{ maxWidth: '540px' }}>
            <p
              style={{
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#4DB8A8',
                marginBottom: '16px',
              }}
            >
              Critical error
            </p>
            <h1
              style={{
                fontSize: '40px',
                fontWeight: 700,
                lineHeight: 1.2,
                letterSpacing: '-0.01em',
                color: '#0B0E11',
                marginBottom: '16px',
              }}
            >
              The app encountered a fatal error
            </h1>
            <p
              style={{
                fontSize: '18px',
                lineHeight: 1.7,
                color: '#6B7280',
                marginBottom: '40px',
              }}
            >
              Something critical failed and we could not recover automatically. Please try reloading the page.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px' }}>
              <button
                onClick={reset}
                className="gle-btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px 32px',
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  backgroundColor: '#FF3D00',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                Reload app
              </button>
              <Link
                href="/"
                className="gle-btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px 32px',
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#4DB8A8',
                  backgroundColor: 'transparent',
                  border: '2px solid #4DB8A8',
                  borderRadius: '8px',
                  textDecoration: 'none',
                }}
              >
                Back to homepage
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
