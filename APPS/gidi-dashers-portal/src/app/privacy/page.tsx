import Link from 'next/link';

export const dynamic = 'force-static';

export default function PrivacyPage() {
  return (
    <div className="container">
      <section className="hero" style={{ paddingTop: 40, paddingBottom: 24, textAlign: 'left' }}>
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)' }}>Privacy Policy</h1>
        <p style={{ color: '#9ca3af' }}>Last updated: 2026-05-04</p>
      </section>

      <section className="section" style={{ lineHeight: 1.7 }}>
        <h2>What we collect</h2>
        <p>
          When you submit a score, Gidi Dashers stores: a randomly generated device ID
          (created on your device, not linked to your account or identity), a player
          name you choose, your score, in-game naira earned, your selected character,
          and the duration of the run.
        </p>
        <p>We do not collect: real names, email, phone numbers, location, contacts, or any
          third-party identifiers. The game requires no account.</p>

        <h2>How we use it</h2>
        <p>Scores are shown on the public leaderboard. That's it. We do not sell, share,
          or otherwise process this data for any other purpose.</p>

        <h2>Storage</h2>
        <p>Score data is stored in Supabase (a hosted PostgreSQL service) on infrastructure
          located in the European Union or United States, depending on the project region.
          Data is retained until you ask us to remove it.</p>

        <h2>Children</h2>
        <p>Gidi Dashers does not knowingly collect personal information from children under
          13. The device ID is non-identifying.</p>

        <h2>Your rights</h2>
        <p>To request deletion of any score tied to your device ID, email
          <a href="mailto:hello@unalabs.cloud"> hello@unalabs.cloud</a> with the device ID
          (visible in the in-game settings screen, planned for v0.2).</p>

        <h2>Third parties</h2>
        <p>The Android app is distributed via Google Play and the web build is hosted on
          Cloudflare Pages. Both providers process standard request logs (IP, user agent)
          per their own policies. We do not use advertising SDKs or analytics SDKs in v0.1.</p>

        <h2>Changes</h2>
        <p>If this policy changes, we will update the date above. Continued use after a
          change means you accept the updated policy.</p>
      </section>

      <footer>
        <Link href="/">← Back to Gidi Dashers</Link>
      </footer>
    </div>
  );
}
