import { db } from "@server/db";

export default async function migrate() {
  try {
    console.log("Starting table rename migration...");
    
    // Rename the table
    await db.run(`
      ALTER TABLE passkeyChallenge RENAME TO webauthnChallenge;
    `);
    console.log("Successfully renamed table");

    // Rename the index
    await db.run(`
      DROP INDEX IF EXISTS idx_passkeyChallenge_expiresAt;
      CREATE INDEX IF NOT EXISTS idx_webauthnChallenge_expiresAt ON webauthnChallenge(expiresAt);
    `);
    console.log("Successfully updated index");

    console.log(`Renamed passkeyChallenge table to webauthnChallenge`);
    return true;
  } catch (error: any) {
    console.error("Unable to rename passkeyChallenge table:", error);
    console.error("Error details:", error.message);
    return false;
  }
} 