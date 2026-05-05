// TikTok Content Posting API stub.
// Live mode requires TIKTOK_ACCESS_TOKEN with video.publish scope.
// Real flow: 1) /v2/post/publish/inbox/video/init/  2) PUT chunked upload  3) poll status.
// This stub returns a deterministic dry-run shape and only attempts a real call when
// a token is present AND dryRun=false.
export async function tiktokPublish({ text, media, dryRun }) {
  if (dryRun) return { status: 'dry-run', would: { caption: text.slice(0, 200), media } };
  const token = process.env.TIKTOK_ACCESS_TOKEN;
  if (!token) return { status: 'skipped (no TIKTOK_ACCESS_TOKEN)' };
  if (!media) throw new Error('media path required');
  // Real implementation deferred until token is provisioned.
  // Keep this branch unimplemented rather than partially-implemented to avoid silent failures.
  throw new Error('tiktok live-publish not yet implemented (token present but adapter is gated)');
}
