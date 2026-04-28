// X (Twitter) v2 stub.
// Live mode requires X_BEARER_TOKEN with write scope.
// For tweets without media, POST /2/tweets is one call. With media, /1.1/media/upload first.
export async function xPublish({ text, media, dryRun }) {
  if (dryRun) return { status: 'dry-run', would: { text: text.slice(0, 280), media } };
  const token = process.env.X_BEARER_TOKEN;
  if (!token) return { status: 'skipped (no X_BEARER_TOKEN)' };
  // Text-only path is safe enough to ship later; gating until token + scope confirmed.
  throw new Error('x live-publish not yet implemented (token present but adapter is gated)');
}
