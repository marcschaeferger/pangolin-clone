import { db } from "@server/db";

export default async function migrate() {
    try {
        console.log("Starting passkey removal migration...");
        
        // Drop the webauthn tables
        await db.run(`
            DROP TABLE IF EXISTS webauthnCredentials;
            DROP TABLE IF EXISTS webauthnChallenge;
            DROP INDEX IF EXISTS idx_webauthnChallenge_expiresAt;
        `);

        console.log("Successfully removed passkey tables");
        return true;
    } catch (error: any) {
        console.error("Unable to remove passkey tables:", error);
        console.error("Error details:", error.message);
        return false;
    }
} 