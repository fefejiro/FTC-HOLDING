/**
 * Client Scope Generation Service
 * Purpose: Claude-powered concierge that generates scope artifacts from intake forms
 * Usage: Triggered on project creation or client feedback, generates structured scope docs
 * 
 * Integration point: Called from Supabase edge function or scheduled job
 * Output: Creates entries in project_artifacts table, sends email to client
 */

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

interface ProjectIntake {
  id: string;
  email: string;
  project_name: string;
  plan_type: string; // "starter", "standard", "professional"
  description: string;
  target_audience?: string;
  timeline_preference?: string;
  budget?: number;
}

interface ScopeArtifact {
  phases: Array<{
    name: string;
    duration_weeks: number;
    objectives: string[];
    deliverables: string[];
    milestones: string[];
  }>;
  tech_stack: {
    frontend?: string[];
    backend?: string[];
    infrastructure?: string[];
    tools?: string[];
  };
  effort_estimates: {
    total_weeks: number;
    team_size: number;
    cost_estimate_usd: number;
  };
  risks: Array<{
    risk: string;
    likelihood: "low" | "medium" | "high";
    mitigation: string;
  }>;
  assumptions: string[];
  mockup_descriptions: Array<{
    screen_name: string;
    description: string;
    user_flow: string;
  }>;
  timeline_breakdown: string;
  next_steps: string[];
}

/**
 * Generate scope from intake data
 * Maps plan_type and description to a structured scope document
 */
async function generateScopeFromIntake(
  intake: ProjectIntake,
  existingDocPath?: string // path to DOCS/ANION/ for reference
): Promise<ScopeArtifact> {
  const prompt = `You are a product strategist and delivery architect at FTC Holding. 
  
A client has submitted a project intake form. Your job is to generate a comprehensive, realistic scope document 
that breaks the project into phases, estimates effort, identifies risks, and describes the solution in plain terms.

CLIENT PROJECT DETAILS:
- Project Name: ${intake.project_name}
- Plan Type: ${intake.plan_type}
- Email: ${intake.email}
- Description: ${intake.description}
- Target Audience: ${intake.target_audience || "Not specified"}
- Timeline Preference: ${intake.timeline_preference || "Not specified"}
- Budget: $${intake.budget || "Flexible"}

${existingDocPath ? `Reference existing docs at ${existingDocPath} for similar project structure.` : ""}

Generate a JSON scope document with this structure:
{
  "phases": [
    {
      "name": "Phase 1: Foundation & Setup",
      "duration_weeks": 2,
      "objectives": ["Establish tech stack", "Set up CI/CD"],
      "deliverables": ["Initialized repo", "Deployed staging environment"],
      "milestones": ["Week 1: Setup complete", "Week 2: First deploy"]
    }
    // ... more phases
  ],
  "tech_stack": {
    "frontend": ["React 19", "TypeScript", "Tailwind CSS"],
    "backend": ["Node.js", "Express", "Supabase"],
    "infrastructure": ["Cloudflare Pages", "Railway", "GitHub Actions"],
    "tools": ["GitHub", "Figma", "Stripe"]
  },
  "effort_estimates": {
    "total_weeks": 12,
    "team_size": 2,
    "cost_estimate_usd": 25000
  },
  "risks": [
    {
      "risk": "Integration complexity with third-party payment provider",
      "likelihood": "medium",
      "mitigation": "Allocate extra testing time, use existing SDKs"
    }
  ],
  "assumptions": [
    "Client can provide timely feedback",
    "Third-party APIs remain stable"
  ],
  "mockup_descriptions": [
    {
      "screen_name": "Home Screen",
      "description": "Hero section with CTA, feature highlights below",
      "user_flow": "Guest sees home → clicks CTA → directed to signup"
    }
  ],
  "timeline_breakdown": "Phase 1 (setup): Weeks 1-2, Phase 2 (core features): Weeks 3-8, Phase 3 (polish + deploy): Weeks 9-12",
  "next_steps": ["Design review", "Technical architecture approval", "Sprint 1 kickoff"]
}

Be specific, realistic, and conservative with estimates. Include a mix of optimistic and conservative scenarios.
Return ONLY the JSON object, no markdown or explanation.`;

  const message = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";

  // Parse JSON response
  const scope: ScopeArtifact = JSON.parse(responseText);
  return scope;
}

/**
 * Generate a human-readable summary from scope artifact
 */
function generateScopeSummary(scope: ScopeArtifact): string {
  const phaseSummary = scope.phases
    .map((p) => `${p.name}: ${p.duration_weeks} weeks`)
    .join(", ");

  return `
Project Scope: ${phaseSummary}
Total Duration: ${scope.effort_estimates.total_weeks} weeks
Estimated Cost: $${scope.effort_estimates.cost_estimate_usd.toLocaleString()}
Team Size: ${scope.effort_estimates.team_size} engineers
Key Risks: ${scope.risks.length} identified, all with mitigation plans
Next Steps: Review and approve to move to Active phase
`.trim();
}

/**
 * Generate email HTML for scope artifact delivery
 */
function generateScopeEmailHtml(
  clientName: string,
  projectName: string,
  scope: ScopeArtifact,
  unalabsReviewUrl: string
): string {
  return `
<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; }
      .header h1 { margin: 0 0 10px 0; }
      .header p { margin: 0; opacity: 0.9; }
      .section { margin: 20px 0; padding: 15px; border-left: 4px solid #667eea; background: #f9f9f9; }
      .section h3 { margin-top: 0; }
      .phase { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
      .phase-name { font-weight: bold; color: #667eea; }
      .phase-duration { color: #666; font-size: 0.9em; }
      .cta-button { background: #667eea; color: white; padding: 12px 30px; border-radius: 4px; text-decoration: none; display: inline-block; margin-top: 15px; }
      .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 0.85em; color: #666; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Project Scope Ready for Review</h1>
        <p>Hi ${clientName}, your project <strong>${projectName}</strong> scope is ready!</p>
      </div>

      <div class="section">
        <h3>Timeline Overview</h3>
        <p><strong>Total Duration:</strong> ${scope.effort_estimates.total_weeks} weeks</p>
        <p><strong>Estimated Cost:</strong> $${scope.effort_estimates.cost_estimate_usd.toLocaleString()}</p>
        <p><strong>Team:</strong> ${scope.effort_estimates.team_size} engineer(s)</p>
      </div>

      <div class="section">
        <h3>Project Phases</h3>
        ${scope.phases
          .map(
            (p) => `
        <div class="phase">
          <div class="phase-name">${p.name}</div>
          <div class="phase-duration">${p.duration_weeks} weeks</div>
          <p style="margin: 8px 0 0 0;"><strong>Deliverables:</strong> ${p.deliverables.join(", ")}</p>
        </div>
        `
          )
          .join("")}
      </div>

      <div class="section">
        <h3>Next Steps</h3>
        <ol>
          <li>Review the full scope document in Unalabs</li>
          <li>Provide feedback or request changes</li>
          <li>Once approved, we'll begin building Phase 1</li>
        </ol>
        <a href="${unalabsReviewUrl}" class="cta-button">Review Scope in Unalabs</a>
      </div>

      <div class="section">
        <h3>Questions?</h3>
        <p>Reply to this email or comment directly in Unalabs. We're here to refine the scope until it feels right.</p>
      </div>

      <div class="footer">
        <p>© 2026 FTC Holding / Una Labs. This is a confidential project scope.</p>
      </div>
    </div>
  </body>
</html>
  `.trim();
}

/**
 * Main entry point: Generate scope for a project and create artifact record
 * Call this when project is created or on schedule for refinement
 */
export async function generateProjectScope(
  intake: ProjectIntake,
  existingDocPath?: string
): Promise<{
  scope: ScopeArtifact;
  summary: string;
  emailHtml: string;
}> {
  console.log(`Generating scope for project: ${intake.project_name}`);

  // Generate scope using Claude
  const scope = await generateScopeFromIntake(intake, existingDocPath);

  // Generate summary for email preview
  const summary = generateScopeSummary(scope);

  // Generate email HTML
  const unalabsReviewUrl = `https://unalabs.cloud/dashboard/${intake.id}/scope`;
  const emailHtml = generateScopeEmailHtml(
    intake.email.split("@")[0],
    intake.project_name,
    scope,
    unalabsReviewUrl
  );

  return {
    scope,
    summary,
    emailHtml,
  };
}

// Example usage (for testing)
if (import.meta.url === `file://${process.argv[1]}`) {
  const testIntake: ProjectIntake = {
    id: "test-123",
    email: "uby400@gmail.com",
    project_name: "Anion Class App",
    plan_type: "professional",
    description:
      "Premium online tutoring platform with real-time lesson rooms and marketplace for tutors",
    target_audience: "Students aged 13-22 and professional tutors",
    timeline_preference: "12 weeks",
    budget: 50000,
  };

  generateProjectScope(testIntake, "DOCS/ANION/").then((result) => {
    console.log("=== SCOPE ARTIFACT ===");
    console.log(JSON.stringify(result.scope, null, 2));
    console.log("\n=== SUMMARY ===");
    console.log(result.summary);
    console.log("\n=== EMAIL (first 500 chars) ===");
    console.log(result.emailHtml.substring(0, 500));
  });
}
