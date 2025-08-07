import { db } from "@server/db/pg";
import { ruleTemplates, templateRules, resourceTemplates } from "@server/db/pg/schema";

const version = "1.10.0";

export default async function migration() {
    console.log(`Running setup script ${version}...`);

    try {
        // Create rule templates table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS "ruleTemplates" (
                "templateId" varchar PRIMARY KEY,
                "orgId" varchar NOT NULL,
                "name" varchar NOT NULL,
                "description" varchar,
                "createdAt" bigint NOT NULL,
                FOREIGN KEY ("orgId") REFERENCES "orgs" ("orgId") ON DELETE CASCADE
            );
        `);

        // Create template rules table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS "templateRules" (
                "ruleId" serial PRIMARY KEY,
                "templateId" varchar NOT NULL,
                "enabled" boolean NOT NULL DEFAULT true,
                "priority" integer NOT NULL,
                "action" varchar NOT NULL,
                "match" varchar NOT NULL,
                "value" varchar NOT NULL,
                FOREIGN KEY ("templateId") REFERENCES "ruleTemplates" ("templateId") ON DELETE CASCADE
            );
        `);

        // Create resource templates table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS "resourceTemplates" (
                "resourceId" integer NOT NULL,
                "templateId" varchar NOT NULL,
                PRIMARY KEY ("resourceId", "templateId"),
                FOREIGN KEY ("resourceId") REFERENCES "resources" ("resourceId") ON DELETE CASCADE,
                FOREIGN KEY ("templateId") REFERENCES "ruleTemplates" ("templateId") ON DELETE CASCADE
            );
        `);

        console.log("Added rule template tables");

        // Add templateRuleId column to resourceRules table
        await db.execute(`
            ALTER TABLE "resourceRules" 
            ADD COLUMN "templateRuleId" INTEGER 
            REFERENCES "templateRules"("ruleId") ON DELETE CASCADE
        `);

        console.log("Added templateRuleId column to resourceRules table");
    } catch (e) {
        console.log("Unable to add rule template tables and columns");
        throw e;
    }

    console.log(`${version} migration complete`);
}
