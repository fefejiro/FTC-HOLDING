#!/usr/bin/env node

import fs from "fs";
import path from "path";
import readline from "readline";
import { Writable } from "stream";
import { fileURLToPath } from "url";

class MutableStdout extends Writable {
  muted = false;

  _write(chunk, encoding, callback) {
    const text = chunk.toString();
    if (this.muted) {
      if (text.includes("\n")) {
        process.stdout.write("\n");
      }
    } else {
      process.stdout.write(text, encoding);
    }
    callback();
  }
}

function parseEnvFile(content) {
  const result = new Map();
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) {
      continue;
    }
    const key = match[1];
    const rawValue = match[2] ?? "";
    result.set(key, decodeEnvValue(rawValue));
  }
  return result;
}

function decodeEnvValue(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    if (trimmed.startsWith('"')) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return trimmed.slice(1, -1);
      }
    }
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function encodeEnvValue(value) {
  if (value === undefined || value === null) {
    return "";
  }
  const stringValue = String(value);
  if (!stringValue) {
    return "";
  }
  if (/^[A-Za-z0-9_./:@-]+$/.test(stringValue)) {
    return stringValue;
  }
  return JSON.stringify(stringValue);
}

const questions = [
  { key: "NODE_ENV", label: "NODE_ENV", defaultValue: "production" },
  { key: "PORT", label: "PORT", defaultValue: "5000" },
  { key: "PUBLIC_BASE_URL", label: "PUBLIC_BASE_URL", defaultValue: "https://api.peacepad.ca" },
  { key: "APP_ORIGINS", label: "APP_ORIGINS (comma-separated)", defaultValue: "https://peacepad.ca" },
  { key: "CORS_ALLOWED_ORIGINS", label: "CORS_ALLOWED_ORIGINS (comma-separated)", defaultValue: "https://peacepad.ca" },
  { key: "CORS_ALLOW_CREDENTIALS", label: "CORS_ALLOW_CREDENTIALS", defaultValue: "true" },

  { key: "SESSION_SECRET", label: "SESSION_SECRET", secret: true },
  { key: "DATABASE_URL", label: "DATABASE_URL", secret: true },
  { key: "DIRECT_URL", label: "DIRECT_URL (optional)", secret: true, defaultValue: "" },

  { key: "OPENAI_BASE_URL", label: "OPENAI_BASE_URL", defaultValue: "https://api.openai.com/v1" },
  { key: "OPENAI_API_KEY", label: "OPENAI_API_KEY", secret: true },
  { key: "VITS_BASE_URL", label: "VITS_BASE_URL" },

  { key: "VAPID_PUBLIC_KEY", label: "VAPID_PUBLIC_KEY" },
  { key: "VAPID_PRIVATE_KEY", label: "VAPID_PRIVATE_KEY", secret: true },
  { key: "VAPID_EMAIL", label: "VAPID_EMAIL", defaultValue: "mailto:support@peacepad.ca" },

  {
    key: "FIREBASE_SERVICE_ACCOUNT_JSON_PATH",
    label: "FIREBASE_SERVICE_ACCOUNT_JSON_PATH (recommended; optional if using inline JSON)",
    defaultValue: "",
  },
  {
    key: "FIREBASE_SERVICE_ACCOUNT_JSON",
    label: "FIREBASE_SERVICE_ACCOUNT_JSON (optional if using *_PATH)",
    secret: true,
    defaultValue: "",
  },

  { key: "MAILJET_API_KEY", label: "MAILJET_API_KEY", secret: true },
  { key: "MAILJET_SECRET_KEY", label: "MAILJET_SECRET_KEY", secret: true },

  { key: "SUPABASE_URL", label: "SUPABASE_URL (optional)", defaultValue: "" },
  { key: "SUPABASE_ANON_KEY", label: "SUPABASE_ANON_KEY (optional)", secret: true, defaultValue: "" },

  { key: "OIDC_CLIENT_ID", label: "OIDC_CLIENT_ID (optional)", defaultValue: "" },
  { key: "OIDC_ISSUER_URL", label: "OIDC_ISSUER_URL (optional)", defaultValue: "https://replit.com/oidc" },

  { key: "VITE_BASE_URL", label: "VITE_BASE_URL", defaultValue: "https://peacepad.ca" },
  { key: "ADMIN_EMAIL", label: "ADMIN_EMAIL", defaultValue: "peacepad@peacepad.ca" },

  { key: "TWILIO_ACCOUNT_SID", label: "TWILIO_ACCOUNT_SID (optional)", defaultValue: "" },
  { key: "TWILIO_AUTH_TOKEN", label: "TWILIO_AUTH_TOKEN (optional)", secret: true, defaultValue: "" },
  { key: "SAFETY_PLAN_MASTER_KEY", label: "SAFETY_PLAN_MASTER_KEY (optional)", secret: true, defaultValue: "" },
  { key: "ONTARIO_211_API_KEY", label: "ONTARIO_211_API_KEY (optional)", secret: true, defaultValue: "" },
  { key: "ALLOW_TEST_SEEDING", label: "ALLOW_TEST_SEEDING", defaultValue: "false" },
  { key: "USE_REAL_AI", label: "USE_REAL_AI", defaultValue: "true" },
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const envPath = path.join(repoRoot, "APPS", "peacepad", ".env");

const existingValues = fs.existsSync(envPath)
  ? parseEnvFile(fs.readFileSync(envPath, "utf8"))
  : new Map();

const mutableStdout = new MutableStdout();
const rl = readline.createInterface({
  input: process.stdin,
  output: mutableStdout,
  terminal: true,
});

function ask(promptText, secret = false) {
  return new Promise((resolve) => {
    if (secret) {
      mutableStdout.muted = true;
      process.stdout.write(promptText);
      rl.question("", (answer) => {
        mutableStdout.muted = false;
        resolve(answer);
      });
      return;
    }

    rl.question(promptText, (answer) => resolve(answer));
  });
}

async function run() {
  process.stdout.write(`\nPeacePad local env setup\n`);
  process.stdout.write(`Target file: ${envPath}\n`);
  process.stdout.write(`Press Enter to keep an existing value where available.\n\n`);

  const output = new Map(existingValues);

  for (const question of questions) {
    const existing = existingValues.get(question.key);
    const hasExisting = typeof existing === "string" && existing.length > 0;
    const fallback = hasExisting ? existing : question.defaultValue ?? "";
    const suffix = hasExisting
      ? " [existing value set]"
      : fallback
        ? ` [default: ${fallback}]`
        : "";
    const promptText = `${question.label}${suffix}: `;

    const answer = (await ask(promptText, Boolean(question.secret))).trim();
    const selected = answer || fallback || "";
    output.set(question.key, selected);
  }

  rl.close();

  const orderedKeys = questions.map((item) => item.key);
  const header = [
    "# Generated by scripts/setup-env.mjs",
    "# Do not commit this file. It is for local/operator use only.",
    "",
  ];

  const lines = orderedKeys.map((key) => `${key}=${encodeEnvValue(output.get(key) ?? "")}`);
  const fileContent = `${header.join("\n")}${lines.join("\n")}\n`;

  fs.writeFileSync(envPath, fileContent, { mode: 0o600 });
  process.stdout.write(`\nWrote ${envPath}\n`);
  process.stdout.write("Secrets were not echoed to the console.\n");
}

run().catch((error) => {
  rl.close();
  console.error("Failed to generate .env:", error.message || error);
  process.exit(1);
});
