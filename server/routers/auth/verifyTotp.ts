import { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import HttpCode from "@server/types/HttpCode";
import { response } from "@server/utils";
import { db } from "@server/db";
import { twoFactorBackupCodes, User, users } from "@server/db/schema";
import { eq } from "drizzle-orm";
import { alphabet, generateRandomString } from "oslo/crypto";
import { hashPassword } from "./password";
import { verifyTotpCode } from "./2fa";

export const verifyTotpBody = z.object({
    code: z.string(),
});

export type VerifyTotpBody = z.infer<typeof verifyTotpBody>;

export type VerifyTotpResponse = {
    valid: boolean;
    backupCodes: string[];
};

export async function verifyTotp(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<any> {
    const parsedBody = verifyTotpBody.safeParse(req.body);

    if (!parsedBody.success) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                fromError(parsedBody.error).toString(),
            ),
        );
    }

    const { code } = parsedBody.data;

    const user = req.user as User;

    if (user.twoFactorEnabled) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                "Two-factor authentication is already enabled",
            ),
        );
    }

    if (!user.twoFactorSecret) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                "User has not requested two-factor authentication",
            ),
        );
    }

    try {
        const valid = await verifyTotpCode(code, user.twoFactorSecret, user.id);

        const backupCodes = await generateBackupCodes();
        for (const code of backupCodes) {
            const hash = await hashPassword(code);

            await db.insert(twoFactorBackupCodes).values({
                userId: user.id,
                codeHash: hash,
            });
        }

        if (valid) {
            // if valid, enable two-factor authentication; the totp secret is no longer temporary
            await db
                .update(users)
                .set({ twoFactorEnabled: true })
                .where(eq(users.id, user.id));
        }

        return response<VerifyTotpResponse>(res, {
            data: { valid, backupCodes },
            success: true,
            error: false,
            message: valid
                ? "Code is valid. Two-factor is now enabled"
                : "Code is invalid",
            status: HttpCode.OK,
        });
    } catch (error) {
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Failed to verify two-factor authentication code",
            ),
        );
    }
}

async function generateBackupCodes(): Promise<string[]> {
    const codes = [];
    for (let i = 0; i < 10; i++) {
        const code = generateRandomString(8, alphabet("0-9", "A-Z", "a-z"));
        codes.push(code);
    }
    return codes;
}
