import { createHash, timingSafeEqual } from "node:crypto";

import type { StagingActor } from "./StagingServerConfig";

export type StagingSessionCredential = Readonly<{ tokenHash: string; actor: StagingActor }>;

const hashToken = (pepper: string, token: string) => createHash("sha256").update(`${pepper}:${token}`).digest("hex");

/** Bounded fictional-account registry for two-device staging tests. */
export class StagingSessionRegistry {
  private readonly attempts = new Map<string, number>();
  public constructor(private readonly pepper: string, private readonly credentials: readonly StagingSessionCredential[], private readonly maxAttempts = 5) {
    if (pepper.trim().length < 16) throw new Error("The staging session pepper must be at least 16 characters.");
    if (credentials.length === 0 || credentials.length > 2) throw new Error("Staging supports one or two fictional accounts only.");
  }

  public authenticate(sessionToken: string | undefined): StagingActor | undefined {
    if (!sessionToken?.trim()) return undefined;
    const key = hashToken(this.pepper, sessionToken);
    const attempts = (this.attempts.get(key) ?? 0) + 1;
    this.attempts.set(key, attempts);
    if (attempts > this.maxAttempts) return undefined;
    for (const credential of this.credentials) {
      const expected = Buffer.from(credential.tokenHash, "hex");
      const actual = Buffer.from(key, "hex");
      if (expected.length === actual.length && timingSafeEqual(expected, actual)) return credential.actor;
    }
    return undefined;
  }
}
