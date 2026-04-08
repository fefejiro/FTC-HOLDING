export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "edge";

import type { Metadata } from "next";
import AteamLandingExperience from "../components/AteamLandingExperience";

export const metadata: Metadata = {
  title: "ATEAM | Una Labs",
  description:
    "Use ATEAM to turn a rough request into a structured plan, human approval point, and decision-ready output with visible workflow state.",
  alternates: {
    canonical: "/ateam"
  }
};

export default function AteamPage() {
  const routeScopedStyles = `
        .ateam-route-surface .wf-shell .container,
        .ateam-route-surface .wf-bar,
        .ateam-route-surface .wf-body,
        .ateam-route-surface .wf-secondary-band .container {
          width: min(1540px, calc(100vw - clamp(32px, 4vw, 88px)));
          max-width: none;
          margin-left: auto;
          margin-right: auto;
        }

        .ateam-route-surface .wf-body {
          max-width: none;
        }

        .ateam-route-surface .wf-split {
          display: block !important;
          grid-template-columns: 1fr !important;
          gap: 0 !important;
        }

        .ateam-route-surface .wf-intake-col,
        .ateam-route-surface .wf-intake-col > .container {
          display: block;
          width: 100%;
          min-height: 0;
        }

        .ateam-route-surface .wf-stage--intake {
          grid-template-columns: minmax(0, 0.84fr) minmax(680px, 1.16fr);
          grid-template-areas:
            "intro intake"
            "proof intake"
            "templates templates"
            "expect expect"
            "recent recent";
          gap: clamp(20px, 2vw, 30px);
          align-items: start;
        }

        .ateam-route-surface .wf-intro {
          padding-top: 6px;
        }

        .ateam-route-surface .wf-intro-headline {
          max-width: 9.2ch;
          font-size: clamp(2.5rem, 4.1vw, 4.6rem);
          line-height: 0.96;
        }

        .ateam-route-surface .wf-intro-lead {
          max-width: 58ch;
          font-size: 1rem;
        }

        .ateam-route-surface .wf-proof-strip,
        .ateam-route-surface .wf-expect-row {
          max-width: none;
          gap: 14px;
        }

        .ateam-route-surface .wf-proof-strip {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .ateam-route-surface .wf-proof-step,
        .ateam-route-surface .wf-expect-item {
          min-height: 100%;
        }

        .ateam-route-surface .wf-intake-card,
        .ateam-route-surface .wf-template-card,
        .ateam-route-surface .wf-recent-card,
        .ateam-route-surface .wf-role-card,
        .ateam-route-surface .wf-fit-card {
          width: 100%;
          max-width: none;
          padding: clamp(18px, 1.8vw, 24px);
        }

        .ateam-route-surface .wf-guided-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px 14px;
        }

        .ateam-route-surface .wf-guided-field--wide,
        .ateam-route-surface .wf-guided-field--full {
          grid-column: 1 / -1;
        }

        .ateam-route-surface .wf-guided-input,
        .ateam-route-surface .wf-question-textarea,
        .ateam-route-surface .wf-idea-textarea {
          font-size: 0.95rem;
        }

        .ateam-route-surface .wf-guided-input::placeholder,
        .ateam-route-surface .wf-question-textarea::placeholder,
        .ateam-route-surface .wf-idea-textarea::placeholder {
          font-size: 0.93rem;
          line-height: 1.45;
          text-overflow: clip;
        }

        .ateam-route-surface .wf-intake-label-row {
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
        }

        .ateam-route-surface .wf-field-help--voice {
          max-width: 52ch;
        }

        .ateam-route-surface .wf-voice-btn {
          min-width: 224px;
          min-height: 56px;
        }

        .ateam-route-surface .wf-fallback-banner {
          margin-bottom: 12px;
        }

        .ateam-route-surface .wf-local-note,
        .ateam-route-surface .wf-placeholder-strip,
        .ateam-route-surface .wf-office-support {
          display: none !important;
        }

        .ateam-route-surface .wf-secondary-band {
          padding: 24px 0 40px;
        }

        .ateam-route-surface .wf-secondary-grid {
          grid-template-columns: minmax(300px, 0.78fr) minmax(0, 1.22fr);
          gap: 18px;
          align-items: stretch;
        }

        .ateam-route-surface .wf-fit-card {
          display: grid;
          gap: 14px;
          align-content: start;
          height: 100%;
        }

        .ateam-route-surface .wf-fit-note {
          margin: auto 0 0;
          padding-top: 12px;
          border-top: 1px solid rgba(16, 33, 62, 0.08);
        }

        .ateam-route-surface .wf-support-stack {
          gap: 0;
        }

        .ateam-route-surface .wf-secondary-band .wf-role-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .ateam-route-surface .wf-stage--intake > .wf-template-card .wf-template-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        @media (max-width: 1366px) {
          .ateam-route-surface .wf-shell .container,
          .ateam-route-surface .wf-bar,
          .ateam-route-surface .wf-body,
          .ateam-route-surface .wf-secondary-band .container {
            width: min(100%, calc(100vw - 28px));
          }

          .ateam-route-surface .wf-stage--intake {
            grid-template-columns: minmax(0, 0.82fr) minmax(620px, 1.18fr);
          }

          .ateam-route-surface .wf-stage--intake > .wf-template-card .wf-template-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 1120px) {
          .ateam-route-surface .wf-stage--intake,
          .ateam-route-surface .wf-secondary-grid {
            grid-template-columns: 1fr;
          }

          .ateam-route-surface .wf-proof-strip,
          .ateam-route-surface .wf-expect-row,
          .ateam-route-surface .wf-stage--intake > .wf-template-card .wf-template-grid,
          .ateam-route-surface .wf-secondary-band .wf-role-grid,
          .ateam-route-surface .wf-guided-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .ateam-route-surface .wf-intake-label-row {
            flex-direction: column;
            align-items: stretch;
          }

          .ateam-route-surface .wf-voice-btn {
            width: 100%;
            min-width: 0;
          }
        }
      `;

  return (
    <div className="ateam-route-surface">
      <AteamLandingExperience basePath="/ateam" />
      <style dangerouslySetInnerHTML={{ __html: routeScopedStyles }} />
    </div>
  );
}
