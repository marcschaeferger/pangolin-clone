import db from "@server/db";
import { resourceOtp } from "@server/db/schema";
import { and, eq } from "drizzle-orm";
import { createDate, isWithinExpirationDate, TimeSpan } from "oslo";
import { alphabet, generateRandomString, sha256 } from "oslo/crypto";
import { encodeHex } from "oslo/encoding";
import { sendEmail } from "@server/emails";
import ResourceOTPCode from "@server/emails/templates/ResourceOTPCode";
import config from "@server/config";
import { hash, verify } from "@node-rs/argon2";
import { hashPassword } from "./password";

export async function sendResourceOtpEmail(
    email: string,
    resourceId: number,
    resourceName: string,
    orgName: string
): Promise<void> {
    const otp = await generateResourceOtpCode(resourceId, email);

    await sendEmail(
        ResourceOTPCode({
            email,
            resourceName,
            orgName,
            otp
        }),
        {
            to: email,
            from: config.email?.no_reply,
            subject: `Your one-time code to access ${resourceName}`
        }
    );
}

export async function generateResourceOtpCode(
    resourceId: number,
    email: string
): Promise<string> {
    await db
        .delete(resourceOtp)
        .where(
            and(
                eq(resourceOtp.email, email),
                eq(resourceOtp.resourceId, resourceId)
            )
        );

    const otp = generateRandomString(8, alphabet("0-9", "A-Z", "a-z"));

    const otpHash = await hashPassword(otp);

    await db.insert(resourceOtp).values({
        resourceId,
        email,
        otpHash,
        expiresAt: createDate(new TimeSpan(15, "m")).getTime()
    });

    return otp;
}

export async function isValidOtp(
    email: string,
    resourceId: number,
    otp: string
): Promise<boolean> {
    const record = await db
        .select()
        .from(resourceOtp)
        .where(
            and(
                eq(resourceOtp.email, email),
                eq(resourceOtp.resourceId, resourceId)
            )
        )
        .limit(1);

    if (record.length === 0) {
        return false;
    }

    const validCode = await verifyPassword(otp, record[0].otpHash);
    if (!validCode) {
        return false;
    }

    if (!isWithinExpirationDate(new Date(record[0].expiresAt))) {
        return false;
    }

    return true;
}
