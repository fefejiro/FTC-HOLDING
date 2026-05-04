import Link from 'next/link';

const GAME_URL = process.env.NEXT_PUBLIC_GAME_URL || 'https://gidi-dashers.pages.dev';

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <h1>
          GIDI <span className="y">DASHERS</span>
        </h1>
        <p>Run Gidi. Dodge wahala. Stack naira.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a className="cta" href={GAME_URL}>Play in browser</a>
          <Link className="cta ghost" href="/leaderboard/">Leaderboard</Link>
        </div>
      </section>

      <div className="container">
        <section className="section">
          <h2>The crew</h2>
          <div className="grid">
            <div className="card">
              <h3>Tunde the Hustler</h3>
              <p>Free starter. Lagos boy. Always hungry, never late.</p>
            </div>
            <div className="card">
              <h3>Amaka the Trader</h3>
              <p>Unlock at ₦5,000. Knows every shortcut in Balogun.</p>
            </div>
            <div className="card">
              <h3>Baba Wahala</h3>
              <p>Unlock at ₦50,000. The original area boss.</p>
            </div>
          </div>
        </section>

        <section className="section">
          <h2>Dodge or die</h2>
          <div className="grid">
            <div className="card"><h3>Molue</h3><p>Big yellow bus. Don't argue.</p></div>
            <div className="card"><h3>Danfo</h3><p>Small yellow bus. Faster, sneakier.</p></div>
            <div className="card"><h3>Okada</h3><p>Weaves through lanes. Be sharp.</p></div>
            <div className="card"><h3>Pothole</h3><p>Jump or eat dirt.</p></div>
            <div className="card"><h3>LASTMA</h3><p>Roadblock. No vex, just pass.</p></div>
          </div>
        </section>

        <section className="section">
          <h2>Power-ups</h2>
          <div className="grid">
            <div className="card"><h3>Agbero Shield</h3><p>One free hit. No questions asked.</p></div>
            <div className="card"><h3>Suya Magnet</h3><p>Pulls naira to you for 8 seconds.</p></div>
            <div className="card"><h3>Fuel Boost</h3><p>1.6x speed for 5 seconds.</p></div>
            <div className="card"><h3>Keke Jetpack</h3><p>Fly over wahala for 10 seconds.</p></div>
          </div>
        </section>
      </div>

      <footer>
        FTC Holding · v0.1.0 · <Link href="/leaderboard/">Leaderboard</Link>
      </footer>
    </>
  );
}
