"use client";

import { useEffect, useRef, useState } from "react";

export type OfficePhase = "idle" | "routing" | "building" | "packaging" | "done";

type AgentDef = {
  id: string;
  name: string;
  hook: string;
  description: string;
  stageLabel: string;
  activeIn: OfficePhase[];
  doneAfter: OfficePhase[];
};

const AGENTS: AgentDef[] = [
  {
    id: "lead",
    name: "Lead",
    hook: "Own the scope",
    description: "Defines the goal, constraints, and success criteria.",
    stageLabel: "Stage 1 - Direction",
    activeIn: ["routing"],
    doneAfter: ["building", "packaging", "done"]
  },
  {
    id: "scout",
    name: "Scout",
    hook: "Structure the request",
    description: "Turns rough input into clearer context and request signals.",
    stageLabel: "Stage 2 - Discovery",
    activeIn: ["routing"],
    doneAfter: ["building", "packaging", "done"]
  },
  {
    id: "architect",
    name: "Architect",
    hook: "Shape the plan",
    description: "Builds the workflow path, logic, and first-pass scope.",
    stageLabel: "Stage 3 - System design",
    activeIn: ["routing", "building"],
    doneAfter: ["packaging", "done"]
  },
  {
    id: "builder",
    name: "Builder",
    hook: "Prepare the build path",
    description: "Turns the approved plan into artifacts and implementation direction.",
    stageLabel: "Stage 4 - Execution",
    activeIn: ["building"],
    doneAfter: ["packaging", "done"]
  },
  {
    id: "designer",
    name: "Designer",
    hook: "Keep it decision-ready",
    description: "Makes the output clear, legible, and reviewable.",
    stageLabel: "Stage 5 - Experience",
    activeIn: ["packaging"],
    doneAfter: ["done"]
  },
  {
    id: "operator",
    name: "Operator",
    hook: "Move into delivery",
    description: "Carries the approved output into real execution when the path is ready.",
    stageLabel: "Stage 6 - Live operation",
    activeIn: ["packaging", "done"],
    doneAfter: []
  }
];

function pixelPalette(id: string) {
  const palettes: Record<
    string,
    { skin: string; body: string; pants: string; hair: string; accent: string; glasses: boolean; hat: string }
  > = {
    lead: {
      skin: "#d9b39b",
      body: "#7c3aed",
      pants: "#252649",
      hair: "#342356",
      accent: "#ddd6fe",
      glasses: false,
      hat: ""
    },
    scout: {
      skin: "#6f472e",
      body: "#10b981",
      pants: "#1b2338",
      hair: "#16181f",
      accent: "#7cecc6",
      glasses: false,
      hat: ""
    },
    architect: {
      skin: "#4f2c1f",
      body: "#a855f7",
      pants: "#20263d",
      hair: "#20111d",
      accent: "#d8b4fe",
      glasses: true,
      hat: ""
    },
    builder: {
      skin: "#c18a62",
      body: "#f97316",
      pants: "#1d2638",
      hair: "#6b3418",
      accent: "#fed7aa",
      glasses: false,
      hat: "cap"
    },
    designer: {
      skin: "#7b4a33",
      body: "#ec4899",
      pants: "#1f2138",
      hair: "#3a1026",
      accent: "#f9a8d4",
      glasses: false,
      hat: "beanie"
    },
    operator: {
      skin: "#9c6845",
      body: "#22c55e",
      pants: "#17263a",
      hair: "#221f1f",
      accent: "#93c5fd",
      glasses: false,
      hat: "headset"
    }
  };

  return (
    palettes[id] || {
      skin: "#b88362",
      body: "#64748b",
      pants: "#1e293b",
      hair: "#111827",
      accent: "#dbeafe",
      glasses: false,
      hat: ""
    }
  );
}

function drawPixelPerson(canvas: HTMLCanvasElement, agentId: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { skin, body, pants, hair, accent, glasses, hat } = pixelPalette(agentId);
  const scale = 5;
  canvas.width = 16 * scale;
  canvas.height = 20 * scale;
  ctx.imageSmoothingEnabled = false;

  const fill = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x * scale, y * scale, w * scale, h * scale);
  };

  if (hat === "beanie") {
    fill(4, 1, 8, 2, accent);
    fill(5, 3, 6, 1, accent);
  } else if (hat === "cap") {
    fill(4, 1, 8, 2, accent);
    fill(9, 3, 4, 1, accent);
  }

  fill(5, 1, 6, 2, hair);
  fill(4, 3, 1, 2, hair);
  fill(11, 3, 1, 2, hair);

  fill(5, 3, 6, 6, skin);
  fill(7, 5, 1, 1, "#101827");
  fill(9, 5, 1, 1, "#101827");
  fill(8, 7, 1, 1, "#101827");

  if (glasses) {
    fill(6, 5, 3, 1, "#dbeafe");
    fill(9, 5, 3, 1, "#dbeafe");
  }

  if (hat === "headset") {
    fill(4, 4, 1, 3, accent);
    fill(11, 4, 1, 3, accent);
    fill(5, 3, 6, 1, accent);
  }

  fill(4, 9, 8, 5, body);
  fill(2, 9, 2, 4, body);
  fill(12, 9, 2, 4, body);
  fill(2, 13, 2, 2, skin);
  fill(12, 13, 2, 2, skin);

  fill(5, 14, 3, 4, pants);
  fill(8, 14, 3, 4, pants);
  fill(4, 18, 4, 2, "#111827");
  fill(8, 18, 4, 2, "#111827");
}

function AgentCard({
  agent,
  phase,
  idx,
  entering
}: {
  agent: AgentDef;
  phase: OfficePhase;
  idx: number;
  entering: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      drawPixelPerson(canvasRef.current, agent.id);
    }
  }, [agent.id]);

  const isActive = agent.activeIn.includes(phase);
  const isDone = agent.doneAfter.includes(phase);
  const status = isActive ? "active" : isDone ? "done" : "idle";

  const classNames = [
    "opi-agent",
    `opi-agent--${status}`,
    `opi-agent--persona-${agent.id}`,
    isActive && entering ? "opi-agent--entering" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classNames}
      style={!entering ? { animationDelay: `${idx * 0.22}s` } : undefined}
    >
      <div className="opi-sprite" aria-hidden="true">
        <canvas ref={canvasRef} />
      </div>
      <div className="opi-agent-info">
        <span className="opi-agent-stage">{agent.stageLabel}</span>
        <span className="opi-agent-name">{agent.name}</span>
        <span className="opi-agent-hook">{agent.hook}</span>
        <span className="opi-agent-role">{agent.description}</span>
      </div>
      <span className={`opi-dot opi-dot--${status}`} aria-hidden="true" />
    </div>
  );
}

const PHASE_LABEL: Record<OfficePhase, string> = {
  idle: "Ready",
  routing: "Routing",
  building: "Building",
  packaging: "Packaging",
  done: "Complete"
};

export default function OperatorOfficePanel({ phase }: { phase: OfficePhase }) {
  const prevPhaseRef = useRef<OfficePhase>(phase);
  const [enteringAgents, setEnteringAgents] = useState<Set<string>>(new Set());

  useEffect(() => {
    const previousPhase = prevPhaseRef.current;
    if (previousPhase === phase) return;
    prevPhaseRef.current = phase;

    const nowActive = AGENTS.filter(
      (agent) => agent.activeIn.includes(phase) && !agent.activeIn.includes(previousPhase)
    ).map((agent) => agent.id);

    if (!nowActive.length) return;

    setEnteringAgents(new Set(nowActive));
    const timeout = setTimeout(() => setEnteringAgents(new Set()), 700);
    return () => clearTimeout(timeout);
  }, [phase]);

  return (
    <div className="opi-shell">
      <div className="opi-header">
        <span className="opi-header-label">Workflow stages</span>
        <span className={`opi-header-chip opi-header-chip--${phase}`}>
          {phase !== "idle" && <span className="opi-header-dot" aria-hidden="true" />}
          {PHASE_LABEL[phase]}
        </span>
      </div>

      <div className="opi-intro" aria-hidden="true">
          <p className="opi-intro-title">
            {phase === "idle"
              ? "ATEAM moves requests through a clear, reviewable workflow."
              : phase === "done"
                ? "The request is now packaged into a decision-ready next step."
                : "The workflow is shaping the request into a visible plan and output."}
          </p>
          <p className="opi-intro-sub">
            {phase === "idle"
              ? "Structured intake -> scoped plan -> approval -> output -> delivery handoff"
              : phase === "done"
                ? "Review the output, confirm the path, and move into execution."
                : "Each stage protects scope, keeps decisions visible, and prepares a cleaner next move."}
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
        Structured operator flow - Una Labs ATEAM
      </div>
    </div>
  );
}

