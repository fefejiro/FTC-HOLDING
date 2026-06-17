import { createAnionIconSvgResponse } from '../lib/iconSvg';

export const dynamic = 'force-static';

export function GET() {
  return createAnionIconSvgResponse(192);
}
