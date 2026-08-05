import { createStagingDatabase, type StagingDatabaseClient } from "./StagingDatabase";
import { runStagingMigrations } from "./StagingMigrations";

export type StagingVerificationResult = Readonly<{
  initialReady: boolean;
  migrationsRun: number;
  restartReady: boolean;
}>;

/** Verifies the database contract without creating application or family records. */
export async function verifyStagingDatabase(client: StagingDatabaseClient): Promise<StagingVerificationResult> {
  const database = createStagingDatabase(client);
  const initialReady = await database.ready();
  if (!initialReady) return { initialReady: false, migrationsRun: 0, restartReady: false };
  const first = await runStagingMigrations(client);
  await database.close();
  const restartDatabase = createStagingDatabase(client);
  const restartReady = await restartDatabase.ready();
  if (!restartReady) return { initialReady: true, migrationsRun: first.length, restartReady: false };
  const second = await runStagingMigrations(client);
  await restartDatabase.close();
  return { initialReady: true, migrationsRun: new Set([...first, ...second].map(({ id }) => id)).size, restartReady: true };
}
