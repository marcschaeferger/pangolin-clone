import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import db from "./driver";
import path from "path";
import { location } from "./driver";
import Database from "better-sqlite3";
import type { Database as BetterSqlite3Database } from "better-sqlite3";

const migrationsFolder = path.join("server/migrations");

const dropAllTables = (sqlite: BetterSqlite3Database) => {
    console.log("Dropping all existing tables...");
    
    // Disable foreign key checks
    sqlite.pragma('foreign_keys = OFF');
    
    // Get all tables
    const tables = sqlite.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' 
        AND name NOT LIKE 'sqlite_%'
    `).all() as { name: string }[];
    
    // Drop each table
    for (const table of tables) {
        console.log(`Dropping table: ${table.name}`);
        sqlite.prepare(`DROP TABLE IF EXISTS "${table.name}"`).run();
    }
    
    // Re-enable foreign key checks
    sqlite.pragma('foreign_keys = ON');
};

const runMigrations = async () => {
    console.log("Running migrations...");
    try {
        // Initialize the database file with a valid SQLite header
        const sqlite = new Database(location) as BetterSqlite3Database;
        
        // Drop all existing tables first
        dropAllTables(sqlite);
        
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
