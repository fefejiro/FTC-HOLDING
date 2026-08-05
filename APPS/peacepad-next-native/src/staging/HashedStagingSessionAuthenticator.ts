import type { SecretDigest, StagingActor } from "./InvitationService";
import type { StagingSessionAuthenticator } from "./TrustedInvitationHttpBridge";

export type HashedStagingSession = Readonly<{
  tokenHash: string;
  actor: StagingActor;
}>;

const constantTimeEqual = (left: string, right: string) => {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
};

export class HashedStagingSessionAuthenticator implements StagingSessionAuthenticator {
  constructor(
    private readonly digest: SecretDigest,
    private readonly pepper: string,
    private readonly sessions: readonly HashedStagingSession[]
  ) {
    if (pepper.trim().length < 16) throw new Error("Staging session authentication requires a server-only pepper.");
    if (sessions.length === 0) throw new Error("Staging session authentication requires at least one synthetic actor.");
    if (sessions.some(({ tokenHash }) => !/^[a-f0-9]{64}$/i.test(tokenHash))) {
      throw new Error("Staging session authentication requires SHA-256 token hashes.");
    }
    if (new Set(sessions.map(({ tokenHash }) => tokenHash.toLowerCase())).size !== sessions.length) {
      throw new Error("Staging session token hashes must be unique.");
    }
  }

  async authenticate(sessionToken: string) {
    const actual = await this.digest.digest(`${this.pepper}:${sessionToken}`);
    let matched: StagingActor | undefined;
    for (const session of this.sessions) {
      if (constantTimeEqual(actual, session.tokenHash)) matched = session.actor;
    }
    return matched;
  }
}
