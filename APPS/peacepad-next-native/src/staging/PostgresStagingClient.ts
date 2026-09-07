import { Pool } from "pg";
import type {
  StagingDatabaseClient,
  StagingDatabaseClientFactory,
} from "./StagingDatabase";

export type PostgresStagingClientConfig = Readonly<{
  databaseUrl: string;
  allowRemoteStagingHost?: boolean;
  poolFactory?: (databaseUrl: string) => Pick<Pool, "query" | "end">;
}>;

const isLoopback = (hostname: string): boolean =>
  ["localhost", "127.0.0.1", "::1"].includes(hostname.toLowerCase());

export const validatePostgresStagingUrl = (
  databaseUrl: string,
  allowRemoteStagingHost = false,
): URL => {
  const url = new URL(databaseUrl);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("Staging persistence requires a PostgreSQL URL.");
  }
  if (!url.pathname.toLowerCase().includes("staging")) {
    throw new Error("PostgreSQL database name must identify isolated staging.");
  }
  if (!allowRemoteStagingHost && !isLoopback(url.hostname)) {
    throw new Error("Remote PostgreSQL is disabled without explicit staging approval.");
  }
  return url;
};

export const createPostgresStagingClientFactory = (
  config: PostgresStagingClientConfig,
): StagingDatabaseClientFactory => {
  validatePostgresStagingUrl(config.databaseUrl, config.allowRemoteStagingHost);
  const poolFactory = config.poolFactory ?? ((databaseUrl: string) => new Pool({
    connectionString: databaseUrl,
    max: 4,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 5_000,
    application_name: "peacepad-v2-staging-verifier",
  }));

  return (): StagingDatabaseClient => {
    const pool = poolFactory(config.databaseUrl);
    return {
      query: (sql, parameters) => pool.query(sql, parameters ? [...parameters] : undefined),
      end: () => pool.end(),
    };
  };
};
