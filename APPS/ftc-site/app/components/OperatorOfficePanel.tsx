"use client";

import { useEffect, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type OfficePhase = "idle" | "routing" | "building" | "packaging" | "done";

type AgentDef = {
  id: string;
  name: string;
  role: string;
  task: string;
  activeIn: OfficePhase[];
  doneAfter: OfficePhase[];
};

// ── Agent definitions ─────────────────────────────────────────────────────────

const AGENTS: AgentDef[] = [
  { id: "violet", name: "Violet", role: "Lead Route",  task: "Analyzing intent",    activeIn: ["routing"],           doneAfter: ["building", "packaging", "done"] },
  { id: "scout",  name: "Scout",  role: "Discovery",   task: "Mapping context",     activeIn: ["routing"],           doneAfter: ["building", "packaging", "done"] },
  { id: "codex",  name: "Codex",  role: "Builder",     task: "Writing spec",        activeIn: ["building"],          doneAfter: ["packaging", "done"] },
  { id: "quill",  name: "Quill",  role: "Reviewer",    task: "Reviewing draft",     activeIn: ["building"],          doneAfter: ["packaging", "done"] },
  { id: "pixel",  name: "Pixel",  role: "Packager",    task: "Assembling pack",     activeIn: ["packaging"],         doneAfter: ["done"] },
  { id: "echo",   name: "Echo",   role: "Handoff",     task: "Preparing delivery",  activeIn: ["packaging", "done"], doneAfter: [] },
];

// ── Pixel art rendering ───────────────────────────────────────────────────────

function pixelPalette(id: string) {
  const palettes: Record<string, { skin: string; body: string; pants: string; hair: string; accent: string; glasses: boolean; hat: string }> = {
    violet: { skin: "#d9b39b", body: "#8b5cf6", pants: "#252649", hair: "#342356", accent: "#ddd6fe", glasses: false, hat: "" },
    scout:  { skin: "#6f472e", body: "#10b981", pants: "#1b2338", hair: "#16181f", accent: "#7cecc6", glasses: false, hat: "" },
    codex:  { skin: "#c18a62", body: "#f97316", pants: "#1d2638", hair: "#6b3418", accent: "#fed7aa", glasses: false, hat: "cap" },
    quill:  { skin: "#4f2c1f", body: "#a855f7", pants: "#20263d", hair: "#20111d", accent: "#d8b4fe", glasses: true,  hat: "" },
    pixel:  { skin: "#7b4a33", body: "#ec4899", pants: "#1f2138", hair: "#3a1026", accent: "#f9a8d4", glasses: false, hat: "beanie" },
    echo:   { skin: "#9c6845", body: "#22c55e", pants: "#17263a", hair: "#221f1f", accent: "#93c5fd", glasses: false, hat: "headset" },
  };
  return palettes[id] || { skin: "#b88362", body: "#64748b", pants: "#1e293b", hair: "#111827", accent: "#dbeafe", glasses: false, hat: "" };
}

function drawPixelPerson(canvas: HTMLCanvasElement, agentId: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { skin, body, pants, hair, accent, glasses, hat } = pixelPalette(agentId);
  const S = 5; // scale: 16×20 grid → 80×100px
  canvas.width = 16 * S;
  canvas.height = 20 * S;
  ctx.imageSmoothingEnabled = false;

  const fill = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x * S, y * S, w * S, h * S);
  };

  // Hat
  if (hat === "beanie")      { fill(4, 1, 8, 2, accent); fill(5, 3, 6, 1, accent); }
  else if (hat === "cap")    { fill(4, 1, 8, 2, accent); fill(9, 3, 4, 1, accent); }

  // Hair
  fill(5, 1, 6, 2, hair);
  fill(4, 3, 1, 2, hair);
  fill(11, 3, 1, 2, hair);

  // Face
  fill(5, 3, 6, 6, skin);
  fill(7, 5, 1, 1, "#101827"); // left eye
  fill(9, 5, 1, 1, "#101827"); // right eye
  fill(8, 7, 1, 1, "#101827"); // mouth

  // Glasses
  if (glasses) {
    fill(6, 5, 3, 1, "#dbeafe");
    fill(9, 5, 3, 1, "#dbeafe");
  }

  // Headset
  if (hat === "headset") {
    fill(4, 4, 1, 3, accent);
    fill(11, 4, 1, 3, accent);
    fill(5, 3, 6, 1, accent);
  }

  // Body + arms + hands
  fill(4, 9, 8, 5, body);
  fill(2, 9, 2, 4, body);
  fill(12, 9, 2, 4, body);
  fill(2, 13, 2, 2, skin);
  fill(12, 13, 2, 2, skin);

  // Legs + shoes
  fill(5, 14, 3, 4, pants);
  fill(8, 14, 3, 4, pants);
  fill(4, 18, 4, 2, "#111827");
  fill(8, 18, 4, 2, "#111827");
}

// ── Agent card ────────────────────────────────────────────────────────────────

function AgentCard({
  agent,
  phase,
  idx,
  entering,
}: {
  agent: AgentDef;
  phase: OfficePhase;
  idx: number;
  entering: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) drawPixelPerson(canvasRef.current, agent.id);
  }, [agent.id]);

  const isActive = agent.activeIn.includes(phase);
  const isDone   = agent.doneAfter.includes(phase);
  const status   = isActive ? "active" : isDone ? "done" : "idle";

  const classNames = [
    "opi-agent",
    `opi-agent--${status}`,
    `opi-agent--persona-${agent.id}`,
    isActive && entering ? "opi-agent--entering" : "",
  ].filter(Boolean).join(" ");

  return (
    <div
      className={classNames}
      style={!entering ? { animationDelay: `${idx * 0.22}s` } : undefined}
    >
      <div className="opi-sprite" aria-hidden="true">
        <canvas ref={canvasRef} />
      </div>
      <div className="opi-agent-info">
        <span className="opi-agent-name">{agent.name}</span>
        <span className="opi-agent-role">{agent.role}</span>
        <span className="opi-agent-task" aria-hidden="true">{agent.task}</span>
      </div>
      <span className={`opi-dot opi-dot--${status}`} aria-hidden="true" />
    </div>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

const PHASE_LABEL: Record<OfficePhase, string> = {
  idle:      "Ready",
  routing:   "Routing",
  building:  "Building",
  packaging: "Packaging",
  done:      "Complete",
};

export default function OperatorOfficePanel({ phase }: { phase: OfficePhase }) {
  const prevPhaseRef = useRef<OfficePhase>(phase);
  const [enteringAgents, setEnteringAgents] = useState<Set<string>>(new Set());

  useEffect(() => {
    const prev = prevPhaseRef.current;
    if (prev === phase) return;
    prevPhaseRef.current = phase;

    // Find agents newly becoming active in this phase
    const nowActive = AGENTS.filter(
      (a) => a.activeIn.includes(phase) && !a.activeIn.includes(prev)
    ).map((a) => a.id);

    if (nowActive.length === 0) return;

    setEnteringAgents(new Set(nowActive));
    const t = setTimeout(() => setEnteringAgents(new Set()), 700);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <div className="opi-shell">
      <div className="opi-header">
        <span className="opi-header-label">Live agent team</span>
        <span className={`opi-header-chip opi-header-chip--${phase}`}>
          {phase !== "idle" && <span className="opi-header-dot" aria-hidden="true" />}
          {PHASE_LABEL[phase]}
        </span>
      </div>

      <div className="opi-intro" aria-hidden="true">
        <p className="opi-intro-title">
          {phase === "idle"
            ? "Six specialists. One structured output."
            : phase === "done"
            ? "Pack delivered."
            : "Agents are working on your idea."}
        </p>
        <p className="opi-intro-sub">
          {phase === "idle"
            ? "Concept brief · Prototype direction · Build note · Next steps"
            : phase === "done"
            ? "Review the decision pack and start the project."
            : "Each agent owns a stage — routing, building, or packaging."}
        </p>
      </div>

      <div className="opi-grid">
        {AGENTS.map((agent, idx) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            phase={phase}
            idx={idx}
            entering={enteringAgents.has(agent.id)}
          />
        ))}
      </div>

      <div className="opi-footer" aria-hidden="true">
        Una Labs · ATEAM
      </div>
    </div>
  );
}
