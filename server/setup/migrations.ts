import { __DIRNAME } from "@server/config";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import db, { exists } from "@server/db";
import path from "path";
import semver from "semver";
import { versionMigrations } from "@server/db/schema";
import { desc } from "drizzle-orm";

// Import all migrations explicitly
import m1 from "./scripts/1.0.0-beta1";
// Add new migration imports here as they are created

// Define the migration list with versions and their corresponding functions
const migrations = [
    { version: "1.0.0-beta.1", run: m1 }
    // Add new migrations here as they are created
] as const;

export async function runMigrations() {
    if (!process.env.APP_VERSION) {
        throw new Error("APP_VERSION is not set in the environment");
    }

    if (process.env.ENVIRONMENT !== "prod") {
        console.info("Skipping migrations in non-prod environment");
        return;
    }

    if (exists) {
        await executeScripts();
    } else {
        console.info("Running migrations...");
        try {
            migrate(db, {
                migrationsFolder: path.join(__DIRNAME, "init") // put here during the docker build
            });
            console.info("Migrations completed successfully.");
        } catch (error) {
            console.error("Error running migrations:", error);
        }

        // insert process.env.APP_VERSION into the versionMigrations table
        await db
            .insert(versionMigrations)
            .values({
                version: process.env.APP_VERSION,
                executedAt: Date.now()
            })
            .execute();
    }
}

async function executeScripts() {
    try {
        // Get the last executed version from the database
        const lastExecuted = await db
            .select()
            .from(versionMigrations)
            .orderBy(desc(versionMigrations.version))
            .limit(1);

        const startVersion = lastExecuted[0]?.version ?? "0.0.0";
        console.info(`Starting migrations from version ${startVersion}`);

        // Filter and sort migrations
        const pendingMigrations = migrations
            .filter((migration) => semver.gt(migration.version, startVersion))
            .sort((a, b) => semver.compare(a.version, b.version));

        // Run migrations in order
        for (const migration of pendingMigrations) {
            console.info(`Running migration ${migration.version}`);

            try {
                await migration.run();

                // Update version in database
                await db
                    .insert(versionMigrations)
                    .values({
                        version: migration.version,
                        executedAt: Date.now()
                    })
                    .execute();

                console.info(
                    `Successfully completed migration ${migration.version}`
                );
            } catch (error) {
                console.error(
                    `Failed to run migration ${migration.version}:`,
                    error
                );
                throw error; // Re-throw to stop migration process
            }
        }

        console.info("All migrations completed successfully");
    } catch (error) {
        console.error("Migration process failed:", error);
        throw error;
    }
}
