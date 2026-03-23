import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

type DemoPayload = {
  idea?: unknown;
  category?: unknown;
};

type DemoPreset = {
  label: string;
  direction: string;
  phases: string[];
  stack: string[];
  deliverables: string[];
  nextSteps: string[];
};

const presets: Record<string, DemoPreset> = {
  website: {
    label: "fast website launch",
    direction: "Lead with a conversion-focused site and measurable intake flow.",
    phases: ["Scope & messaging", "Design system", "Build & QA", "Launch & monitor"],
    stack: ["Next.js", "Tailwind", "Analytics + SEO tooling", "Cloudflare Pages"],
    deliverables: [
      "Conversion-ready homepage",
      "Service detail pages",
      "Lead capture + routing",
      "Performance + SEO checklist"
    ],
    nextSteps: ["Confirm scope", "Finalize sitemap", "Set launch timeline"]
  },
  "lead-automation": {
    label: "lead automation workflow",
    direction: "Capture, qualify, route, and follow up without manual babysitting.",
    phases: ["Intake mapping", "Routing logic", "Automation build", "Monitoring & QA"],
    stack: ["Webhook intake", "CRM-ready pipeline", "Email/SMS automation", "Dashboards"],
    deliverables: [
      "Lead capture map",
      "Automation playbook",
      "Routing ruleset",
      "Follow-up templates"
    ],
    nextSteps: ["Pick CRM destination", "Define qualification rules", "Approve messaging"]
  },
  "product-app": {
    label: "product or mobile app",
    direction: "Start with a scoped MVP and clear feature sequencing.",
    phases: ["Product brief", "UX flow", "Prototype", "Build plan"],
    stack: ["Cross-platform UI", "API layer", "Analytics instrumentation", "Deployment plan"],
    deliverables: [
      "Feature map",
      "Wireframe flow",
      "MVP scope",
      "Build roadmap"
    ],
    nextSteps: ["Confirm users", "Lock MVP scope", "Approve milestones"]
  },
  "internal-tool": {
    label: "internal operations tool",
    direction: "Remove manual steps and make execution observable.",
    phases: ["Process audit", "Workflow design", "Build & automate", "Training"],
    stack: ["Internal dashboard", "Role-based access", "Automation hooks", "Audit trail"],
    deliverables: [
      "Process map",
      "Operational dashboard",
      "Automation checklist",
      "Training guide"
    ],
    nextSteps: ["Collect workflows", "Define owners", "Confirm data sources"]
  },
  "ai-feature": {
    label: "AI feature",
    direction: "Add AI where it removes friction and improves decision quality.",
    phases: ["Use-case selection", "Prompt + guardrails", "Integration", "QA + monitoring"],
    stack: ["LLM integration", "Policy guardrails", "Feedback loop", "Observability"],
    deliverables: [
      "Use-case brief",
      "Guardrail plan",
      "Prototype flow",
      "Monitoring checklist"
    ],
    nextSteps: ["Pick user scenario", "Approve evaluation criteria", "Set rollout plan"]
  }
};

function normalizeText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
}

function selectPreset(category: string): DemoPreset {
  if (presets[category]) return presets[category];
  return presets.website;
}

export async function POST(req: NextRequest) {
  let payload: DemoPayload;
  try {
    payload = (await req.json()) as DemoPayload;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request payload." }, { status: 400 });
  }

  const idea = normalizeText(payload.idea);
  const category = normalizeText(payload.category).toLowerCase() || "website";

  if (idea.length < 12) {
    return NextResponse.json(
      { ok: false, message: "Please share a bit more detail so ATEAM can respond." },
      { status: 400 }
    );
  }

  const preset = selectPreset(category);
  const summary = `For "${idea}", ATEAM recommends a ${preset.label} plan with a tight scope and clear delivery phases.`;

  return NextResponse.json(
    {
      ok: true,
      input: { idea, category },
      output: {
        summary,
        recommendedDirection: preset.direction,
        phases: preset.phases,
        stack: preset.stack,
        deliverables: preset.deliverables,
        nextSteps: preset.nextSteps
      }
    },
    { status: 200 }
  );
}
