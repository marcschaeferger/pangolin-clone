import logger from "@server/logger";
import { __DIRNAME } from "@server/config";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import db, { location } from "@server/db";
import path from "path";
import * as fs from "fs/promises";
import semver from "semver";
import { versionMigrations } from "@server/db/schema";
import { desc, eq } from "drizzle-orm";

export async function runMigrations() {
    if (!process.env.APP_VERSION) {
        throw new Error("APP_VERSION is not set in the environment");
    }

    if (process.env.ENVIRONMENT !== "prod") {
        logger.info("Skipping migrations in non-prod environment");
        return;
    }

    if (await checkFileExists(location)) {
        try {
            const directoryPath = path.join(__DIRNAME, "setup/scripts");
            // Get the last executed version from the database
            const lastExecuted = await db
                .select()
                .from(versionMigrations)
                .orderBy(desc(versionMigrations.version))
                .limit(1);

            // Use provided baseVersion or last executed version
            const startVersion = lastExecuted[0]?.version;

            // Read all files in directory
            const files = await fs.readdir(directoryPath);

            // Filter for .ts files and extract versions
            const versionedFiles = files
                .filter((file) => file.endsWith(".ts"))
                .map((file) => {
                    const version = path.parse(file).name;
                    return {
                        version,
                        path: path.join(directoryPath, file)
                    };
                })
                .filter((file) => {
                    // Validate that filename is a valid semver
                    if (!semver.valid(file.version)) {
                        console.warn(
                            `Skipping invalid semver filename: ${file.path}`
                        );
                        return false;
                    }
                    // Filter versions based on startVersion if provided
                    if (startVersion) {
                        return semver.gt(file.version, startVersion);
                    }
                    return true;
                });

            // Sort files by semver
            const sortedFiles = versionedFiles.sort((a, b) =>
                semver.compare(a.version, b.version)
            );

            const results: FileExecutionResult[] = [];

            // Execute files in order
            for (const file of sortedFiles) {
                try {
                    // Start a transaction for each file execution
                    await db.transaction(async (tx) => {
                        // Check if version was already executed (double-check within transaction)
                        const executed = await tx
                            .select()
                            .from(versionMigrations)
                            .where(eq(versionMigrations.version, file.version));

                        if (executed.length > 0) {
                            throw new Error(
                                `Version ${file.version} was already executed`
                            );
                        }

                        // Dynamic import of the TypeScript file
                        const module = await import(file.path);

                        // Execute default export if it's a function
                        if (typeof module.default === "function") {
                            await module.default();
                        } else {
                            throw new Error(
                                `No default export function in ${file.path}`
                            );
                        }

                        // Record successful execution
                        const executedAt = Date.now();
                        await tx.insert(versionMigrations).values({
                            version: file.version,
                            executedAt: executedAt
                        });

                        results.push({
                            version: file.version,
                            success: true,
                            executedAt
                        });
                    });
                } catch (error) {
                    const executedAt = Date.now();
                    results.push({
                        version: file.version,
                        success: false,
                        executedAt,
                        error:
                            error instanceof Error
                                ? error
                                : new Error(String(error))
                    });

                    // Log error but continue processing other files
                    console.error(`Error executing ${file.path}:`, error);
                }
            }

            return results;
        } catch (error) {
            throw new Error(`Failed to process directory: ${error}`);
        }
    } else {
        logger.info("Running migrations...");
        try {
            migrate(db, {
                migrationsFolder: path.join(__DIRNAME, "init")
            });
            logger.info("Migrations completed successfully.");
        } catch (error) {
            logger.error("Error running migrations:", error);
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

async function checkFileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

interface FileExecutionResult {
    version: string;
    success: boolean;
    executedAt: number;
    error?: Error;
}
