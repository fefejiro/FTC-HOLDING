import type { StagingActor } from "./StagingServerConfig";

export type StagingSession = Readonly<{ actor: StagingActor; region: "ca" | "us" }>;

export class StagingSessionClient {
  public constructor(private readonly serviceOrigin: string, private readonly fetcher: typeof fetch = fetch) {
    const url = new URL(serviceOrigin);
    if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
      throw new Error("Staging session client requires a staging HTTPS origin.");
    }
    if (!url.hostname.endsWith(".staging.peacepad.ca") && !["localhost", "127.0.0.1"].includes(url.hostname)) {
      throw new Error("Production API hosts are blocked by the native staging client.");
    }
  }

  public async restore(sessionToken: string): Promise<StagingSession> {
    const response = await this.fetcher(`${this.serviceOrigin}/api/v2/session`, { headers: { authorization: `Bearer ${sessionToken}` } });
    if (!response.ok) throw new Error(`Staging session restore failed (${response.status}).`);
    const payload = await response.json() as unknown;
    if (!payload || typeof payload !== "object" || !("actor" in payload) || !("region" in payload)) throw new Error("Staging session response was invalid.");
    return payload as StagingSession;
  }
}
