import Link from 'next/link';
import { fetchTopScores } from '@/lib/supabase';

export const dynamic = 'force-static';

const NAIRA_FORMAT = new Intl.NumberFormat('en-NG');

function shortName(name: string) {
  if (!name) return 'Anon';
  return name.length > 18 ? name.slice(0, 17) + '…' : name;
}

export default async function LeaderboardPage() {
  const scores = await fetchTopScores(100);

  return (
    <div className="container">
      <section className="hero" style={{ paddingTop: 40, paddingBottom: 24 }}>
        <h1 style={{ fontSize: 'clamp(36px, 6vw, 56px)' }}>
          <span className="y">TOP 100</span> RUNNERS
        </h1>
        <p>Best of all time. Submit your score by playing the game.</p>
      </section>

      {scores.length === 0 ? (
        <div className="empty">
          <p>No scores yet, or backend not configured.</p>
          <Link className="cta" href="/">← Back home</Link>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Crew</th>
              <th style={{ textAlign: 'right' }}>Score</th>
              <th style={{ textAlign: 'right' }}>Naira</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((s, i) => (
              <tr key={s.id}>
                <td className="rank">{i + 1}</td>
                <td>{shortName(s.player_name)}</td>
                <td style={{ textTransform: 'capitalize', color: '#9ca3af' }}>{s.character}</td>
                <td className="score" style={{ textAlign: 'right' }}>{NAIRA_FORMAT.format(s.score)}</td>
                <td className="naira" style={{ textAlign: 'right' }}>₦{NAIRA_FORMAT.format(s.naira)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <footer>
        <Link href="/">← Back to Gidi Dashers</Link>
      </footer>
    </div>
  );
}
