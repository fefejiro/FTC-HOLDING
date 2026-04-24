import { createClient } from "@supabase/supabase-js";

function normalizeText(value = "") {
  return String(value || "").trim();
}

function getSupabaseConfig() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";
  const anonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.ATEAM_SUPABASE_SERVICE_ROLE_KEY ||
    "";

  if (!url) {
    throw new Error("supabase_url_missing");
  }

  if (!anonKey && !serviceRoleKey) {
    throw new Error("supabase_key_missing");
  }

  return { url, anonKey, serviceRoleKey };
}

function createSupabaseClient({ privileged = false, accessToken = "" } = {}) {
  const { url, anonKey, serviceRoleKey } = getSupabaseConfig();
  const key = privileged ? serviceRoleKey || anonKey : anonKey || serviceRoleKey;
  const globalHeaders = accessToken
    ? {
        Authorization: `Bearer ${accessToken}`
      }
    : undefined;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: globalHeaders ? { headers: globalHeaders } : undefined
  });
}

function extractJson(text = "") {
  const raw = String(text || "").trim();
  if (!raw) throw new Error("llm_empty_reply");
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] || raw;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  const slice = firstBrace >= 0 && lastBrace >= firstBrace ? candidate.slice(firstBrace, lastBrace + 1) : candidate;
  return JSON.parse(slice);
}

async function openAiJson({ systemPrompt, userPrompt, maxOutputTokens = 400 }) {
  const apiKey = process.env.OPENAI_API_KEY || "";
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  if (!apiKey) throw new Error("openai_api_key_missing");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      max_output_tokens: maxOutputTokens,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: systemPrompt }]
        },
        {
          role: "user",
          content: [{ type: "input_text", text: userPrompt }]
        }
      ]
    })
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`openai_request_failed:${response.status}:${details}`);
  }

  const payload = await response.json();
  const directText = typeof payload?.output_text === "string" ? payload.output_text.trim() : "";
  if (directText) {
    return extractJson(directText);
  }

  const output = Array.isArray(payload?.output) ? payload.output : [];
  const combined = output
    .flatMap((item) => (Array.isArray(item?.content) ? item.content : []))
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("\n")
    .trim();

  return extractJson(combined);
}

function appendNotes(existingNotes = "", additions = []) {
  const existing = normalizeText(existingNotes);
  const lines = additions.map((item) => normalizeText(item)).filter(Boolean);
  if (!existing) return lines.join("\n");
  if (!lines.length) return existing;
  return `${existing}\n${lines.join("\n")}`;
}

function buildTierPrompt({ description, budgetRange, timeline }) {
  return [
    `Description: ${normalizeText(description) || "n/a"}`,
    `Budget range: ${normalizeText(budgetRange) || "n/a"}`,
    `Timeline: ${normalizeText(timeline) || "n/a"}`
  ].join("\n");
}

function normalizeTier(value = "") {
  const tier = normalizeText(value).toUpperCase();
  return ["T0", "T1", "T2"].includes(tier) ? tier : "unknown";
}

function formatDate(date = new Date()) {
  return date.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

export function createProjectAutomationService() {
  async function classifyProjectTier({ projectId, description, budgetRange, timeline, accessToken = "" }) {
    if (!normalizeText(description)) {
      throw new Error("description_required");
    }

    const result = await openAiJson({
      systemPrompt:
        "You are a project classifier for Una Labs, a solo-founder software studio. Classify incoming projects into one of three tiers based on the description and budget. T0 - Showcase: static page, no backend, no auth, no database. Budget typically under $2000. T1 - Interactive: static site with lead capture, quote forms, or contact APIs. No persistent auth. Budget $2000-5000. T2 - Platform: requires auth, database, background jobs, or a dedicated backend server. Budget over $5000. Reply with JSON only: { tier: 'T0'|'T1'|'T2', reason: string, suggested_price: string }",
      userPrompt: buildTierPrompt({ description, budgetRange, timeline })
    });

    const classification = {
      tier: normalizeTier(result?.tier),
      reason: normalizeText(result?.reason),
      suggested_price: normalizeText(result?.suggested_price)
    };

    let persisted = false;
    if (projectId) {
      const updateClient = createSupabaseClient({ privileged: true, accessToken });
      const readClient = createSupabaseClient({ privileged: Boolean(accessToken), accessToken });
      const { data: existingProject } = await readClient
        .from("projects")
        .select("notes")
        .eq("id", projectId)
        .single();

      const { error } = await updateClient
        .from("projects")
        .update({
          tier: classification.tier,
          notes: appendNotes(existingProject?.notes, [
            `Tier reason: ${classification.reason}`,
            `Suggested price: ${classification.suggested_price}`
          ])
        })
        .eq("id", projectId);

      if (!error) persisted = true;
    }

    return { classification, persisted };
  }

  async function generateHandoverDoc({ projectId, accessToken = "" }) {
    if (!normalizeText(projectId)) {
      throw new Error("project_id_required");
    }

    const client = createSupabaseClient({ privileged: true, accessToken });
    const { data: project, error } = await client
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (error || !project) {
      throw new Error("project_not_found");
    }

    const delivered = formatDate(new Date());
    const handoverDoc = [
      "UNA LABS - PROJECT HANDOVER",
      `${project.client_name || project.client_email || project.id}  |  Delivered: ${delivered}`,
      "-------------------------------------------",
      "",
      "WHAT'S LIVE",
      `  URL:           ${normalizeText(project.live_url) || "Not yet marked live"}`,
      "  Hosted on:     Cloudflare Pages",
      `  Last deploy:   ${delivered}`,
      "",
      "YOUR DOMAIN",
      `  Domain:        ${normalizeText(project.domain) || "Client domain not set"}`,
      "  Nameservers:   Cloudflare - do not change these",
      "  Renewal:       You are responsible for renewing your domain",
      "",
      "HOW TO REQUEST CHANGES",
      "  Portal:        https://unalabs.cloud/portal",
      "  Response time: 1-3 business days",
      "",
      "HOW CONTENT IS UPDATED",
      "  Changes are made in GitHub and auto-deploy to Cloudflare Pages.",
      "  Submit requests via the portal above.",
      "",
      "WHAT UNA LABS MAINTAINS",
      "  - Hosting (Cloudflare Pages) - no cost to you",
      "  - Code repository (GitHub)",
      "  - Lead capture APIs",
      "  - DNS management",
      "",
      "WHAT YOU OWN",
      "  - Your domain registration",
      "  - Your email accounts",
      "  - Your lead data (export available on request)",
      "",
      "CONTACTS",
      "  Technical:     mike.fejiro@gmail.com",
      "  Portal:        https://unalabs.cloud/portal",
      "-------------------------------------------"
    ].join("\n");

    const { error: updateError } = await client
      .from("projects")
      .update({ handover_doc: handoverDoc })
      .eq("id", projectId);

    if (updateError) {
      throw new Error(`handover_save_failed:${updateError.message || updateError}`);
    }

    return { handover_doc: handoverDoc, project };
  }

  return {
    classifyProjectTier,
    generateHandoverDoc
  };
}