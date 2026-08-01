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

  async handle(request: RawStagingInvitationRequest): Promise<StagingInvitationResponse> {
    const token = bearerToken(request.headers);
    const actor = token ? await this.authenticator.authenticate(token) : undefined;
    return this.routes.handle({ ...request, actor });
  }
}
