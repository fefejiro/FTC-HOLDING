import {
  InvitationService,
  type InvitationDirectory
} from "./InvitationService";
import { StagingInvitationRoutes } from "./InvitationRoutes";
import { CalendarService } from "./CalendarService";
import { CompositeStagingRoutes, StagingCalendarRoutes } from "./CalendarRoutes";
import { PostgresCalendarStore } from "./PostgresCalendarStore";
import { MessagingService } from "./MessagingService";
import { PostgresMessagingStore } from "./PostgresMessagingStore";
import { StagingMessagingRoutes } from "./MessagingRoutes";
import { AttachmentIntentService } from "./AttachmentIntentService";
import { PostgresAttachmentIntentStore } from "./PostgresAttachmentIntentStore";
import { StagingAttachmentIntentRoutes } from "./AttachmentIntentRoutes";
import {
  PostgresInvitationRateLimiter,
  PostgresInvitationStore,
  type SqlPool
} from "./PostgresInvitationStore";
import {
  TrustedInvitationHttpBridge,
  type StagingSessionAuthenticator
} from "./TrustedInvitationHttpBridge";
import { WebCryptoSha256Digest } from "./WebCryptoDigest";

type SubtleDigest = ConstructorParameters<typeof WebCryptoSha256Digest>[0];

export type StagingInvitationRuntimeConfig = Readonly<{
  runtimeEnvironment: "staging";
  serviceOrigin: string;
  invitationPepper: string;
  rateLimitPepper: string;
  idempotencyPepper: string;
  sqlPool: SqlPool;
  authenticator: StagingSessionAuthenticator;
  directory: InvitationDirectory;
  subtle: SubtleDigest;
}>;

const assertStagingOrigin = (origin: string) => {
  const match = origin.trim().match(/^(https?):\/\/([^/:?#]+)(?::\d+)?(?:[/?#]|$)/i);
  if (!match) {
    throw new Error("A valid staging service origin is required.");
  }
  const protocol = match[1].toLowerCase();
  const host = match[2].toLowerCase();
  const allowed = host === "localhost" || host === "127.0.0.1" || host.endsWith(".staging.peacepad.ca");
  const local = host === "localhost" || host === "127.0.0.1";
  if (!allowed || (protocol !== "https" && !local)) {
    throw new Error("The native invitation runtime can only target an isolated PeacePad staging origin.");
  }
};

export function createStagingInvitationRuntime(config: StagingInvitationRuntimeConfig) {
  if (config.runtimeEnvironment !== "staging") {
    throw new Error("The native invitation runtime is staging-only.");
  }
  assertStagingOrigin(config.serviceOrigin);
  const digest = new WebCryptoSha256Digest(config.subtle);
  const store = new PostgresInvitationStore(config.sqlPool, digest, config.idempotencyPepper);
  const rateLimiter = new PostgresInvitationRateLimiter(config.sqlPool, digest, config.rateLimitPepper);
  const service = new InvitationService({
    store,
    digest,
    directory: config.directory,
    pepper: config.invitationPepper,
    rateLimiter
  });
  const calendarStore = new PostgresCalendarStore(config.sqlPool, digest, config.idempotencyPepper);
  const calendarService = new CalendarService({
    store: calendarStore,
    digest,
    idempotencyPepper: config.idempotencyPepper
  });
  const messagingStore = new PostgresMessagingStore(config.sqlPool, digest, config.idempotencyPepper);
  const messagingService = new MessagingService({ store: messagingStore, digest, idempotencyPepper: config.idempotencyPepper });
  const attachmentStore = new PostgresAttachmentIntentStore(config.sqlPool, digest, config.idempotencyPepper);
  const attachmentService = new AttachmentIntentService({ store: attachmentStore, digest, idempotencyPepper: config.idempotencyPepper });
  const routes = new CompositeStagingRoutes(
    new StagingInvitationRoutes(service),
    new StagingCalendarRoutes(calendarService),
    new StagingMessagingRoutes(messagingService),
    new StagingAttachmentIntentRoutes(attachmentService)
  );
  return {
    bridge: new TrustedInvitationHttpBridge(routes, config.authenticator),
    service,
    store,
    rateLimiter,
    calendarService,
    calendarStore,
    messagingService,
    messagingStore,
    attachmentService,
    attachmentStore
  } as const;
}
