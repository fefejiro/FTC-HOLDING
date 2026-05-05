import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Polar Anchor — Freight Forwarding and Logistics Services in Canada';
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
          background: 'linear-gradient(135deg, rgb(5, 20, 40) 0%, rgb(10, 55, 120) 55%, rgb(0, 100, 160) 100%)',
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
          Polar Anchor
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: 880 }}>
          <div style={{ display: 'flex', fontSize: 68, fontWeight: 800, lineHeight: 1.05 }}>
          Freight Forwarding & Logistics
          </div>
          <div style={{ display: 'flex', fontSize: 36, fontWeight: 400, opacity: 0.8 }}>
            Just in time connections across Canada.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
