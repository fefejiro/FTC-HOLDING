import type { SecretDigest, StagingActor } from "./InvitationService";
import type { StagingSessionAuthenticator } from "./TrustedInvitationHttpBridge";

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
    private readonly expectedTokenHash: string,
    private readonly actor: StagingActor
  ) {
    if (pepper.trim().length < 16) throw new Error("Staging session authentication requires a server-only pepper.");
    if (!/^[a-f0-9]{64}$/i.test(expectedTokenHash)) throw new Error("Staging session authentication requires a SHA-256 token hash.");
  }

  async authenticate(sessionToken: string) {
    const actual = await this.digest.digest(`${this.pepper}:${sessionToken}`);
    return constantTimeEqual(actual, this.expectedTokenHash) ? this.actor : undefined;
  }
}
