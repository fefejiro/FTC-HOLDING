import { createHash, timingSafeEqual } from "node:crypto";

import type { StagingActor } from "./StagingServerConfig";

const HEX_SHA256 = /^[a-f0-9]{64}$/i;

export type StagingSessionAuthenticator = Readonly<{
  authenticate: (sessionToken: string | undefined) => Promise<StagingActor | undefined>;
}>;

/** Authenticates only the fictional staging session configured for this lab. */
export class HashedStagingSessionAuthenticator implements StagingSessionAuthenticator {
  public constructor(
    private readonly sessionPepper: string,
    private readonly expectedTokenHash: string,
    private readonly actor: StagingActor,
  ) {
    if (sessionPepper.trim().length < 16) throw new Error("The staging session pepper must be at least 16 characters.");
    if (!HEX_SHA256.test(expectedTokenHash)) throw new Error("The staging session hash must be SHA-256 hex.");
  }

  public async authenticate(sessionToken: string | undefined): Promise<StagingActor | undefined> {
    if (!sessionToken?.trim()) return undefined;
    const actual = createHash("sha256").update(`${this.sessionPepper}:${sessionToken}`).digest("hex");
    const left = Buffer.from(actual, "hex");
    const right = Buffer.from(this.expectedTokenHash, "hex");
    return left.length === right.length && timingSafeEqual(left, right) ? this.actor : undefined;
  }
}
