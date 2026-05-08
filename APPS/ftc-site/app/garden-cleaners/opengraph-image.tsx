import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Garden Cleaners, Professional Cleaning Services in Oshawa, Ontario';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px',
          background: 'linear-gradient(135deg, rgb(10, 40, 10) 0%, rgb(20, 90, 30) 55%, rgb(50, 160, 60) 100%)',
          color: 'white',
          fontFamily: 'system-ui',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            opacity: 0.85,
          }}
        >
          Garden Cleaners
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: 880 }}>
          <div style={{ display: 'flex', fontSize: 68, fontWeight: 800, lineHeight: 1.05 }}>
            Professional Cleaning Services
          </div>
          <div style={{ display: 'flex', fontSize: 36, fontWeight: 400, opacity: 0.8 }}>
            Residential and commercial cleaning in Oshawa, Ontario.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
