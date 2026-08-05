/** Minimal database contract so the native rail never imports a production ORM. */
export type StagingDatabaseClient = Readonly<{
  query: (sql: string) => Promise<unknown>;
  end?: () => Promise<void>;
}>;

export type StagingDatabase = Readonly<{
  ready: () => Promise<boolean>;
  close: () => Promise<void>;
}>;

/** Adapter used by the eventual isolated PostgreSQL runtime. */
export const createStagingDatabase = (client: StagingDatabaseClient): StagingDatabase => ({
  ready: async () => {
    try {
      await client.query("SELECT 1");
      return true;
    } catch {
      return false;
    }
  },
  close: async () => { await client.end?.(); },
});
