// Instagram Graph API (Reels) stub.
// Live mode requires IG_ACCESS_TOKEN + IG_USER_ID (Business/Creator account linked to FB Page).
// Real flow: POST /{ig-user-id}/media (media_type=REELS, video_url) -> POST /{ig-user-id}/media_publish.
export async function instagramPublish({ text, media, dryRun }) {
  if (dryRun) return { status: 'dry-run', would: { caption: text.slice(0, 200), media } };
  const token = process.env.IG_ACCESS_TOKEN;
  const userId = process.env.IG_USER_ID;
  if (!token || !userId) return { status: 'skipped (no IG_ACCESS_TOKEN/IG_USER_ID)' };
  throw new Error('instagram live-publish not yet implemented (token present but adapter is gated)');
}
