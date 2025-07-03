import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import db from "./driver";
import path from "path";
import { location } from "./driver";
import Database from "better-sqlite3";
import type { Database as BetterSqlite3Database } from "better-sqlite3";

const migrationsFolder = path.join("server/migrations");

const runMigrations = async () => {
    console.log("Running migrations...");
    try {
        // Initialize the database file with a valid SQLite header
        const sqlite = new Database(location) as BetterSqlite3Database;
        sqlite.pragma('foreign_keys = ON');
        
        // Run the migrations
        migrate(db as any, {
            migrationsFolder: migrationsFolder,
        });
        console.log("Migrations completed successfully.");
    } catch (error) {
        console.error("Error running migrations:", error);
        process.exit(1);
    }
};

runMigrations();
