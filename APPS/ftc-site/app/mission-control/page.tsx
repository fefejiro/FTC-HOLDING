import type { Metadata } from "next";
import Link from "next/link";
import missionControlData from "@/data/mission-control.json";

type FollowUpItem = {
  title: string;
  due: string;
  context?: string;
};

const data = missionControlData;
const {
  today,
  weekPriorities,
  jobLane,
  clientLane,
  blockers,
  routines,
  calendar,
  deadlines,
  followUps,
  metrics,
  commandPills
} = data;

const parseDate = (value: string) => new Date(`${value}T00:00:00`);
const formatShortDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });

const todayStart = new Date();
todayStart.setHours(0, 0, 0, 0);

const sortedFollowUps: FollowUpItem[] = [...followUps].sort((a, b) => {
  return parseDate(a.due).getTime() - parseDate(b.due).getTime();
});

const cadenceMap = new Map(calendar.weeklyCadence.map((slot) => [slot.day, slot]));
const nextSevenDays = Array.from({ length: 7 }, (_, index) => {
  const date = new Date();
  date.setDate(date.getDate() + index);
  const dayKey = date.toLocaleDateString("en-US", { weekday: "short" });
  const cadence = cadenceMap.get(dayKey);
  return {
    day: dayKey,
    dateLabel: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    focus: cadence?.focus ?? "Reset and plan ahead",
    tag: cadence?.tag ?? "Reset"
  };
});

export const metadata: Metadata = {
  title: "Mission Control | Una Labs",
  description:
    "Visible mission control for current priorities, calendar blocks, weekly rhythm, job lane, client lane, and follow-ups.",
  alternates: {
    canonical: "https://unalabs.cloud/mission-control"
  }
};

type MissionControlPageProps = {
  searchParams?: { key?: string };
};

export default function MissionControlPage({ searchParams }: MissionControlPageProps) {
  const accessKey = process.env.MISSION_CONTROL_ACCESS_KEY;
  const hasAccess = !accessKey || searchParams?.key === accessKey;

  if (!hasAccess) {
    return (
      <div className="container page-content mission-control-page">
        <section className="hero mission-control-hero">
          <div className="hero-noise" aria-hidden="true" />
          <div className="card mission-control-summary-card">
            <p className="status-pill">LOCKED</p>
            <h2>Mission Control is private</h2>
            <p className="hero-description">
              Add your access key as a query parameter to view this page.
            </p>
            <code className="mission-control-code">/mission-control?key=YOUR_KEY</code>
            <p className="hero-description">
              Set <strong>MISSION_CONTROL_ACCESS_KEY</strong> in your deployment environment to
              enable this lock.
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="container page-content mission-control-page">
      <section className="hero mission-control-hero">
        <div className="hero-noise" aria-hidden="true" />
        <div className="mission-control-hero-grid">
          <div className="hero-copy mission-control-copy">
            <p className="eyebrow">Mission Control</p>
            <h1>Visible execution, not buried intentions.</h1>
            <p className="lead hero-subtitle">
              This is the operating surface for today, this week, job momentum, follow-ups,
              deadlines, and recurring routines.
            </p>
            <p className="hero-description">
              Use this page with Telegram as the command surface and the docs as the source of
              truth. The goal is simple: keep execution visible and reduce mental tabs.
            </p>
            <div className="hero-actions">
              <Link href="/lead-response-system" className="btn btn-secondary">
                Revenue lane
              </Link>
              <Link href="/connect" className="btn btn-primary">
                Keep moving
              </Link>
            </div>
          </div>

          <div className="card mission-control-summary-card">
            <p className="status-pill">CURRENT STATE</p>
            <h2>What is active now</h2>
            <ul className="feature-list compact-feature-list mission-control-list">
              <li>Cluster A job search is the primary active lane</li>
              <li>Cluster A Resume v2 exists and is ready for tailoring</li>
              <li>Una Labs is now a credibility layer, not the main task</li>
              <li>Calendar blocks keep daily and weekly rhythm visible</li>
            </ul>
            <div className="mission-control-command-pills">
              {commandPills.map((pill) => (
                <span key={pill} className="mission-pill">
                  {pill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-heading home-section-heading">
          <p className="eyebrow">Snapshot</p>
          <h2>Weekly metrics</h2>
          <p>Small numbers keep the week honest and directional.</p>
        </div>
        <div className="mission-control-grid mission-control-grid-4 mission-control-metrics-grid">
          {metrics.map((metric) => (
            <article key={metric.label} className="card mission-control-panel metric-card">
              <p className="metric-label">{metric.label}</p>
              <div className="metric-value">{metric.value}</div>
              <p className="metric-note">{metric.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-heading home-section-heading">
          <p className="eyebrow">Today</p>
          <h2>Current operating view</h2>
          <p>
            If it is not visible here, it is probably not a real priority today.
          </p>
        </div>
        <div className="mission-control-grid mission-control-grid-3">
          {today.map((group) => (
            <article key={group.title} className="card mission-control-panel">
              <h3>{group.title}</h3>
              <ul className="feature-list compact-feature-list mission-control-list">
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="mission-control-grid mission-control-grid-2">
          <article className="card mission-control-panel mission-control-panel-strong">
            <p className="eyebrow">This Week</p>
            <h2>Top priorities</h2>
            <ul className="feature-list compact-feature-list mission-control-list">
              {weekPriorities.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="card mission-control-panel">
            <p className="eyebrow">Blockers</p>
            <h2>Keep these visible</h2>
            <ul className="feature-list compact-feature-list mission-control-list">
              {blockers.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="section-heading home-section-heading">
          <p className="eyebrow">Calendar</p>
          <h2>Internal cadence</h2>
          <p>
            Visible blocks keep the week grounded, even when the inbox gets loud.
          </p>
        </div>
        <div className="mission-control-grid mission-control-grid-2 mission-control-calendar-grid">
          <article className="card mission-control-panel mission-control-calendar-card">
            <h3>Daily blocks</h3>
            <div className="mission-control-calendar-blocks">
              {calendar.dailyBlocks.map((block) => (
                <div key={block.title} className={`calendar-block calendar-block-${block.tone}`}>
                  <div className="calendar-block-header">
                    <span className="calendar-block-title">{block.title}</span>
                    <span className="calendar-block-time">{block.time}</span>
                  </div>
                  <p className="calendar-block-description">{block.description}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="card mission-control-panel mission-control-calendar-card">
            <h3>Weekly rhythm</h3>
            <div className="mission-control-week-grid">
              {calendar.weeklyCadence.map((slot) => (
                <div key={slot.day} className="week-day">
                  <div className="week-day-header">
                    <span className="week-day-label">{slot.day}</span>
                    <span className="week-day-tag">{slot.tag}</span>
                  </div>
                  <p>{slot.focus}</p>
                </div>
              ))}
            </div>
          </article>
        </div>

        <div className="mission-control-week-strip">
          {nextSevenDays.map((day) => (
            <div key={`${day.day}-${day.dateLabel}`} className="week-strip-card">
              <div className="week-strip-header">
                <span className="week-strip-day">{day.day}</span>
                <span className="week-strip-date">{day.dateLabel}</span>
              </div>
              <span className="week-strip-tag">{day.tag}</span>
              <p>{day.focus}</p>
            </div>
          ))}
        </div>

        <article className="card mission-control-panel mission-control-deadlines">
          <p className="eyebrow">Deadlines</p>
          <h3>Time pressure</h3>
          <ul className="feature-list compact-feature-list mission-control-list">
            {deadlines.map((item) => (
              <li key={item.label}>
                <span className="deadline-label">{item.label}</span>
                <span className="deadline-date">{formatShortDate(item.date)}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="section">
        <div className="section-heading home-section-heading">
          <p className="eyebrow">Follow-ups</p>
          <h2>Dates keep momentum honest</h2>
          <p>Anything without a date isn’t really scheduled yet.</p>
        </div>
        <div className="mission-control-followups">
          {sortedFollowUps.map((followUp) => {
            const dueDate = parseDate(followUp.due);
            const isOverdue = dueDate < todayStart;
            const isToday = dueDate.getTime() === todayStart.getTime();
            const status = isToday ? "Today" : isOverdue ? "Overdue" : "Upcoming";
            return (
              <article
                key={`${followUp.title}-${followUp.due}`}
                className={`card mission-control-panel followup-item ${isOverdue ? "followup-overdue" : ""}`}
              >
                <div className="followup-header">
                  <div>
                    <h3>{followUp.title}</h3>
                    {followUp.context ? <p className="followup-context">{followUp.context}</p> : null}
                  </div>
                  <div className="followup-meta">
                    <span className="followup-date">{formatShortDate(followUp.due)}</span>
                    <span className="followup-status">{status}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="section">
        <div className="section-heading home-section-heading">
          <p className="eyebrow">Job Lane</p>
          <h2>Primary search titles</h2>
          <p>
            Search and tailoring should stay anchored to the strongest interview path first.
          </p>
        </div>
        <div className="mission-control-grid mission-control-grid-2">
          <article className="card mission-control-panel">
            <h3>Primary Cluster A titles</h3>
            <ul className="feature-list compact-feature-list mission-control-list">
              {jobLane.primary.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          <article className="card mission-control-panel">
            <h3>Stretch titles</h3>
            <ul className="feature-list compact-feature-list mission-control-list">
              {jobLane.stretch.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="section-heading home-section-heading">
          <p className="eyebrow">Client Lane</p>
          <h2>Keep the offer alive without making it the whole week</h2>
        </div>
        <article className="card mission-control-panel">
          <ul className="feature-list compact-feature-list mission-control-list">
            {clientLane.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="section">
        <div className="section-heading home-section-heading">
          <p className="eyebrow">Routines</p>
          <h2>Use rhythm to reduce decision fatigue</h2>
        </div>
        <div className="mission-control-grid mission-control-grid-2">
          <article className="card mission-control-panel">
            <h3>Daily</h3>
            <ul className="feature-list compact-feature-list mission-control-list">
              {routines.daily.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          <article className="card mission-control-panel">
            <h3>Weekly</h3>
            <ul className="feature-list compact-feature-list mission-control-list">
              {routines.weekly.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>
    </div>
  );
}
