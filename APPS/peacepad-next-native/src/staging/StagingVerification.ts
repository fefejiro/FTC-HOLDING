import {
  createStagingDatabase,
  type StagingDatabaseClientFactory,
} from "./StagingDatabase";
import { runStagingMigrations } from "./StagingMigrations";

export type StagingVerificationResult = Readonly<{
  initialReady: boolean;
  migrationsRun: number;
  restartReady: boolean;
}>;

/** Verifies the database contract without creating application or family records. */
export async function verifyStagingDatabase(
  createClient: StagingDatabaseClientFactory,
): Promise<StagingVerificationResult> {
  const initialClient = await createClient();
  const initialDatabase = createStagingDatabase(initialClient);
  const initialReady = await initialDatabase.ready();
  if (!initialReady) {
    await initialDatabase.close();
    return { initialReady: false, migrationsRun: 0, restartReady: false };
  }
  let first;
  try {
    first = await runStagingMigrations(initialClient);
  } finally {
    await initialDatabase.close();
  }

  const restartClient = await createClient();
  if (restartClient === initialClient) {
    throw new Error("Restart verification requires a new PostgreSQL client instance.");
  }
  const restartDatabase = createStagingDatabase(restartClient);
  const restartReady = await restartDatabase.ready();
  if (!restartReady) {
    await restartDatabase.close();
    return { initialReady: true, migrationsRun: first.length, restartReady: false };
  }
  let second;
  try {
    second = await runStagingMigrations(restartClient);
  } finally {
    await restartDatabase.close();
  }
  return { initialReady: true, migrationsRun: new Set([...first, ...second].map(({ id }) => id)).size, restartReady: true };
}
