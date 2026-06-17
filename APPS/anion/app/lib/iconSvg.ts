export function createAnionIconSvg(size: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="Anion"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#0f766e"/><stop offset="1" stop-color="#1d4ed8"/></linearGradient></defs><rect width="${size}" height="${size}" rx="${Math.round(size * 0.18)}" fill="url(#g)"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(size * 0.5)}" font-weight="800" fill="#fff">A</text></svg>`;
}

export function createAnionIconSvgResponse(size: number) {
  return new Response(createAnionIconSvg(size), {
    headers: {
      'cache-control': 'public, max-age=31536000, immutable',
      'content-type': 'image/svg+xml; charset=utf-8',
    },
  });
}
