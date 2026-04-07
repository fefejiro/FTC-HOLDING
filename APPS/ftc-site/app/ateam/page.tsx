export const dynamic = "force-dynamic";
export const revalidate = 0;

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
        .ateam-route-surface .wf-shell .container {
          width: min(1880px, calc(100vw - clamp(28px, 4vw, 88px)));
          max-width: none;
        }

        .ateam-route-surface .wf-bar,
        .ateam-route-surface .wf-body,
        .ateam-route-surface .wf-secondary-band .container {
          width: min(1880px, calc(100vw - clamp(28px, 4vw, 88px)));
          max-width: none;
          margin-left: auto;
          margin-right: auto;
        }

        .ateam-route-surface .wf-stage--intake {
          grid-template-columns: minmax(0, 0.96fr) minmax(760px, 1.04fr);
          gap: clamp(24px, 2vw, 34px);
        }

        .ateam-route-surface .wf-intro-headline {
          max-width: 12ch;
          font-size: clamp(2.5rem, 4.3vw, 4.85rem);
        }

        .ateam-route-surface .wf-intro-lead {
          max-width: 62ch;
          font-size: 1.06rem;
        }

        .ateam-route-surface .wf-proof-strip {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .ateam-route-surface .wf-guided-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .ateam-route-surface .wf-template-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .ateam-route-surface .wf-role-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .ateam-route-surface .wf-secondary-grid,
        .ateam-route-surface .wf-support-stack {
          grid-template-columns: minmax(0, 1fr);
          gap: 24px;
        }

        .ateam-route-surface .wf-placeholder-strip,
        .ateam-route-surface .wf-office-support {
          display: none !important;
        }

        .ateam-route-surface .wf-fit-strip,
        .ateam-route-surface .wf-role-card,
        .ateam-route-surface .wf-template-card,
        .ateam-route-surface .wf-recent-card,
        .ateam-route-surface .wf-intake-card {
          width: 100%;
          max-width: none;
        }

        .ateam-route-surface .wf-voice-btn {
          min-width: 264px;
          min-height: 58px;
          padding: 12px 18px;
          border-radius: 18px;
          border: 1px solid rgba(220, 38, 38, 0.24);
          background: linear-gradient(180deg, rgba(220, 38, 38, 0.96), rgba(185, 28, 28, 0.98));
          color: #fff;
          box-shadow: 0 18px 34px rgba(185, 28, 28, 0.2);
        }

        .ateam-route-surface .wf-voice-btn:hover {
          border-color: rgba(153, 27, 27, 0.3);
          background: linear-gradient(180deg, rgba(239, 68, 68, 0.98), rgba(185, 28, 28, 1));
          color: #fff;
        }

        .ateam-route-surface .wf-voice-btn--active {
          border-color: rgba(127, 29, 29, 0.36);
          background: linear-gradient(180deg, rgba(239, 68, 68, 1), rgba(153, 27, 27, 1));
          color: #fff;
          box-shadow: 0 20px 38px rgba(153, 27, 27, 0.26);
        }

        .ateam-route-surface .wf-voice-indicator {
          width: 20px;
          height: 20px;
          background: rgba(255, 255, 255, 0.18);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
        }

        .ateam-route-surface .wf-voice-indicator-dot {
          width: 10px;
          height: 10px;
          background: #fff;
        }

        .ateam-route-surface .wf-voice-btn--active .wf-voice-indicator-dot {
          animation: wf-rec-pulse 1s ease-out infinite;
          box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.44);
        }

        .ateam-route-surface .wf-local-note {
          margin-top: 12px;
        }

        @media (max-width: 1280px) {
          .ateam-route-surface .wf-stage--intake {
            grid-template-columns: minmax(0, 1fr) minmax(620px, 1fr);
          }

          .ateam-route-surface .wf-template-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 1080px) {
          .ateam-route-surface .wf-shell .container,
          .ateam-route-surface .wf-bar,
          .ateam-route-surface .wf-body,
          .ateam-route-surface .wf-secondary-band .container {
            width: min(100%, calc(100vw - 28px));
          }

          .ateam-route-surface .wf-stage--intake,
          .ateam-route-surface .wf-proof-strip,
          .ateam-route-surface .wf-template-grid,
          .ateam-route-surface .wf-role-grid,
          .ateam-route-surface .wf-guided-grid {
            grid-template-columns: 1fr;
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
