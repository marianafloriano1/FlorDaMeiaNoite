import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import type { Database } from "./types";

type DatabaseEnvironment = {
  DATABASE_URL?: string;
  DB_POOL_MAX?: string;
};

export type DatabaseConfig = {
  connectionString: string;
  poolMax: number;
};

let database: Kysely<Database> | undefined;

export function readDatabaseConfig(environment: DatabaseEnvironment): DatabaseConfig {
  const connectionString = environment.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(connectionString);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL URL");
  }
  if (parsedUrl.protocol !== "postgres:" && parsedUrl.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL must use the postgres or postgresql protocol");
  }

  const rawPoolMax = environment.DB_POOL_MAX;
  if (!rawPoolMax || !/^\d+$/.test(rawPoolMax)) {
    throw new Error("DB_POOL_MAX must be a positive integer");
  }
  const poolMax = Number(rawPoolMax);
  if (!Number.isSafeInteger(poolMax) || poolMax < 1) {
    throw new Error("DB_POOL_MAX must be a positive integer");
  }

  return { connectionString, poolMax };
}

/** Lazily creates one connection pool per application process. */
export function getDatabase(): Kysely<Database> {
  if (!database) {
    const config = readDatabaseConfig(process.env as DatabaseEnvironment);
    const pool = new Pool({
      connectionString: config.connectionString,
      max: config.poolMax,
      connectionTimeoutMillis: 5_000,
      statement_timeout: 5_000,
    });
    database = new Kysely<Database>({
      dialect: new PostgresDialect({ pool }),
    });
  }

  return database;
}

/** Closes the process pool for command-line tools and controlled shutdown. */
export async function closeDatabase(): Promise<void> {
  if (database) {
    const currentDatabase = database;
    database = undefined;
    await currentDatabase.destroy();
  }
}
