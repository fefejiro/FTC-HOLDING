import { webcrypto } from "node:crypto";
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import { HashedStagingSessionAuthenticator } from "./HashedStagingSessionAuthenticator";
import type { SqlPool, SqlResult } from "./PostgresInvitationStore";
import { readStagingServerConfig } from "./StagingServerConfig";
import { createStagingHttpServer } from "./StagingHttpServer";
import { createStagingInvitationRuntime } from "./createStagingInvitationRuntime";
import { WebCryptoSha256Digest } from "./WebCryptoDigest";

const config = readStagingServerConfig(process.env);
const postgres = new Pool({
  connectionString: config.databaseUrl,
  max: 5,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 10_000,
  application_name: "peacepad-native-staging"
});

const result = <Row>(query: QueryResult<QueryResultRow>): SqlResult<Row> => ({
  rows: query.rows as unknown as readonly Row[],
  rowCount: query.rowCount
});
const client = (value: PoolClient) => ({
  query: async <Row = Record<string, unknown>>(text: string, values?: readonly unknown[]) =>
    result<Row>(await value.query(text, values as unknown[] | undefined)),
  release: () => value.release()
});
const sqlPool: SqlPool = {
  query: async <Row = Record<string, unknown>>(text: string, values?: readonly unknown[]) =>
    result<Row>(await postgres.query(text, values as unknown[] | undefined)),
  connect: async () => client(await postgres.connect())
};

const digest = new WebCryptoSha256Digest(webcrypto.subtle);
const authenticator = new HashedStagingSessionAuthenticator(
  digest,
  config.sessionPepper,
  config.sessions
);
const runtime = createStagingInvitationRuntime({
  runtimeEnvironment: "staging",
  serviceOrigin: config.serviceOrigin,
  invitationPepper: config.invitationPepper,
  rateLimitPepper: config.rateLimitPepper,
  idempotencyPepper: config.idempotencyPepper,
  sqlPool,
  authenticator,
  directory: { familyName: async (familyId) => config.families[familyId] },
  subtle: webcrypto.subtle
});

const server = createStagingHttpServer({
  serviceOrigin: config.serviceOrigin,
  appOrigin: config.appOrigin,
  bridge: runtime.bridge,
  readiness: async () => { await postgres.query("SELECT 1"); }
});

server.listen(config.port, "0.0.0.0", () => {
  console.info(JSON.stringify({ event: "server.started", port: config.port, environment: "staging" }));
});

const shutdown = async () => {
  server.close();
  await postgres.end();
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
