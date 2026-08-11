import { randomBytes } from "node:crypto";
import fs from "node:fs";
import process from "node:process";

const projects = Object.freeze({
  ca: { ref: "rohvkyuxbnqzglaromms", functionRegion: "ca-central-1" },
  us: { ref: "spmpndalcvwmygznihec", functionRegion: "us-east-1" },
});

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
};

const action = required("PEACEPAD_FIXTURE_ACTION");
const region = required("PEACEPAD_REGION");
const projectRef = required("PEACEPAD_PROJECT_REF");
const publishableKey = required("SUPABASE_PUBLISHABLE_KEY");
const serviceRoleKey = required("SUPABASE_SERVICE_ROLE_KEY");
const fixturePath = required("PEACEPAD_FIXTURE_PATH");
const evidencePath = required("PEACEPAD_FIXTURE_EVIDENCE_PATH");

if (!(region in projects) || projects[region].ref !== projectRef) {
  throw new Error(
    "The requested project is not an approved PeacePad fictional-staging target.",
  );
}
if (!publishableKey.startsWith("sb_publishable_")) {
  throw new Error("The current regional Supabase publishable key is required.");
}
if (serviceRoleKey.split(".").length !== 3) {
  throw new Error("A temporary Supabase service-role JWT is required.");
}
if (
  !fixturePath.startsWith(process.env.RUNNER_TEMP ?? "") ||
  !evidencePath.startsWith(process.env.RUNNER_TEMP ?? "")
) {
  throw new Error(
    "Fixture and evidence files must remain inside the runner temporary directory.",
  );
}

const origin = `https://${projectRef}.supabase.co`;
const apiOrigin = `${origin}/functions/v1/peacepad-v2-api`;
const functionRegion = projects[region].functionRegion;
const runNonce = randomBytes(8).toString("hex");

const writePrivateJson = (path, value) => {
  fs.writeFileSync(path, `${JSON.stringify(value)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  fs.chmodSync(path, 0o600);
};

const writeEvidence = (value) => {
  fs.writeFileSync(evidencePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const safeError = async (response, label) => {
  const payload = await response.json().catch(() => null);
  const detail =
    payload?.error && typeof payload.error === "object"
      ? payload.error
      : payload;
  const code = typeof detail?.code === "string" ? detail.code : "UNSPECIFIED";
  throw new Error(`${label} failed with HTTP ${response.status} (${code}).`);
};

const requestJson = async (url, init, expected, label) => {
  const response = await fetch(url, init);
  if (!expected.includes(response.status)) await safeError(response, label);
  const payload = await response.json().catch(() => null);
  return { status: response.status, payload };
};

const adminHeaders = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  "Content-Type": "application/json",
};

const authHeaders = {
  apikey: publishableKey,
  Authorization: `Bearer ${publishableKey}`,
  "Content-Type": "application/json",
};

const signIn = async (account, password) => {
  const { payload } = await requestJson(
    `${origin}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ email: account.email, password }),
    },
    [200],
    "Sign in fictional Auth user",
  );
  if (
    typeof payload?.access_token !== "string" ||
    payload?.user?.id !== account.id
  ) {
    throw new Error("Auth sign-in returned an invalid session receipt.");
  }
  return payload.access_token;
};

const api = async (
  token,
  path,
  { method = "GET", body, key, version, expected = [200] } = {},
) => {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "X-Region": functionRegion,
    "X-PeacePad-Region": region,
    "X-PeacePad-Schema-Version": "2.0",
  };
  if (key) headers["Idempotency-Key"] = `sim-${runNonce}-${key}`;
  if (version !== undefined) headers["If-Match"] = String(version);
  return requestJson(
    `${apiOrigin}${path}`,
    {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    expected,
    `${method} ${path}`,
  );
};

const write = (token, path, body, key, version, expected = [200, 201]) =>
  api(token, path, { method: "POST", body, key, version, expected });

const deleteAuthUser = async (account) => {
  if (!account.id) return;
  await requestJson(
    `${origin}/auth/v1/admin/users/${encodeURIComponent(account.id)}`,
    {
      method: "DELETE",
      headers: adminHeaders,
    },
    [200, 404],
    "Delete fallback fictional Auth user",
  );
};

const removeApplicationIdentity = async (account, password, key) => {
  const token = await signIn(account, password);
  const session = await api(token, "/api/v2/session");
  const version = session.payload?.actor?.version;
  if (
    session.payload?.actor?.identityId !== account.id ||
    !Number.isInteger(version)
  ) {
    throw new Error("Cleanup session receipt was invalid.");
  }
  const deleted = await api(token, "/api/v2/account", {
    method: "DELETE",
    key,
    version,
    expected: [200],
  });
  if (
    deleted.payload?.status !== "deleted" ||
    deleted.payload?.identityId !== account.id
  ) {
    throw new Error("Application identity cleanup receipt was invalid.");
  }
};

const cleanupAccounts = async (state, strictApplicationCleanup) => {
  const failures = [];
  let applicationAccountsDeleted = 0;
  let authUsersDeleted = 0;
  for (const [index, account] of state.accounts.entries()) {
    if (account.id && strictApplicationCleanup) {
      try {
        await removeApplicationIdentity(
          account,
          state.password,
          `cleanup-${index}`,
        );
        applicationAccountsDeleted += 1;
      } catch (error) {
        failures.push(
          error instanceof Error
            ? error.message
            : "Application cleanup failed.",
        );
      }
    }
    if (account.id) {
      try {
        await deleteAuthUser(account);
        authUsersDeleted += 1;
      } catch (error) {
        failures.push(
          error instanceof Error ? error.message : "Auth cleanup failed.",
        );
      }
    }
  }
  return { applicationAccountsDeleted, authUsersDeleted, failures };
};

const provision = async () => {
  const runLabel = `${process.env.GITHUB_RUN_ID ?? "local"}-${process.env.GITHUB_RUN_ATTEMPT ?? "0"}-${runNonce}`;
  const password = `Pp2!${randomBytes(24).toString("base64url")}`;
  const state = {
    classification: "fictional-only",
    projectRef,
    region,
    password,
    familyName: `Fictional Simulator Family ${runNonce}`,
    calendarLayerName: `Fictional Parenting Time ${runNonce}`,
    messageText: `Fictional ${region.toUpperCase()} pickup confirmed ${runNonce}`,
    eventTitle: `Fictional ${region.toUpperCase()} family event ${runNonce}`,
    accounts: [
      {
        email: `peacepad-sim-${region}-${runLabel}-a@example.test`,
        displayName: "Alex Fictional",
        id: null,
      },
      {
        email: `peacepad-sim-${region}-${runLabel}-b@example.test`,
        displayName: "Jordan Fictional",
        id: null,
      },
    ],
  };
  writePrivateJson(fixturePath, state);

  try {
    for (const account of state.accounts) {
      const { payload } = await requestJson(
        `${origin}/auth/v1/admin/users`,
        {
          method: "POST",
          headers: adminHeaders,
          body: JSON.stringify({
            email: account.email,
            password,
            email_confirm: true,
            user_metadata: {
              display_name: account.displayName,
              data_classification: "fictional-only",
            },
          }),
        },
        [200, 201],
        "Create fictional Auth user",
      );
      if (typeof payload?.id !== "string")
        throw new Error("Auth user creation returned an invalid receipt.");
      account.id = payload.id;
      writePrivateJson(fixturePath, state);
    }

    const tokens = [];
    for (const [index, account] of state.accounts.entries()) {
      const token = await signIn(account, password);
      tokens.push(token);
      const { payload } = await write(
        token,
        "/api/v2/session/bootstrap",
        { displayName: account.displayName },
        `bootstrap-${index}`,
      );
      if (payload?.identityId !== account.id || payload?.region !== region) {
        throw new Error("Identity bootstrap receipt was invalid.");
      }
    }

    const family = await write(
      tokens[0],
      "/api/v2/families",
      { familyName: state.familyName },
      "family-create",
    );
    const familyId = family.payload?.familyId;
    if (typeof familyId !== "string")
      throw new Error("Family creation receipt was invalid.");

    const invitation = await write(
      tokens[0],
      "/api/v2/invitations",
      {
        familyCircleId: familyId,
        invitedRole: "parent",
        permissions: ["messages", "calendar", "shared-records", "calls"],
        expiresInHours: 24,
      },
      "invitation-create",
    );
    const invitationId = invitation.payload?.invitation?.id;
    const invitationCode = invitation.payload?.code;
    if (
      typeof invitationId !== "string" ||
      !/^[A-Z0-9]{6}$/.test(invitationCode ?? "")
    ) {
      throw new Error("Invitation creation receipt was invalid.");
    }
    const preview = await api(tokens[1], "/api/v2/invitations/resolve", {
      method: "POST",
      body: { code: invitationCode },
    });
    if (
      preview.payload?.invitationId !== invitationId ||
      !Number.isInteger(preview.payload?.version)
    ) {
      throw new Error("Invitation preview receipt was invalid.");
    }
    const accepted = await write(
      tokens[1],
      `/api/v2/invitations/${encodeURIComponent(invitationId)}/accept`,
      {},
      "invitation-accept",
      preview.payload.version,
      [200],
    );
    if (
      accepted.payload?.grant?.familyCircleId !== familyId ||
      typeof accepted.payload?.conversation?.id !== "string"
    ) {
      throw new Error("Invitation acceptance receipt was invalid.");
    }

    const calendarLayer = await write(
      tokens[0],
      "/api/v2/calendar-layers",
      {
        familyCircleId: familyId,
        ownerIdentityId: state.accounts[0].id,
        name: state.calendarLayerName,
        kind: "parenting-time",
        icon: "calendar",
        colorToken: "teal",
        visibility: { scope: "family" },
      },
      "calendar-layer-create",
    );
    if (
      typeof calendarLayer.payload?.id !== "string" ||
      calendarLayer.payload?.familyCircleId !== familyId ||
      calendarLayer.payload?.name !== state.calendarLayerName ||
      calendarLayer.payload?.visibility?.scope !== "family"
    ) {
      throw new Error("Shared calendar layer creation receipt was invalid.");
    }

    writePrivateJson(fixturePath, state);
    writeEvidence({
      result: "FICTIONAL_SIMULATOR_FIXTURE_PROVISIONED",
      classification: "fictional-only",
      projectRef,
      region,
      fixtureDomain: "example.test",
      accountCount: 2,
      familyPrepared: true,
      sharedCalendarLayerPrepared: true,
      credentialsPersistedOutsideRunnerTemp: false,
      productionContacted: false,
    });
  } catch (error) {
    const cleanup = await cleanupAccounts(state, true);
    if (cleanup.failures.length === 0 && fs.existsSync(fixturePath))
      fs.rmSync(fixturePath, { force: true });
    else if (fs.existsSync(fixturePath)) writePrivateJson(fixturePath, state);
    throw new Error(
      `${error instanceof Error ? error.message : "Fixture provisioning failed."} Emergency cleanup failures: ${cleanup.failures.length}.`,
    );
  }
};

const cleanup = async () => {
  const state = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  if (
    state.classification !== "fictional-only" ||
    state.projectRef !== projectRef ||
    state.region !== region ||
    !Array.isArray(state.accounts)
  ) {
    throw new Error("The temporary fixture state is invalid.");
  }
  const result = await cleanupAccounts(state, true);
  if (result.failures.length === 0) {
    fs.rmSync(fixturePath, { force: true });
  } else {
    writePrivateJson(fixturePath, state);
  }
  writeEvidence({
    result:
      result.failures.length === 0
        ? "FICTIONAL_SIMULATOR_FIXTURE_CLEANUP_VERIFIED"
        : "FICTIONAL_SIMULATOR_FIXTURE_CLEANUP_FAILED",
    classification: "fictional-only",
    projectRef,
    region,
    accountCount: state.accounts.length,
    applicationAccountsDeleted: result.applicationAccountsDeleted,
    authUsersDeleted: result.authUsersDeleted,
    fixtureSecretRemoved:
      result.failures.length === 0 && !fs.existsSync(fixturePath),
    cleanupFailureCount: result.failures.length,
    productionContacted: false,
  });
  if (result.failures.length > 0)
    throw new Error(
      `Fictional fixture cleanup failed for ${result.failures.length} operation(s).`,
    );
};

if (action === "provision") await provision();
else if (action === "cleanup") await cleanup();
else throw new Error("PEACEPAD_FIXTURE_ACTION must be provision or cleanup.");
