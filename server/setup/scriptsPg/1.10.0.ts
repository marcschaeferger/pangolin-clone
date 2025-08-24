import { db } from "@server/db/pg";

const version = "1.10.0";

export default async function migration() {
  console.log(`Running setup script ${version}...`);

  try {
    // 1) Create ip_sets table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "ip_sets" (
        "id" varchar PRIMARY KEY,
        "name" varchar NOT NULL UNIQUE,
        "description" varchar,
        "ips" varchar NOT NULL,
        "orgId" varchar NOT NULL REFERENCES "orgs" ("orgId") ON DELETE CASCADE,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      );
    `);

    console.log('Created table "ip_sets"');

    // 2) Add ip_set_id column to resourceRules (nullable, FK)
    await db.execute(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'resourceRules'
            AND column_name = 'ip_set_id'
        ) THEN
          ALTER TABLE "resourceRules"
            ADD COLUMN "ip_set_id" varchar
              REFERENCES "ip_sets"("id") ON DELETE CASCADE;
        END IF;
      END$$;
    `);

    console.log('Added column "ip_set_id" to "resourceRules"');
  } catch (e) {
    console.log("Unable to apply migration 1.10.0");
    throw e;
  }

  console.log(`${version} migration complete`);
}
