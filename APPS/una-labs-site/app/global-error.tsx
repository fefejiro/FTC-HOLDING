'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Inter, system-ui, sans-serif',
            backgroundColor: '#F5F7FA',
            padding: '24px',
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: '480px' }}>
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
              Una Labs
            </p>
            <h1
              style={{
                fontSize: '32px',
                fontWeight: 700,
                color: '#0B0E11',
                marginBottom: '16px',
              }}
            >
              Something went wrong
            </h1>
            <p
              style={{
                fontSize: '18px',
                color: '#6B7280',
                marginBottom: '32px',
                lineHeight: 1.6,
              }}
            >
              A critical error occurred. Please reload the page to continue.
            </p>
            <button
              onClick={reset}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px 32px',
                fontSize: '18px',
                fontWeight: 600,
                backgroundColor: '#FF3D00',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              Reload page
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
