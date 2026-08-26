import { createTurnCredential, parseTurnUrls } from "./turn.ts";

const secret = "turn-test-secret-that-is-at-least-32-characters";
const assert = (condition: unknown, message: string): void => {
  if (!condition) throw new Error(message);
};

Deno.test("parses only bounded credential-free TURN URLs", () => {
  const valid = parseTurnUrls("turn:ca.example.test:3478,turns:ca.example.test:443?transport=tcp");
  assert(valid.length === 2 && valid[0] === "turn:ca.example.test:3478", "valid TURN URLs rejected");
  assert(parseTurnUrls("stun:public.example.test:3478").length === 0, "STUN URL accepted");
  assert(parseTurnUrls("turn:user:secret@ca.example.test:3478").length === 0, "embedded credential accepted");
  assert(parseTurnUrls("turn:ca.example.test:99999").length === 0, "invalid TURN port accepted");
  assert(parseTurnUrls("turn:one.test,turn:one.test").length === 0, "duplicate URL accepted");
});

Deno.test("creates deterministic five-minute coturn credentials with a pseudonymous subject", async () => {
  const input = {
    identityId: "11111111-1111-4111-8111-111111111111",
    callId: "22222222-2222-4222-8222-222222222222",
    region: "ca" as const,
    now: new Date("2026-08-10T20:00:00.000Z"),
  };
  const first = await createTurnCredential({ urls: ["turns:ca.example.test:443?transport=tcp"], sharedSecret: secret }, input);
  const second = await createTurnCredential({ urls: ["turns:ca.example.test:443?transport=tcp"], sharedSecret: secret }, input);
  assert(JSON.stringify(first) === JSON.stringify(second), "credential generation is not deterministic");
  assert(first.expiresAt === "2026-08-10T20:05:00.000Z", "credential TTL is not five minutes");
  assert(!first.username.includes(input.identityId) && !first.username.includes(input.callId), "credential leaks identifiers");
  assert(first.credential.length > 20, "credential is unexpectedly short");
});

Deno.test("rejects weak secrets and invalid call subjects", async () => {
  let rejected = false;
  try {
    await createTurnCredential(
      { urls: ["turn:ca.example.test:3478"], sharedSecret: "too-short" },
      { identityId: "11111111-1111-4111-8111-111111111111", callId: "22222222-2222-4222-8222-222222222222", region: "ca" },
    );
  } catch (error) {
    rejected = error instanceof Error && error.message === "TURN configuration is unavailable.";
  }
  assert(rejected, "weak TURN secret accepted");
});
