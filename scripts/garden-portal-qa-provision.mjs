import { createClient } from "@supabase/supabase-js";

const env = process.env;

const supabaseUrl =
  env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const qaPassword = env.GARDEN_QA_PASSWORD;

const accounts = {
  customer: {
    email: env.GARDEN_QA_CUSTOMER_EMAIL || "garden.customer.qa@unalabs.cloud",
    role: "customer",
  },
  staff: {
    email: env.GARDEN_QA_STAFF_EMAIL || "garden.staff.qa@gardencleaners.ca",
    role: "staff",
  },
  admin: {
    email: env.GARDEN_QA_ADMIN_EMAIL || "hello@unalabs.cloud",
    role: "admin",
  },
};

const seedTag = env.GARDEN_QA_SEED_TAG || "garden-portal-qa-2026-04-29";
const dryRun = process.argv.includes("--dry-run");

function assertConfig() {
  if (dryRun) {
    return;
  }

  const missing = [];
  if (!supabaseUrl) missing.push("SUPABASE_URL");
  if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!qaPassword) missing.push("GARDEN_QA_PASSWORD");

  if (missing.length > 0) {
    console.error("Missing required environment variables:");
    for (const name of missing) console.error(`- ${name}`);
    console.error("");
    console.error("Set them in the current shell only, then rerun:");
    console.error('  $env:SUPABASE_URL="https://<project-ref>.supabase.co"');
    console.error('  $env:SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"');
    console.error('  $env:GARDEN_QA_PASSWORD="<temporary-qa-password>"');
    process.exit(1);
  }
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

async function findUserByEmail(supabase, email) {
  const target = normalizeEmail(email);
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 100,
    });

    if (error) throw error;

    const found = data.users.find((user) => normalizeEmail(user.email || "") === target);
    if (found) return found;
    if (data.users.length < 100) return null;
    page += 1;
  }
}

async function upsertAuthUser(supabase, account) {
  const email = normalizeEmail(account.email);
  const userMetadata = {
    garden_portal_qa: true,
    garden_portal_role: account.role,
    seed_tag: seedTag,
  };

  if (dryRun) {
    console.log(`[dry-run] Would create/update Auth user: ${email} (${account.role})`);
    return { id: "dry-run", email };
  }

  const existing = await findUserByEmail(supabase, email);
  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: qaPassword,
      email_confirm: true,
      user_metadata: {
        ...(existing.user_metadata || {}),
        ...userMetadata,
      },
    });

    if (error) throw error;
    console.log(`Updated Auth user: ${email} (${account.role})`);
    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: qaPassword,
    email_confirm: true,
    user_metadata: userMetadata,
  });

  if (error) throw error;
  console.log(`Created Auth user: ${email} (${account.role})`);
  return data.user;
}

async function upsertGardenQuote(supabase) {
  const customerEmail = normalizeEmail(accounts.customer.email);
  const quote = {
    name: "Garden Portal QA Customer",
    email: customerEmail,
    phone: "+1 289 200 0631",
    address: "123 QA Street",
    city: "Oshawa",
    region: "Oshawa",
    postal_code: "L1H 1A1",
    property_type: "Residential home",
    service_type: "Standard cleaning",
    service_frequency: "One-time",
    preferred_date: "2026-05-05",
    preferred_time: "Morning",
    message: "QA seed quote for Garden Cleaners credentialed portal testing.",
    status: "triaged",
    source: "garden_portal_qa_provision",
    raw_payload: {
      seed_tag: seedTag,
      staff_email: normalizeEmail(accounts.staff.email),
      admin_email: normalizeEmail(accounts.admin.email),
      created_by: "scripts/garden-portal-qa-provision.mjs",
    },
  };

  if (dryRun) {
    console.log(`[dry-run] Would upsert garden_cleaners_quotes row for ${customerEmail}`);
    return null;
  }

  const { data: existing, error: selectError } = await supabase
    .from("garden_cleaners_quotes")
    .select("id")
    .eq("email", customerEmail)
    .eq("source", quote.source)
    .limit(1);

  if (selectError) throw selectError;

  if (existing.length > 0) {
    const { data, error } = await supabase
      .from("garden_cleaners_quotes")
      .update(quote)
      .eq("id", existing[0].id)
      .select("id")
      .single();

    if (error) throw error;
    console.log(`Updated garden_cleaners_quotes seed row: ${data.id}`);
    return data;
  }

  const { data, error } = await supabase
    .from("garden_cleaners_quotes")
    .insert(quote)
    .select("id")
    .single();

  if (error) throw error;
  console.log(`Created garden_cleaners_quotes seed row: ${data.id}`);
  return data;
}

async function upsertPortalProject(supabase) {
  const customerEmail = normalizeEmail(accounts.customer.email);
  const project = {
    email: customerEmail,
    name: "Garden Cleaners QA Portal Seed - Oshawa",
    status: "scheduled",
    description:
      "Garden Cleaners QA portal seed. Service: standard cleaning. Region: Oshawa. Owner: " +
      normalizeEmail(accounts.staff.email),
    service_region: "Oshawa",
    assigned_owner: normalizeEmail(accounts.staff.email),
  };

  if (dryRun) {
    console.log(`[dry-run] Would upsert projects row for ${customerEmail}`);
    return null;
  }

  const { data: existing, error: selectError } = await supabase
    .from("projects")
    .select("id")
    .eq("email", customerEmail)
    .eq("name", project.name)
    .limit(1);

  if (selectError) throw selectError;

  if (existing.length > 0) {
    const { data, error } = await supabase
      .from("projects")
      .update(project)
      .eq("id", existing[0].id)
      .select("id")
      .single();

    if (error) throw error;
    console.log(`Updated projects seed row: ${data.id}`);
    return data;
  }

  const { data, error } = await supabase
    .from("projects")
    .insert(project)
    .select("id")
    .single();

  if (error) throw error;
  console.log(`Created projects seed row: ${data.id}`);
  return data;
}

async function main() {
  assertConfig();

  const supabase = dryRun
    ? null
    : createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

  console.log(`Garden portal QA provisioning ${dryRun ? "(dry run)" : "(live)"}`);
  console.log(`Seed tag: ${seedTag}`);

  for (const account of Object.values(accounts)) {
    await upsertAuthUser(supabase, account);
  }

  await upsertGardenQuote(supabase);
  await upsertPortalProject(supabase);

  console.log("");
  console.log("Provisioning complete. Password was read from GARDEN_QA_PASSWORD and was not written to disk.");
  console.log("Credentialed QA can use:");
  for (const account of Object.values(accounts)) {
    console.log(`- ${account.role}: ${normalizeEmail(account.email)}`);
  }
}

main().catch((error) => {
  console.error("");
  console.error("Garden portal QA provisioning failed:");
  console.error(error.message || error);
  process.exit(1);
});
