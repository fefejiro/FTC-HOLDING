import type { Metadata } from "next";
import Link from "next/link";
import { getStatsLedger, OG_TRADES_STATS_SOURCE } from "../../../lib/statsLedger";

type SearchParams = Record<string, string | string[] | undefined>;

type Props = {
  searchParams?: SearchParams;
};

export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "OG Trades Stats Bot Admin",
  description: "Admin event ledger and analytics for OG Trades stats bot"
};

function readSearchParam(searchParams: SearchParams | undefined, key: string): string {
  const value = searchParams?.[key];
  if (Array.isArray(value)) {
    return value[0] || "";
  }
  return value || "";
}

function toSparkline(points: Array<{ day: string; count: number }>): string {
  if (points.length === 0) {
    return "";
  }

  const maxCount = Math.max(...points.map((point) => point.count), 1);
  const width = 320;
  const height = 72;

  return points
    .map((point, index) => {
      const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
      const y = height - (point.count / maxCount) * height;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export default async function OgTradesStatsBotPage({ searchParams }: Props) {
  const source = readSearchParam(searchParams, "source") || OG_TRADES_STATS_SOURCE;
  const eventType = readSearchParam(searchParams, "eventType");
  const from = readSearchParam(searchParams, "from");
  const to = readSearchParam(searchParams, "to");
  const limit = Number(readSearchParam(searchParams, "limit") || 100);
  const boundedLimit = Number.isFinite(limit) ? Math.max(1, Math.min(500, Math.floor(limit))) : 100;

  const ledger = getStatsLedger();
  const ledgerUnavailable = !ledger;

  const events = ledger
    ? await ledger.query({ source, eventType: eventType || undefined, from: from || undefined, to: to || undefined, limit: boundedLimit })
    : [];

  const aggregate = ledger
    ? await ledger.aggregate({ source, eventType: eventType || undefined, from: from || undefined, to: to || undefined })
    : { total: 0, byEventType: [], sparkline: [] };

  const sparklinePoints = toSparkline(aggregate.sparkline);
  const exportHref = `/api/og-trades-stats-bot/export?source=${encodeURIComponent(source)}&eventType=${encodeURIComponent(eventType)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=${boundedLimit}`;

  return (
    <div className="og-site-shell">
      <div className="container page-content og-page-content">
        <section className="section og-section stats-admin-shell">
          <div className="stats-admin-header">
            <div>
              <p className="eyebrow">Admin</p>
              <h1>OG Trades Stats Bot</h1>
              <p className="page-intro">Append-only ledger view for filtered event tracking, trend sparkline, and CSV export.</p>
            </div>
            <div className="hero-cta-row">
              <a className="btn btn-secondary" href={exportHref}>
                Export CSV
              </a>
              <Link className="btn btn-primary" href="/og-trades-academy" prefetch={false}>
                Back to OG Trades
              </Link>
            </div>
          </div>

          {ledgerUnavailable ? (
            <article className="card stats-admin-warning">
              <h2>Stats ledger unavailable</h2>
              <p className="muted">Set STATS_LEDGER_DATABASE_URL (or DATABASE_URL) to enable the Postgres-backed event ledger.</p>
            </article>
          ) : null}

          <article className="card stats-admin-filters">
            <form method="GET" className="stats-admin-grid">
              <label>
                <span>Source</span>
                <input type="text" name="source" defaultValue={source} />
              </label>
              <label>
                <span>Event type</span>
                <input type="text" name="eventType" defaultValue={eventType} placeholder="lead_submitted" />
              </label>
              <label>
                <span>From</span>
                <input type="date" name="from" defaultValue={from.slice(0, 10)} />
              </label>
              <label>
                <span>To</span>
                <input type="date" name="to" defaultValue={to.slice(0, 10)} />
              </label>
              <label>
                <span>Limit</span>
                <input type="number" name="limit" defaultValue={boundedLimit} min={1} max={500} />
              </label>
              <button type="submit" className="btn btn-primary">Apply filters</button>
            </form>
          </article>

          <div className="stats-admin-metrics">
            <article className="card">
              <p className="card-kicker">Total events</p>
              <h2>{aggregate.total}</h2>
            </article>
            <article className="card stats-admin-chart-card">
              <p className="card-kicker">Daily sparkline</p>
              {sparklinePoints ? (
                <svg viewBox="0 0 320 72" role="img" aria-label="Daily events sparkline" className="stats-admin-sparkline">
                  <polyline points={sparklinePoints} />
                </svg>
              ) : (
                <p className="muted">No events in this range yet.</p>
              )}
            </article>
            <article className="card">
              <p className="card-kicker">Top event types</p>
              <ul className="stats-admin-type-list">
                {aggregate.byEventType.slice(0, 5).map((item) => (
                  <li key={item.eventType}>
                    <span>{item.eventType}</span>
                    <strong>{item.count}</strong>
                  </li>
                ))}
                {aggregate.byEventType.length === 0 ? <li>No event buckets yet.</li> : null}
              </ul>
            </article>
          </div>

          <article className="card stats-admin-table-wrap">
            <div className="stats-admin-table-header">
              <h2>Recent events</h2>
            </div>
            <div className="stats-admin-table-scroll">
              <table className="stats-admin-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Type</th>
                    <th>Source</th>
                    <th>Value</th>
                    <th>Idempotency key</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id}>
                      <td>{new Date(event.occurredAt).toLocaleString()}</td>
                      <td>{event.eventType}</td>
                      <td>{event.source}</td>
                      <td>{event.value ?? "—"}</td>
                      <td>{event.idempotencyKey}</td>
                    </tr>
                  ))}
                  {events.length === 0 ? (
                    <tr>
                      <td colSpan={5}>No events match this filter.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
