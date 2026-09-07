const encoder = new TextEncoder();
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type TurnRuntimeConfig = Readonly<{
  urls: readonly string[];
  sharedSecret: string;
}>;

export type TurnCredential = Readonly<{
  urls: readonly string[];
  username: string;
  credential: string;
  expiresAt: string;
}>;

const base64 = (bytes: Uint8Array): string => {
  let binary = "";
  for (const value of bytes) binary += String.fromCharCode(value);
  return btoa(binary);
};

const base64Url = (bytes: Uint8Array): string =>
  base64(bytes).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");

export function parseTurnUrls(value: string): readonly string[] {
  const urls = value.split(",").map((entry) => entry.trim()).filter(Boolean);
  if (urls.length < 1 || urls.length > 4 || new Set(urls).size !== urls.length) return [];
  return urls.every((url) => {
    const match = url.match(/^(?:turn|turns):(?:[a-z0-9.-]+|\[[0-9a-f:]+\])(?::([1-9][0-9]{0,4}))?(?:\?transport=(?:udp|tcp))?$/i);
    return Boolean(match) && (!match?.[1] || Number(match[1]) <= 65_535);
  }) ? urls : [];
}

export async function createTurnCredential(
  config: TurnRuntimeConfig,
  input: Readonly<{ identityId: string; callId: string; region: "ca" | "us"; now?: Date }>,
): Promise<TurnCredential> {
  if (
    config.sharedSecret.length < 32
    || config.urls.length < 1
    || config.urls.length > 4
    || !UUID_PATTERN.test(input.identityId)
    || !UUID_PATTERN.test(input.callId)
  ) throw new Error("TURN configuration is unavailable.");

  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);
  const expiresUnix = Math.floor(expiresAt.getTime() / 1000);
  const subjectDigest = new Uint8Array(await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`${input.region}:${input.callId}:${input.identityId}`),
  ));
  const username = `${expiresUnix}:${base64Url(subjectDigest).slice(0, 24)}`;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(config.sharedSecret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const credential = base64(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(username))));
  return { urls: config.urls, username, credential, expiresAt: expiresAt.toISOString() };
}
