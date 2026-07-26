import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function deletionMethod(): string {
  const storage = readSource("../../server/storage.ts");
  const start = storage.indexOf("async deleteUser(userId: string)");
  const end = storage.indexOf("async exportUserData(userId: string)", start);

  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return storage.slice(start, end);
}

function statementsFor(method: string, operation: "DELETE FROM" | "UPDATE", table: string): string[] {
  const expression = new RegExp(
    operation + "\\s+" + table + "\\b[\\s\\S]*?(?=`\\);|`\\s*\\))",
    "gi",
  );
  return Array.from(method.matchAll(expression), (match) => match[0]);
}

describe("account deletion cross-user safety", () => {
  it("covers the user-owned tables present in the checked-in production schema", () => {
    const method = deletionMethod();
    const schema = readSource("../../shared/schema.ts");
    const migration = readSource("../../migrations/0000_prod_schema_init.sql");
    const accountOnlyOrAnonymizedTables = [
      "guest_sessions",
      "guest_session_data",
      "mobile_auth_tokens",
      "usage_metrics",
      "push_subscriptions",
      "audit_logs",
      "contacts",
      "messages",
      "tasks",
      "children",
      "events",
      "schedule_templates",
      "expenses",
      "storybooks",
      "story_pages",
      "shopping_lists",
      "shopping_items",
      "feedback",
      "safety_plans",
      "listening_settings",
      "agent_settings",
      "prep_chat_sessions",
    ];

    for (const table of accountOnlyOrAnonymizedTables) {
      expect(schema, `${table} must remain represented in the Drizzle schema`).toMatch(
        new RegExp(`pgTable\\(\\s*"${table}"`, "i"),
      );
      expect(
        migration,
        `${table} must remain represented in the production baseline migration`,
      ).toMatch(new RegExp(`CREATE TABLE\\s+"${table}"`, "i"));
      expect(method, `${table} must have an explicit deletion/anonymization decision`).toMatch(
        new RegExp(`(?:DELETE FROM|UPDATE)\\s+${table}\\b`, "i"),
      );
    }

    // These tables are always partnership-shared in the current schema. Their
    // explicit decision is preservation under the anonymized tombstone.
    for (const table of ["notes", "child_updates", "pets"]) {
      expect(schema).toMatch(new RegExp(`pgTable\\(\\s*"${table}"`, "i"));
      expect(migration).toMatch(new RegExp(`CREATE TABLE\\s+"${table}"`, "i"));
      expect(method).not.toMatch(
        new RegExp(`DELETE FROM\\s+${table}\\b[\\s\\S]*?partnership_id\\s+IN`, "i"),
      );
    }
  });

  it("does not erase a surviving co-parent's partnership-scoped records", () => {
    const method = deletionMethod();
    const jointlyScopedTables = [
      "conch_sessions",
      "storybooks",
      "shopping_lists",
      "settlements",
      "expense_participants",
      "expenses",
      "partnership_balances",
      "notes",
      "tasks",
      "child_updates",
      "children",
      "pets",
      "scheduled_calls",
      "calls",
      "call_sessions_v2",
      "user_stats",
      "streaks",
      "user_achievements",
    ];

    for (const table of jointlyScopedTables) {
      for (const statement of statementsFor(method, "DELETE FROM", table)) {
        expect(
          statement,
          `${table} must not be deleted solely because it belongs to a shared partnership`,
        ).not.toMatch(/partnership_id\s+IN/i);
      }
    }

    expect(method).not.toMatch(
      /DELETE FROM partnerships[\s\S]*?WHERE\s+id\s+IN\s*\(\$\{partnershipIds\}\)/i,
    );
  });

  it("purges jointly derived AI/profile rows that cannot be separated safely", () => {
    const method = deletionMethod();
    const privacyPurgedTables = [
      "message_summaries",
      "relationship_memories",
      "conflict_patterns",
      "agent_interventions",
    ];

    for (const table of privacyPurgedTables) {
      expect(
        method,
        `${table} should not survive as a relationship profile after either participant deletes`,
      ).toMatch(
        new RegExp(
          `DELETE FROM\\s+${table}\\s+WHERE\\s+partnership_id\\s+IN\\s*\\(\\$\\{partnershipIds\\}\\)`,
          "i",
        ),
      );
    }
  });

  it("anonymizes shared relationship fields and closes live communication state", () => {
    const method = deletionMethod();

    expect(method).toMatch(
      /UPDATE partnerships[\s\S]*?allow_audio = false[\s\S]*?allow_ai_tone = false/i,
    );
    expect(method).toMatch(
      /user1_personality_confirmed[\s\S]*?user1_id = \$\{userId\} THEN NULL/i,
    );
    expect(method).toMatch(
      /user1_personality_guess\s*=\s*NULL[\s\S]*?user2_personality_guess\s*=\s*NULL/i,
    );
    expect(method).toMatch(
      /UPDATE settlements[\s\S]*?payment_link = NULL[\s\S]*?payer_id = \$\{userId\} OR receiver_id = \$\{userId\}/i,
    );
    expect(method).toMatch(
      /UPDATE calls[\s\S]*?status = 'ended'[\s\S]*?caller_id = \$\{userId\} OR receiver_id = \$\{userId\}/i,
    );
    expect(method).toMatch(
      /UPDATE scheduled_calls[\s\S]*?status = 'cancelled'[\s\S]*?reminder_sent = true/i,
    );
    expect(method).toMatch(
      /UPDATE call_sessions_v2[\s\S]*?status = 'ended'[\s\S]*?end_reason = COALESCE\(end_reason, 'account_deleted'\)/i,
    );
  });

  it("preserves shared parent containers instead of triggering child-row cascades", () => {
    const method = deletionMethod();
    const schema = readSource("../../shared/schema.ts");

    // Both relationships intentionally cascade when a container is removed.
    // A deletion implementation must therefore preserve the shared container,
    // otherwise partner-authored child rows disappear as collateral damage.
    expect(schema).toMatch(
      /storyId:[\s\S]*?references\(\(\) => storybooks\.id,\s*\{\s*onDelete:\s*['"]cascade['"]\s*\}\)/i,
    );
    expect(schema).toMatch(
      /listId:[\s\S]*?references\(\(\) => shoppingLists\.id,\s*\{\s*onDelete:\s*['"]cascade['"]\s*\}\)/i,
    );

    expect(method).not.toMatch(/DELETE FROM storybooks\b/i);
    expect(method).not.toMatch(/DELETE FROM shopping_lists\b/i);
    expect(method).not.toMatch(/DELETE FROM story_pages\b/i);
    expect(method).not.toMatch(/DELETE FROM shopping_items\b/i);
    expect(method).toMatch(
      /UPDATE storybooks[\s\S]*?SET[\s\S]*?cover_image_url = NULL[\s\S]*?WHERE created_by = \$\{userId\}/i,
    );
    expect(method).toMatch(
      /UPDATE story_pages[\s\S]*?SET image_url = NULL[\s\S]*?WHERE created_by = \$\{userId\}/i,
    );
    expect(method).toMatch(
      /UPDATE shopping_lists[\s\S]*?updated_at = NOW\(\)[\s\S]*?WHERE created_by = \$\{userId\}/i,
    );
    expect(method).toMatch(
      /UPDATE shopping_items[\s\S]*?SET checked_by = NULL[\s\S]*?WHERE checked_by = \$\{userId\}/i,
    );
  });

  it("deletes only orphan drafts and preserves shared conversation history", () => {
    const method = deletionMethod();
    const messageDeletes = statementsFor(method, "DELETE FROM", "messages");

    expect(messageDeletes.length).toBeGreaterThan(0);
    for (const statement of messageDeletes) {
      expect(statement).not.toMatch(/recipient_id\s*=\s*\$\{userId\}/i);
      expect(statement).not.toMatch(/conversation_id\s+IN/i);
    }

    expect(method).not.toMatch(
      /DELETE FROM conversations[\s\S]*?WHERE\s+id\s+IN\s*\(\$\{conversationIds\}\)/i,
    );
    expect(method).toMatch(
      /DELETE FROM conversation_members\s+WHERE user_id = \$\{userId\}/i,
    );
  });

  it("scrubs a retained tombstone and never presents it as a reversible deactivation", () => {
    const method = deletionMethod();
    const routes = readSource("../../server/routes.ts");
    const softAuth = readSource("../../server/softAuth.ts");
    const client = readSource("../../client/src/pages/delete-account.tsx");

    expect(method).toMatch(/UPDATE users[\s\S]*?is_deactivated\s*=\s*TRUE/i);
    expect(method).toMatch(/deleted_at\s*=\s*NOW\(\)/i);
    expect(method).toMatch(/email\s*=\s*NULL/i);
    expect(method).toMatch(/first_name\s*=\s*NULL/i);
    expect(method).toMatch(/last_name\s*=\s*NULL/i);
    expect(method).toMatch(/profile_image_url\s*=\s*NULL/i);
    expect(method).toMatch(/phone_number\s*=\s*NULL/i);
    expect(method).toMatch(/invite_code\s*=\s*NULL/i);
    expect(method).toMatch(/privacy_accepted\s*=\s*FALSE/i);
    expect(method).toMatch(/ai_message_consent\s*=\s*FALSE/i);
    expect(method).toMatch(/ai_call_consent\s*=\s*FALSE/i);

    expect(routes).not.toMatch(/reactivateUser|deactivateUser|30[- ]day|grace period/i);
    expect(softAuth).not.toMatch(/reactivateUser/);
    expect(client).not.toMatch(/deactivat|30[- ]day|grace period/i);
  });

  it("invalidates every supported token and session form", () => {
    const method = deletionMethod();
    const routes = readSource("../../server/routes.ts");

    expect(method).toMatch(/DELETE FROM mobile_auth_tokens WHERE user_id = \$\{userId\}/i);
    expect(method).toMatch(/DELETE FROM push_subscriptions WHERE user_id = \$\{userId\}/i);
    expect(method).toMatch(
      /DELETE FROM guest_session_data[\s\S]*?SELECT session_id FROM guest_sessions[\s\S]*?user_id = \$\{userId\}[\s\S]*?upgraded_to_user_id = \$\{userId\}/i,
    );
    expect(method).toMatch(
      /DELETE FROM guest_sessions[\s\S]*?user_id = \$\{userId\}[\s\S]*?upgraded_to_user_id = \$\{userId\}/i,
    );
    expect(method).toMatch(/DELETE FROM usage_metrics WHERE user_id = \$\{userId\}/i);
    expect(method).toMatch(
      /DELETE FROM sessions[\s\S]*?sess ->> 'userId' = \$\{userId\}[\s\S]*?passport,user,claims,sub/i,
    );

    expect(routes).toContain("clearGuestCookie(req, res)");
    expect(routes).toContain('res.clearCookie("peacepad.sid"');
    expect(routes).toContain('res.clearCookie("connect.sid"');
    expect(routes).toContain("req.session.destroy");
  });

  it("never treats a full user export as an ownership-safe upload manifest", () => {
    const routes = readSource("../../server/routes.ts");
    const deletionRoute = routes.slice(
      routes.indexOf('app.delete("/api/user/account"'),
      routes.indexOf('app.post("/api/users/accept-terms"'),
    );

    // exportUserData intentionally includes received messages and related
    // shared story records. Recursively scanning the entire export would let
    // one account deletion unlink the surviving co-parent's files.
    expect(deletionRoute).not.toMatch(
      /collectUserOwnedUploadPaths\(\s*exportSnapshot\s*\)/,
    );
  });

  it("keeps reviewer deletion final at sign-in and out of normal startup", () => {
    const softAuth = readSource("../../server/softAuth.ts");
    const storage = readSource("../../server/storage.ts");
    const reviewerSeed = readSource("../../server/seedReviewerAccount.ts");
    const packageJson = readSource("../../package.json");
    const reviewerRoute = softAuth.slice(
      softAuth.indexOf('"/api/auth/reviewer-session"'),
      softAuth.indexOf('app.get("/api/auth/me"'),
    );

    expect(reviewerRoute).toContain("storage.getUser(config.userId)");
    expect(reviewerRoute).not.toContain("storage.upsertUser");
    expect(reviewerRoute).toMatch(/user\.isDeactivated/);
    expect(reviewerRoute).toMatch(/user\.deletedAt/);
    expect(reviewerSeed).toContain("storage.upsertUser");
    expect(storage).toMatch(
      /existingUser\?\.(?:isDeactivated|deletedAt)[\s\S]*?Deleted accounts cannot be updated or reactivated/i,
    );

    const scripts = JSON.parse(packageJson).scripts as Record<string, string>;
    expect(scripts.start).not.toMatch(/seedReviewerAccount|seed:reviewer-account/);
    expect(scripts.build).not.toMatch(/seedReviewerAccount|seed:reviewer-account/);
  });
});
