import { TimeSpan, createDate } from "oslo";
import { generateRandomString, alphabet } from "oslo/crypto";
import db from "@server/db";
import { users, emailVerificationCodes } from "@server/db/schema";
import { eq } from "drizzle-orm";
import { sendEmail } from "@server/emails";
import config from "@server/config";
import { VerifyEmail } from "@server/emails/templates/VerifyEmailCode";

export async function sendEmailVerificationCode(
    email: string,
    userId: string
): Promise<void> {
    const code = await generateEmailVerificationCode(userId, email);

    await sendEmail(
        VerifyEmail({
            username: email,
            verificationCode: code,
            verifyLink: `${config.app.base_url}/auth/verify-email`
        }),
        {
            to: email,
            from: config.email?.no_reply,
            subject: "Verify your email address"
        }
    );
}

async function generateEmailVerificationCode(
    userId: string,
    email: string
): Promise<string> {
    await db
        .delete(emailVerificationCodes)
        .where(eq(emailVerificationCodes.userId, userId));

    const code = generateRandomString(8, alphabet("0-9"));

    await db.insert(emailVerificationCodes).values({
        userId,
        email,
        code,
        expiresAt: createDate(new TimeSpan(15, "m")).getTime()
    });

    return code;
}
