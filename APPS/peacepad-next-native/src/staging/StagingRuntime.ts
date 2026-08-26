import type { StagingSessionAuthenticator } from "./HashedStagingSessionAuthenticator";
import { createStagingDatabase, type StagingDatabaseClient } from "./StagingDatabase";
import { runStagingMigrations } from "./StagingMigrations";
import { StagingHttpServer } from "./StagingHttpServer";
import type { StagingServerConfig } from "./StagingServerConfig";

export type StagingRuntime = Readonly<{
  server: StagingHttpServer;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}>;

/** Builds a staging service only after its isolated schema has been prepared. */
export const createStagingRuntime = (
  config: StagingServerConfig,
  databaseClient: StagingDatabaseClient,
  sessions: StagingSessionAuthenticator,
): StagingRuntime => {
  const database = createStagingDatabase(databaseClient);
  const server = new StagingHttpServer(config, sessions, () => database.ready());
  return {
    server,
    start: async () => {
      if (!(await database.ready())) throw new Error("The isolated staging database is not ready.");
      await runStagingMigrations(databaseClient);
      await server.listen();
    },
    stop: async () => { await server.close(); await database.close(); },
  };
};
