import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import db from "@server/db";
import path from "path";

const migrationsFolder = path.join(__dirname, "../server/migrations");
console.log(migrationsFolder);


const runMigrations = async () => {
    console.log("Running migrations...");
    try {
        migrate(db, {
            migrationsFolder: migrationsFolder,
        });
        console.log("Migrations completed successfully.");
    } catch (error) {
        console.error("Error running migrations:", error);
        process.exit(1);
    }
};

runMigrations();
