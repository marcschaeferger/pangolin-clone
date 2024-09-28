import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import db from "@server/db";

const runMigrations = async () => {
    console.log("Running migrations...");
    try {
        migrate(db, { migrationsFolder: "./server/migrations" });
        console.log("Migrations completed successfully.");
    } catch (error) {
        console.error("Error running migrations:", error);
        process.exit(1);
    }
};

runMigrations();
