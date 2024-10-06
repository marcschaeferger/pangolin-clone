import { verify } from "@node-rs/argon2";
import db from "@server/db";
import { twoFactorBackupCodes } from "@server/db/schema";
import { eq } from "drizzle-orm";
import { decodeHex } from "oslo/encoding";
import { TOTPController } from "oslo/otp";

export async function verifyTotpCode(
    code: string,
    secret: string,
    userId: string,
): Promise<boolean> {
    if (code.length !== 6) {
        const validBackupCode = await verifyBackUpCode(code, userId);
        return validBackupCode;
    } else {
        const validOTP = await new TOTPController().verify(
            code,
            decodeHex(secret),
        );

        return validOTP;
    }
}

export async function verifyBackUpCode(
    code: string,
    userId: string,
): Promise<boolean> {
    const allHashed = await db
        .select()
        .from(twoFactorBackupCodes)
        .where(eq(twoFactorBackupCodes.userId, userId));

    if (!allHashed || !allHashed.length) {
        return false;
    }

    let validId;
    for (const hashedCode of allHashed) {
        const validCode = await verify(hashedCode.codeHash, code, {
            memoryCost: 19456,
            timeCost: 2,
            outputLen: 32,
            parallelism: 1,
        });
        if (validCode) {
            validId = hashedCode.id;
        }
    }

    if (validId) {
        await db
            .delete(twoFactorBackupCodes)
            .where(eq(twoFactorBackupCodes.id, validId));
    }

    return validId ? true : false;
}
