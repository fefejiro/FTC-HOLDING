export const dynamic = "force-static";

import WorkIntakeForm from "../components/WorkIntakeForm";
import { engagementOffers } from "../../lib/engagementOffers";

export const metadata = {
  title: "Start a Project | Una Labs",
  description:
    "Send a project request to Una Labs for trusted workflow systems, lead operations, and decision-ready delivery direction."
};

type WorkWithFtcPageProps = {
  searchParams?: {
    from?: string | string[];
    offer?: string | string[];
  };
};

function readSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? String(value[0] || "") : String(value || "");
}

export default function WorkWithFtcPage({ searchParams }: WorkWithFtcPageProps) {
  const isAteamHandoff = readSingleParam(searchParams?.from).trim().toLowerCase() === "ateam";
  const selectedOffer = readSingleParam(searchParams?.offer).trim().toLowerCase();
  const normalizedOffer = engagementOffers.some((offer) => offer.value === selectedOffer)
    ? selectedOffer
    : "not-sure-yet";

  return (
    <div className="container page-content work-intake-page">
      <section className="work-intake-hero">
        <p className="eyebrow">{isAteamHandoff ? "ATEAM handoff" : "Start a Project"}</p>
        <h1>{isAteamHandoff ? "ATEAM already shaped the first pass." : "Turn the idea into a scoped next step."}</h1>
        <p className="page-intro">
          {isAteamHandoff
            ? "You do not need to rewrite the idea. ATEAM already attached the intent, the visible work, and the first output pack. Add the missing business context and Una Labs can respond with the next commercial move."
            : "This request is for teams that need a clear path, not a vague consultation. Una Labs uses it to decide whether the right next move is a scoped first pass, prototype direction sprint, or build execution track."}
        </p>
      </section>

      <section className="work-intake-offer-strip" aria-label="How Una Labs starts engagements">
        <div className="section-heading home-section-heading">
          <p className="eyebrow">How engagements start</p>
          <h2>{isAteamHandoff ? "ATEAM already handled the rough first pass." : "Choose the commercial path that fits the problem."}</h2>
          <p>
            {isAteamHandoff
              ? "The handoff below already carries the brief. Use this request to add readiness, urgency, and the business outcome that matters most."
              : "The goal is to shorten time-to-decision. We are looking for the smallest credible next move, not a long discovery cycle."}
          </p>
        </div>
        <div className="cards-grid cards-grid-3 work-intake-proof-grid">
          {engagementOffers.map((offer) => (
            <article
              key={offer.title}
              className={`card work-intake-proof-card ${
                normalizedOffer === offer.value ? "work-intake-proof-card--selected" : ""
              }`}
            >
              <p className="status-pill">{offer.title}</p>
              <p>{offer.summary}</p>
              <p className="work-intake-offer-price">{offer.price}</p>
              <p className="muted">{offer.meta}</p>
            </article>
          ))}
        </div>
        <p className="work-intake-offer-note">
          Starting ranges are for focused entry scopes. Final pricing depends on complexity,
          integrations, and delivery depth.
        </p>
      </section>

      <section className="work-intake-guidance-grid" aria-label="Who this path is built for">
        <article className="card work-intake-guidance-card">
          <p className="eyebrow">Best for</p>
          <h2>Teams that need a clear next move quickly</h2>
          <ul className="client-launch-signal-list">
            <li>Local service businesses needing a lead path, offer clarity, or a cleaner customer flow.</li>
            <li>Founders who need a believable first version before build expands.</li>
            <li>Operators who need a workflow, internal tool, or execution path made concrete.</li>
          </ul>
        </article>
        <article className="card work-intake-guidance-card">
          <p className="eyebrow">Not ideal for</p>
          <h2>Broad discovery without an owner</h2>
          <ul className="client-launch-signal-list">
            <li>Long procurement cycles that need a full RFP process first.</li>
            <li>Projects with no urgency, owner, or decision-maker attached.</li>
            <li>Teams looking for vague brainstorming without a real next move.</li>
          </ul>
        </article>
      </section>

      <section className="intake-card work-intake-shell">
        <div className="work-intake-shell-head">
          <div>
            <p className="card-kicker">{isAteamHandoff ? "Continue from ATEAM" : "Project request"}</p>
            <h2>{isAteamHandoff ? "Send the ATEAM handoff" : "Send the setup request"}</h2>
          </div>
          <p className="muted">
            {isAteamHandoff
              ? "The attached ATEAM brief will carry through automatically. Use this to confirm fit, urgency, and the best next offer."
              : "This is not a generic contact form. It is how Una Labs decides the fastest credible path into a real scoped engagement."}
          </p>
        </div>
        <WorkIntakeForm initialEngagementType={normalizedOffer} />
      </section>
    </div>
  );
}

