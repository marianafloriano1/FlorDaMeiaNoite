import { closeDatabase } from "./client";
import { createMigrator } from "./migrator";

async function run(direction: "up" | "down"): Promise<void> {
  try {
    const migrator = createMigrator();
    const result =
      direction === "up" ? await migrator.migrateToLatest() : await migrator.migrateDown();

    if (result.error) {
      throw result.error;
    }

    for (const migration of result.results ?? []) {
      console.info(`${migration.status}: ${migration.migrationName}`);
    }
    if (!result.results?.length) {
      console.info("No migrations to apply.");
    }
  } catch {
    console.error("Database migration failed. Check database configuration and connectivity.");
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}

const direction = process.argv[2];
if (direction !== "up" && direction !== "down") {
  console.error("Usage: npm run db:migrate | npm run db:rollback");
  process.exitCode = 2;
} else {
  void run(direction);
}
