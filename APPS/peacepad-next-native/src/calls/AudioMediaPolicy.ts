export type PeacePadIceServer = Readonly<{
  urls: string | readonly string[];
  username?: string;
  credential?: string;
}>;

export type VerifiedTurnConfiguration = Readonly<{
  iceServers: readonly PeacePadIceServer[];
  iceTransportPolicy: "relay";
}>;

const urlsFor = (server: PeacePadIceServer): readonly string[] =>
  typeof server.urls === "string" ? [server.urls] : server.urls;

export function verifyTurnConfiguration(
  servers: readonly PeacePadIceServer[],
): VerifiedTurnConfiguration {
  if (servers.length === 0 || servers.length > 8) {
    throw new Error("Secure audio relay is unavailable.");
  }

  for (const server of servers) {
    const urls = urlsFor(server);
    if (
      urls.length === 0
      || urls.length > 8
      || urls.some((url) => !/^turns?:/i.test(url) || url.length > 1_024)
      || !server.username
      || !server.credential
      || server.username.length > 512
      || server.credential.length > 2_048
    ) {
      throw new Error("Secure audio relay is unavailable.");
    }
  }

  return { iceServers: servers, iceTransportPolicy: "relay" };
}
