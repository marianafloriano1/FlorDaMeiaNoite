import type { Kysely } from "kysely";
import type { Database } from "../types";

export async function up(database: Kysely<Database>): Promise<void> {
  await database.schema.createSchema("app").execute();
}

export async function down(database: Kysely<Database>): Promise<void> {
  await database.schema.dropSchema("app").execute();
}
