import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { sql } from "kysely";
import { closeDatabase, getDatabase, readDatabaseConfig } from "../../src/lib/db/client";
import { createMigrator } from "../../src/lib/db/migrator";
import { GET as getDatabaseHealth } from "../../src/app/api/health/db/route";

test("database configuration requires a PostgreSQL URL and a positive pool limit without exposing secrets", () => {
  assert.throws(() => readDatabaseConfig({ DB_POOL_MAX: "2" }), /DATABASE_URL is required/);
  assert.throws(
    () => readDatabaseConfig({ DATABASE_URL: "postgres://synthetic:secret@localhost/db", DB_POOL_MAX: "0" }),
    /DB_POOL_MAX must be a positive integer/,
  );
  assert.throws(
    () => readDatabaseConfig({ DATABASE_URL: "https://example.invalid", DB_POOL_MAX: "2" }),
    /DATABASE_URL must use the postgres or postgresql protocol/,
  );
  assert.deepEqual(
    readDatabaseConfig({ DATABASE_URL: "postgresql://test:synthetic@localhost/db", DB_POOL_MAX: "2" }),
    { connectionString: "postgresql://test:synthetic@localhost/db", poolMax: 2 },
  );
});

test("the base migration round-trips the empty app schema", async () => {
  const database = getDatabase();
  const migrator = createMigrator();

  try {
    const up = await migrator.migrateToLatest();
    assert.equal(up.error, undefined);

    const schema = await sql<{ schema_name: string }>`
      select schema_name from information_schema.schemata where schema_name = 'app'
    `.execute(database);
    assert.equal(schema.rows.length, 1);

    const repeatedUp = await migrator.migrateToLatest();
    assert.equal(repeatedUp.error, undefined);
    assert.equal(repeatedUp.results?.length ?? 0, 0);

    const down = await migrator.migrateDown();
    assert.equal(down.error, undefined);

    const removedSchema = await sql<{ schema_name: string }>`
      select schema_name from information_schema.schemata where schema_name = 'app'
    `.execute(database);
    assert.equal(removedSchema.rows.length, 0);

    const repeatedDown = await migrator.migrateDown();
    assert.equal(repeatedDown.error, undefined);
  } finally {
    await closeDatabase();
  }
});

test("database health reports only availability", async () => {
  const response = await getDatabaseHealth();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
});

test("a failed transaction rolls back its synthetic fixture", async () => {
  const database = getDatabase();
  const tableName = `task002_rollback_${randomUUID().replaceAll("-", "")}`;
  const table = sql.id("public", tableName);

  try {
    await sql`create table ${table} (id integer primary key)`.execute(database);

    await assert.rejects(
      database.transaction().execute(async (transaction) => {
        await sql`insert into ${table} (id) values (1)`.execute(transaction);
        throw new Error("synthetic rollback trigger");
      }),
      /synthetic rollback trigger/,
    );

    const rows = await sql<{ count: string }>`select count(*)::text as count from ${table}`.execute(database);
    assert.equal(rows.rows[0]?.count, "0");
  } finally {
    await sql`drop table if exists ${table}`.execute(database);
    await closeDatabase();
  }
});

test("database health hides connection details when PostgreSQL is unavailable", async () => {
  await closeDatabase();
  const originalUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgresql://synthetic:secret@127.0.0.1:54330/unavailable";

  try {
    const response = await getDatabaseHealth();
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { status: "unavailable" });
  } finally {
    await closeDatabase();
    if (originalUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalUrl;
    }
  }
});
