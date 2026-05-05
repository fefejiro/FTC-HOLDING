/**
 * Supabase Edge Function: approve-project-scope
 * Trigger: HTTP POST when client clicks "Move to Active" in Unalabs UI
 * Purpose: Validate approval, update project status, trigger build webhook
 * 
 * Deploy: supabase functions deploy approve-project-scope
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const githubToken = Deno.env.get("GITHUB_TOKEN")!;
const githubRepo = "fefejiro/FTC-HOLDING";
const operatorNotificationEmail =
  Deno.env.get("OPERATOR_NOTIFICATION_EMAIL") || "hello@unalabs.cloud";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Trigger GitHub Actions workflow to build scaffold
 */
async function triggerBuildWorkflow(projectId: string, projectName: string, email: string) {
  const response = await fetch(
    `https://api.github.com/repos/${githubRepo}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
      },
      body: JSON.stringify({
        event_type: "client_approved_scope",
        client_payload: {
          project_id: projectId,
          project_name: projectName,
          client_email: email,
          timestamp: new Date().toISOString(),
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to trigger build workflow: ${response.statusText}`
    );
  }

  console.log(`Build workflow triggered for ${projectName}`);
  return response.json();
}

/**
 * Record approval in database
 */
async function recordApproval(
  projectId: string,
  approvedBy: string,
  artifactId: string,
  notes: string
) {
  const { data, error } = await supabase
    .from("project_approvals")
    .insert({
      project_id: projectId,
      approval_type: "scope_approval",
      approved_by: approvedBy,
      artifact_id: artifactId,
      approval_notes: notes,
      status: "approved",
      status_changed_at: new Date().toISOString(),
    })
    .select();

  if (error) {
    console.error("Error recording approval:", error);
    throw error;
  }

  return data?.[0];
}

/**
 * Update project status to Active
 */
async function updateProjectStatus(projectId: string) {
  const { data, error } = await supabase
    .from("projects")
    .update({
      workflow_status: "active",
      active_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .select();

  if (error) {
    console.error("Error updating project status:", error);
    throw error;
  }

  return data?.[0];
}

/**
 * Send confirmation email to client
 */
async function sendApprovalConfirmation(
  projectName: string,
  email: string,
  projectId: string
) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .success { background: #10b981; color: white; padding: 30px; border-radius: 8px; text-align: center; }
    .success h1 { margin: 0; font-size: 28px; }
    .section { margin: 20px 0; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; }
    .footer { font-size: 0.85em; color: #999; border-top: 1px solid #ddd; padding-top: 15px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="success">
      <h1>✓ Scope Approved!</h1>
      <p>Your ${projectName} scope has been approved.</p>
      <p>Building is now starting...</p>
    </div>

    <div class="section">
      <h3>What Happens Next</h3>
      <ol>
        <li>Our team is setting up your project repository</li>
        <li>Initial code scaffold and folder structure will be created</li>
        <li>A GitHub PR will be opened with the initial code</li>
        <li>You will see build progress on your Unalabs dashboard</li>
        <li>Weekly updates will be sent to this email</li>
      </ol>
    </div>

    <div class="section">
      <h3>Track Your Progress</h3>
      <p>Watch your project build in real-time on your Unalabs dashboard.</p>
      <p><a href="https://unalabs.cloud/dashboard/${projectId}/delivery">View Dashboard</a></p>
    </div>

    <div class="footer">
      <p>Questions? Reply to this email. We are here to help!</p>
      <p>© 2026 FTC Holding.</p>
    </div>
  </div>
</body>
</html>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: "Unalabs <noreply@unalabs.cloud>",
      to: email,
      bcc: [operatorNotificationEmail],
      subject: `${projectName} is Now Active — Building Started!`,
      html: htmlBody,
      reply_to: "hello@unalabs.cloud",
    }),
  });

  if (!response.ok) {
    console.error(`Failed to send approval email: ${response.statusText}`);
  }
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
    const { projectId, artifactId, approvedBy, notes } = body;

    if (!projectId || !approvedBy) {
      return new Response(
        JSON.stringify({ error: "Missing projectId or approvedBy" }),
        { status: 400 }
      );
    }

    console.log(`Approving project ${projectId}...`);

    // Fetch project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        { status: 404 }
      );
    }

    // Record approval
    await recordApproval(projectId, approvedBy, artifactId, notes);

    // Update project status to Active
    const updatedProject = await updateProjectStatus(projectId);

    // Trigger build workflow
    await triggerBuildWorkflow(projectId, project.project_name, project.email);

    // Send confirmation email
    await sendApprovalConfirmation(project.project_name, project.email, projectId);

    console.log(`Project ${projectId} moved to Active and build triggered`);

    return new Response(
      JSON.stringify({
        success: true,
        project: updatedProject,
        message: "Scope approved, project moved to Active, build triggered",
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
