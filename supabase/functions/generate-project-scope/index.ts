/**
 * Supabase Edge Function: generate-project-scope
 * Trigger: HTTP POST from /start form submission or scheduled job
 * Purpose: Orchestrate scope generation, artifact creation, and email delivery
 * 
 * Deploy: supabase functions deploy generate-project-scope
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Anthropic } from "https://esm.sh/@anthropic-ai/sdk@0.31.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
const operatorNotificationEmail =
  Deno.env.get("OPERATOR_NOTIFICATION_EMAIL") || "hello@unalabs.cloud";

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const anthropic = new Anthropic({ apiKey: anthropicApiKey });

interface ProjectIntake {
  id: string;
  email: string;
  project_name: string;
  plan_type: string;
  description: string;
  target_audience?: string;
  timeline_preference?: string;
  budget?: number;
}

/**
 * Generate scope using Claude
 */
async function generateScopeFromIntake(intake: ProjectIntake) {
  const prompt = `You are a product strategist at FTC Holding.

CLIENT PROJECT:
- Name: ${intake.project_name}
- Plan: ${intake.plan_type}
- Description: ${intake.description}
- Audience: ${intake.target_audience || "Not specified"}
- Timeline: ${intake.timeline_preference || "Flexible"}
- Budget: $${intake.budget || "Flexible"}

Generate a JSON scope with: phases (name, duration_weeks, objectives, deliverables, milestones), 
tech_stack (frontend, backend, infrastructure), effort_estimates (total_weeks, team_size, cost_estimate_usd), 
risks (risk, likelihood, mitigation), assumptions, mockup_descriptions (screen_name, description, user_flow), 
timeline_breakdown, next_steps.

Be realistic and specific. Return ONLY JSON, no explanation.`;

  const message = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";
  return JSON.parse(responseText);
}

/**
 * Create artifact record in Supabase
 */
async function createArtifactRecord(
  projectId: string,
  artifactType: string,
  content: Record<string, unknown>,
  summary: string
) {
  const { data, error } = await supabase
    .from("project_artifacts")
    .insert({
      project_id: projectId,
      artifact_type: artifactType,
      version: 1,
      content,
      summary,
      generated_by: "claude",
    })
    .select();

  if (error) {
    console.error("Error creating artifact:", error);
    throw error;
  }

  return data?.[0];
}

/**
 * Send email via Resend
 */
async function sendScopeEmail(
  to: string,
  projectName: string,
  projectId: string,
  htmlBody: string
) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: "Unalabs <noreply@unalabs.cloud>",
      to,
      bcc: [operatorNotificationEmail],
      subject: `Your ${projectName} Scope is Ready for Review`,
      html: htmlBody,
      reply_to: "hello@unalabs.cloud",
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to send email: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Generate email HTML
 */
function generateEmailHtml(
  clientName: string,
  projectName: string,
  scope: Record<string, unknown>,
  projectId: string
): string {
  const phases = (scope.phases as Array<{ name: string; duration_weeks: number; deliverables: string[] }>);
  const efforts = scope.effort_estimates as { total_weeks: number; cost_estimate_usd: number };

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .section { margin: 20px 0; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; }
    .phase { margin: 10px 0; padding: 10px; background: #f5f5f5; border-left: 4px solid #667eea; }
    .cta { background: #667eea; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; display: inline-block; margin: 20px 0; }
    .footer { font-size: 0.85em; color: #999; border-top: 1px solid #ddd; padding-top: 15px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your Project Scope is Ready!</h1>
      <p>Hi ${clientName}, your ${projectName} scope is ready for review.</p>
    </div>

    <div class="section">
      <h3>Project Timeline</h3>
      <p><strong>${efforts.total_weeks} weeks</strong> estimated duration</p>
      <p><strong>$${efforts.cost_estimate_usd?.toLocaleString()}</strong> estimated investment</p>
    </div>

    <div class="section">
      <h3>Phases</h3>
      ${phases.map((p: { name: string; duration_weeks: number; deliverables: string[] }) => `<div class="phase"><strong>${p.name}</strong> — ${p.duration_weeks}w<br/><small>${(p.deliverables || []).join(", ")}</small></div>`).join("")}
    </div>

    <div class="section">
      <h3>Next Step</h3>
      <p>Review your full scope document, provide feedback, and once approved we'll start building.</p>
      <a href="https://unalabs.cloud/dashboard/${projectId}/scope" class="cta">Review Scope in Unalabs</a>
    </div>

    <div class="footer">
      <p>Questions? Reply to this email or visit <a href="https://unalabs.cloud">unalabs.cloud</a></p>
      <p>© 2026 FTC Holding. Confidential project scope.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Main handler
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }

  try {
    const body = await req.json();
    const { projectId, email, projectName, planType, description } = body;

    if (!projectId || !email) {
      return new Response(
        JSON.stringify({ error: "Missing projectId or email" }),
        { status: 400 }
      );
    }

    console.log(`Generating scope for ${projectName}...`);

    // Generate scope using Claude
    const intake: ProjectIntake = {
      id: projectId,
      email,
      project_name: projectName,
      plan_type: planType || "standard",
      description,
    };

    const scope = await generateScopeFromIntake(intake);

    // Create artifact record
    const summary = `${
      (scope.phases as Array<{ name: string; duration_weeks: number }>)[0]?.name || "Project"
    } — ${
      (scope.effort_estimates as { total_weeks: number }).total_weeks
    } weeks, $${(scope.effort_estimates as { cost_estimate_usd: number }).cost_estimate_usd?.toLocaleString() || "TBD"}`;

    const artifact = await createArtifactRecord(
      projectId,
      "scope_doc",
      scope,
      summary
    );

    console.log(`Artifact created: ${artifact.id}`);

    // Generate and send email
    const clientName = email.split("@")[0];
    const emailHtml = generateEmailHtml(clientName, projectName, scope, projectId);

    await sendScopeEmail(email, projectName, projectId, emailHtml);

    console.log(`Scope email sent to ${email}`);

    return new Response(
      JSON.stringify({
        success: true,
        artifactId: artifact.id,
        scope,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
