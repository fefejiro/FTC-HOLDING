"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

type WidgetPhase = "idle" | "starting" | "working" | "done" | "error";

interface RunData {
  id: string;
  phase: string;
  brief?: {
    title?: string;
    quickVerdict?: string;
    recommendedLane?: string;
    summary?: string;
  };
  publicFlow?: {
    understanding?: { title?: string; recommendedLane?: string; summary?: string };
  };
  statusNarrative?: { currentStage?: string; label?: string; summary?: string };
}

// ── Stage nodes ───────────────────────────────────────────────────────────────

const STAGES = [
  { key: "route", label: "Route", phases: ["analysis", "brief_approval", "initiation"] },
  { key: "build", label: "Build", phases: ["prototype_pack"] },
  { key: "review", label: "Review", phases: ["pack_approval"] },
  { key: "pack", label: "Pack", phases: ["handoff"] },
] as const;

function phaseToStageIndex(phase: string): number {
  for (let i = 0; i < STAGES.length; i++) {
    if ((STAGES[i].phases as readonly string[]).includes(phase)) return i;
  }
  return -1;
}

const PHASE_LABELS: Record<string, string> = {
  analysis: "Understanding the idea...",
  brief_approval: "Routing to the right lane...",
  initiation: "Mapping the path...",
  prototype_pack: "Building the first pass...",
  pack_approval: "Reviewing the output...",
  handoff: "Decision pack ready",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function AteamHomeWidget() {
  const [idea, setIdea] = useState("");
  const [widgetPhase, setWidgetPhase] = useState<WidgetPhase>("idle");
  const [introSweep, setIntroSweep] = useState(true);
  const [runId, setRunId] = useState<string | null>(null);
  const [run, setRun] = useState<RunData | null>(null);
  const [activeStage, setActiveStage] = useState(-1);
  const [stageLabel, setStageLabel] = useState("ATEAM is live · Drop a rough idea below");
  const [error, setError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIntroSweep(false), 2_200);
    return () => clearTimeout(timer);
  }, []);

  // Poll run state when working
  useEffect(() => {
    if (!runId || widgetPhase !== "working") return;

    async function poll() {
      try {
        const res = await fetch(`/api/ateam/workflow/runs/${encodeURIComponent(runId!)}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { ok?: boolean; run?: RunData };
        if (!data.ok || !data.run) return;

        const r = data.run;
        setRun(r);
        const stageIdx = phaseToStageIndex(r.phase);
        setActiveStage(stageIdx);
        setStageLabel(PHASE_LABELS[r.phase] || "Working...");

        if (r.phase === "handoff") {
          if (pollRef.current) clearInterval(pollRef.current);
          setWidgetPhase("done");
        }
      } catch {
        // Ignore transient poll errors
      }
    }

    poll();
    pollRef.current = setInterval(poll, 3_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [runId, widgetPhase]);

  async function handleRun() {
    const trimmed = idea.trim();
    if (trimmed.length < 12) {
      setError("Add a bit more detail — at least a full sentence.");
      return;
    }
    setError("");
    setWidgetPhase("starting");
    setActiveStage(0);
    setStageLabel("Starting run...");

    try {
      const res = await fetch("/api/ateam/workflow/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: trimmed, category: "auto" }),
        cache: "no-store",
      });

      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as { ok?: boolean; run?: RunData };
      if (!data.ok || !data.run) throw new Error("failed");

      setRunId(data.run.id);
      setWidgetPhase("working");
      setStageLabel("Understanding the idea...");
    } catch {
      setWidgetPhase("error");
      setError("ATEAM could not start right now. Try once more.");
    }
  }

  function handleReset() {
    if (pollRef.current) clearInterval(pollRef.current);
    setIdea("");
    setWidgetPhase("idle");
    setRunId(null);
    setRun(null);
    setActiveStage(-1);
    setStageLabel("ATEAM is live · Drop a rough idea below");
    setError("");
  }

  const isIdle = widgetPhase === "idle" || widgetPhase === "error";
  const isWorking = widgetPhase === "starting" || widgetPhase === "working";
  const isDone = widgetPhase === "done";

  const outputTitle =
    run?.brief?.title ||
    run?.publicFlow?.understanding?.title ||
    "Decision pack ready";
  const outputVerdict =
    run?.brief?.quickVerdict ||
    run?.brief?.summary ||
    run?.publicFlow?.understanding?.summary ||
    "";
  const outputLane =
    run?.brief?.recommendedLane ||
    run?.publicFlow?.understanding?.recommendedLane ||
    "";

  return (
    <div className="ahw-shell">
      {/* Top bar */}
      <div className="ahw-topbar">
        <span className="ahw-topbar-label">ATEAM · Una Labs</span>
        <span className={`ahw-live-dot ${isWorking ? "ahw-live-dot--active" : ""}`} aria-hidden="true" />
      </div>

      {/* Stage nodes */}
      <div className="ahw-nodes" aria-label="ATEAM workflow stages">
        {STAGES.map((stage, i) => {
          const isActive = activeStage === i;
          const isDoneStage = activeStage > i || (isDone && i <= 3);
          const cls = [
            "ahw-node",
            isActive ? "ahw-node--active" : "",
            isDoneStage ? "ahw-node--done" : "",
            isIdle && !introSweep ? `ahw-node--idle ahw-node--idle-${i}` : "",
            isIdle && introSweep ? `ahw-node--intro ahw-node--intro-${i}` : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <div key={stage.key} className={cls}>
              <div className="ahw-node-ring">
                <div className="ahw-node-dot" />
              </div>
              <span className="ahw-node-label">{stage.label}</span>
              {i < STAGES.length - 1 && (
                <div
                  className={`ahw-connector ${isDoneStage || isActive ? "ahw-connector--lit" : ""}`}
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Status line */}
      <p className="ahw-status">{isWorking ? stageLabel : isDone ? "Decision pack ready" : stageLabel}</p>

      {/* ── IDLE: intake form ── */}
      {isIdle && (
        <div className="ahw-intake">
          <textarea
            className="ahw-textarea"
            rows={3}
            placeholder="Drop a rough idea — ATEAM routes it, builds a first pass, and returns a decision pack."
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleRun();
            }}
            aria-label="Idea for ATEAM"
          />
          {error && <p className="ahw-error">{error}</p>}
          <div className="ahw-row">
            <button className="ahw-btn-primary" onClick={handleRun}>
              Run ATEAM
            </button>
            <Link href="/ateam" className="ahw-link" prefetch={false}>
              Open full workflow →
            </Link>
          </div>
        </div>
      )}

      {/* ── WORKING: progress state ── */}
      {isWorking && (
        <div className="ahw-working">
          <p className="ahw-working-idea">
            &ldquo;{idea.length > 90 ? `${idea.slice(0, 90)}\u2026` : idea}&rdquo;
          </p>
          <p className="ahw-working-stage">{stageLabel}</p>
          {runId && (
            <Link href={`/ateam?run=${runId}`} className="ahw-link" prefetch={false}>
              Watch in full view →
            </Link>
          )}
        </div>
      )}

      {/* ── DONE: compact output ── */}
      {isDone && (
        <div className="ahw-output">
          {outputTitle && <h3 className="ahw-output-title">{outputTitle}</h3>}
          {outputVerdict && <p className="ahw-output-verdict">{outputVerdict}</p>}
          {outputLane && <span className="ahw-output-lane">{outputLane}</span>}
          <div className="ahw-row ahw-row--mt">
            <Link href={`/ateam?run=${runId}`} className="ahw-btn-primary" prefetch={false}>
              View decision pack
            </Link>
            <Link href="/work-with-ftc" className="ahw-link" prefetch={false}>
              Start this project →
            </Link>
          </div>
          <button className="ahw-reset" onClick={handleReset} aria-label="Run another idea">
            Run another idea
          </button>
        </div>
      )}
    </div>
  );
}
