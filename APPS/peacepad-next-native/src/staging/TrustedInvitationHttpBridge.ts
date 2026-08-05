import type { StagingActor } from "./InvitationService";
import {
  StagingInvitationRoutes,
  type StagingInvitationRequest,
  type StagingInvitationResponse
} from "./InvitationRoutes";

export interface StagingSessionAuthenticator {
  authenticate(sessionToken: string): Promise<StagingActor | undefined>;
}
export type RawStagingInvitationRequest = Omit<StagingInvitationRequest, "actor">;

const header = (headers: Readonly<Record<string, string | undefined>>, name: string) =>
  headers[name] ?? headers[name.toLowerCase()];

const bearerToken = (headers: Readonly<Record<string, string | undefined>>) => {
  const authorization = header(headers, "Authorization")?.trim();
  const match = authorization?.match(/^Bearer\s+([^\s]+)$/i);
  return match?.[1];
};

export class TrustedInvitationHttpBridge {
  constructor(
    private readonly routes: StagingInvitationRoutes,
    private readonly authenticator: StagingSessionAuthenticator
  ) {}

  private async actor(headers: Readonly<Record<string, string | undefined>>) {
    const token = bearerToken(headers);
    return token ? this.authenticator.authenticate(token) : undefined;
  }

  async session(headers: Readonly<Record<string, string | undefined>>): Promise<StagingInvitationResponse> {
    const actor = await this.actor(headers);
    if (!actor) return { status: 401, body: { code: "UNAUTHENTICATED", message: "A valid staging session is required." } };
    return {
      status: 200,
      body: {
        identityId: actor.identityId,
        displayName: actor.displayName,
        familyIds: Object.keys(actor.familyPermissions).sort()
      }
    };
  }

  async handle(request: RawStagingInvitationRequest): Promise<StagingInvitationResponse> {
    const actor = await this.actor(request.headers);
    return this.routes.handle({ ...request, actor });
  }
}
