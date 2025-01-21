import db from "@server/db";
import {
    emailVerificationCodes,
    passwordResetTokens,
    resourceOtp,
    resourceWhitelist,
    userInvites,
    users
} from "@server/db/schema";
import { sql } from "drizzle-orm";

export default async function migration() {
    console.log("Running setup script 1.0.0-beta.9...");

    try {
        await db.transaction(async (trx) => {
            await db.transaction(async (trx) => {
                trx.run(sql`UPDATE ${users} SET email = LOWER(email);`);
                trx.run(
                    sql`UPDATE ${emailVerificationCodes} SET email = LOWER(email);`
                );
                trx.run(
                    sql`UPDATE ${passwordResetTokens} SET email = LOWER(email);`
                );
                trx.run(sql`UPDATE ${userInvites} SET email = LOWER(email);`);
                trx.run(
                    sql`UPDATE ${resourceWhitelist} SET email = LOWER(email);`
                );
                trx.run(sql`UPDATE ${resourceOtp} SET email = LOWER(email);`);
            });
        });
    } catch (error) {
        console.log(
            "We were unable to make all emails lower case in the database."
        );
        console.error(error);
    }

    console.log("Done.");
}
