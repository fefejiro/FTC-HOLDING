// LinkedIn UGC API stub.
// Live mode requires LINKEDIN_ACCESS_TOKEN (w_member_social) + LINKEDIN_AUTHOR_URN (e.g. urn:li:person:xxx or urn:li:organization:xxx).
// Real flow: POST /v2/ugcPosts with shareContent (or /v2/assets for video).
export async function linkedinPublish({ text, media, dryRun }) {
  if (dryRun) return { status: 'dry-run', would: { commentary: text.slice(0, 1000), media } };
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  const author = process.env.LINKEDIN_AUTHOR_URN;
  if (!token || !author) return { status: 'skipped (no LINKEDIN_ACCESS_TOKEN/LINKEDIN_AUTHOR_URN)' };
  throw new Error('linkedin live-publish not yet implemented (token present but adapter is gated)');
}
