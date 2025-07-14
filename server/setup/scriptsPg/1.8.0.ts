import { db } from "@server/db/pg";

export default async function migrate() {
  try {
    console.log("Starting webauthnChallenge table creation...");
    
    // Create the table (PostgreSQL already has the correct table name)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS webauthnChallenge (
          sessionId TEXT PRIMARY KEY,
          challenge TEXT NOT NULL,
          securityKeyName TEXT,
          userId TEXT,
          expiresAt INTEGER NOT NULL,
          FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
      );
    `);
    
    // Create the index
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_webauthnChallenge_expiresAt ON webauthnChallenge(expiresAt);
    `);
    
    console.log("Successfully created webauthnChallenge table and index");
    return true;
  } catch (error: any) {
    console.error("Unable to create webauthnChallenge table:", error);
    console.error("Error details:", error.message);
    return false;
  }
} 