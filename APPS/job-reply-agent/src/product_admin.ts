import { fileURLToPath } from "node:url";
import { createProductPool } from "./product_db.js";
import { hashPassword } from "./product_auth.js";
import {
  sendInvitationEmail,
  transactionalEmailConfigured
} from "./product_email.js";
import {
  createProductInvitation,
  updateConnectorCapability
} from "./product_public_beta_repository.js";
import type { ConnectorSource, ConnectorStatus } from "./product_domain.js";

function option(name: string): string {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) || "";
}

async function bootstrapAdmin() {
  const email = option("email").trim().toLowerCase();
  const password = String(process.env.JOB_AGENT_BOOTSTRAP_PASSWORD || "");
  if (!email || !password) {
    throw new Error("Use --email and JOB_AGENT_BOOTSTRAP_PASSWORD to bootstrap an admin.");
  }
  const migrationUrl = String(process.env.MIGRATION_DATABASE_URL || "").trim();
  if (!migrationUrl) throw new Error("MIGRATION_DATABASE_URL is required.");
  const db = createProductPool(migrationUrl);
  try {
    const result = await db.query(
      `INSERT INTO product_users
         (email, password_hash, status, role, email_verified_at)
       VALUES ($1,$2,'onboarding','admin',now())
       ON CONFLICT (email) DO UPDATE SET
         role='admin', email_verified_at=COALESCE(product_users.email_verified_at, now())
       RETURNING id, email, role, email_verified_at AS "emailVerifiedAt"`,
      [email, hashPassword(password)]
    );
    await db.query(
      `INSERT INTO product_onboarding (user_id)
       VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
      [result.rows[0].id]
    );
    console.log(JSON.stringify({
      bootstrapped: true,
      user: result.rows[0],
      next: "Sign in and enable MFA before using operator endpoints."
    }));
  } finally {
    await db.end();
  }
}

async function createInvitation() {
  const email = option("email").trim().toLowerCase();
  const role = (option("role") || "candidate") as "candidate" | "operator" | "admin";
  const createdByEmail = option("created-by").trim().toLowerCase();
  if (!email) throw new Error("--email is required.");
  if (!transactionalEmailConfigured()) {
    throw new Error("Transactional invitation email is not configured; no invitation was created.");
  }
  const db = createProductPool();
  try {
    let createdBy: string | null = null;
    if (createdByEmail) {
      const found = await db.query(
        "SELECT id FROM product_users WHERE email=$1 AND role IN ('operator','admin')",
        [createdByEmail]
      );
      createdBy = found.rows[0]?.id || null;
      if (!createdBy) throw new Error("Creating operator account was not found.");
    }
    const invitation = await createProductInvitation(db, {
      email,
      role,
      createdBy,
      expiresInHours: Number(option("hours") || 72)
    });
    const deliveryId = await sendInvitationEmail(
      invitation.email,
      invitation.token,
      invitation.expiresAt
    );
    const output: Record<string, unknown> = {
      invited: true,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      deliveryId,
      delivered: Boolean(deliveryId)
    };
    if (!deliveryId && process.env.NODE_ENV !== "production") output.token = invitation.token;
    console.log(JSON.stringify(output));
  } finally {
    await db.end();
  }
}

async function certifyConnector() {
  const email = option("email").trim().toLowerCase();
  const source = option("source") as ConnectorSource;
  const status = option("status") as ConnectorStatus;
  const evidence = option("evidence") || null;
  if (!email || !source || !status) {
    throw new Error("--email, --source, and --status are required.");
  }
  const db = createProductPool();
  try {
    const found = await db.query("SELECT id FROM product_users WHERE email=$1", [email]);
    if (!found.rows[0]) throw new Error("Candidate account was not found.");
    await updateConnectorCapability(db, found.rows[0].id, source, status, evidence);
    console.log(JSON.stringify({ updated: true, email, source, status, evidence }));
  } finally {
    await db.end();
  }
}

export async function runProductAdmin(): Promise<void> {
  const command = process.argv[2];
  if (command === "bootstrap-admin") return bootstrapAdmin();
  if (command === "invite") return createInvitation();
  if (command === "connector") return certifyConnector();
  throw new Error("Use bootstrap-admin, invite, or connector.");
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  runProductAdmin().catch((error) => {
    console.error(error instanceof Error ? error.message : "Product admin command failed.");
    process.exitCode = 1;
  });
}
