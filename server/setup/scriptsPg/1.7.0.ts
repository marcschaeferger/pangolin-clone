import { db } from "@server/db/pg";

const version = "1.7.0";

export default async function migration() {
    console.log(`Running PostgreSQL setup script ${version}...`);

    try {
        // Add passwordResetTokenExpiryHours column to orgs table with default value of 1
        await db.execute(`
            ALTER TABLE orgs ADD COLUMN passwordResetTokenExpiryHours INTEGER NOT NULL DEFAULT 1;
        `);
        console.log(`Added passwordResetTokenExpiryHours column to orgs table`);
    } catch (e) {
        console.log("Error adding passwordResetTokenExpiryHours column to orgs table:");
        console.log(e);
        throw e;
    }

    console.log(`${version} PostgreSQL migration complete`);
} 