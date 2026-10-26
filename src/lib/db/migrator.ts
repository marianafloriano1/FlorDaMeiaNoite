import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { FileMigrationProvider, Migrator } from "kysely/migration";
import { getDatabase } from "./client";

export function createMigrator() {
  return new Migrator({
    db: getDatabase(),
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(process.cwd(), "src", "lib", "db", "migrations"),
      import: (filePath) => import(pathToFileURL(filePath).href),
    }),
  });
}
