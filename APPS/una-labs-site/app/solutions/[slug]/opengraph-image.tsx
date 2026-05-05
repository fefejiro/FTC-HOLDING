import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

type Params = {
  slug: string;
};

function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default async function OpenGraphImage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const label = slugToTitle(slug);

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
          background: 'linear-gradient(135deg, #0D1117 0%, #0c2a2a 60%, #0EA5A0 100%)',
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
            color: '#0EA5A0',
          }}
        >
          Una Labs
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: 880 }}>
          <div style={{ display: 'flex', fontSize: 72, fontWeight: 800, lineHeight: 1.05 }}>
            {label}
          </div>
          <div style={{ display: 'flex', fontSize: 36, fontWeight: 400, opacity: 0.8 }}>
            AI-governed delivery surfaces for founders.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
