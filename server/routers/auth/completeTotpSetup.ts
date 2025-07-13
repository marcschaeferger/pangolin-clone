import { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import HttpCode from "@server/types/HttpCode";
import { response } from "@server/lib";
import { db } from "@server/db";
import { twoFactorBackupCodes, users } from "@server/db";
import { eq, and } from "drizzle-orm";
import { alphabet, generateRandomString } from "oslo/crypto";
import { hashPassword, verifyPassword } from "@server/auth/password";
import { verifyTotpCode } from "@server/auth/totp";
import logger from "@server/logger";
import { sendEmail } from "@server/emails";
import TwoFactorAuthNotification from "@server/emails/templates/TwoFactorAuthNotification";
import config from "@server/lib/config";
import { UserType } from "@server/types/UserTypes";

export const completeTotpSetupBody = z
    .object({
        email: z.string().email(),
        password: z.string(),
        code: z.string()
    })
    .strict();

export type CompleteTotpSetupBody = z.infer<typeof completeTotpSetupBody>;

export type CompleteTotpSetupResponse = {
    valid: boolean;
    backupCodes?: string[];
};

export async function completeTotpSetup(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    const parsedBody = completeTotpSetupBody.safeParse(req.body);

    if (!parsedBody.success) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                fromError(parsedBody.error).toString()
            )
        );
    }

    const { email, password, code } = parsedBody.data;

    try {
        // Find the user by email
        const [user] = await db
            .select()
            .from(users)
            .where(and(eq(users.email, email), eq(users.type, UserType.Internal)))
            .limit(1);

        if (!user) {
            return next(
                createHttpError(
                    HttpCode.UNAUTHORIZED,
                    "Invalid credentials"
                )
            );
        }

        // Verify password
        const validPassword = await verifyPassword(password, user.passwordHash!);
        if (!validPassword) {
            return next(
                createHttpError(
                    HttpCode.UNAUTHORIZED,
                    "Invalid credentials"
                )
            );
        }

        // Check if 2FA is enabled but not yet completed
        if (!user.twoFactorEnabled) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "Two-factor authentication is not required for this user"
                )
            );
        }

        if (!user.twoFactorSecret) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "User has not started two-factor authentication setup"
                )
            );
        }

        // Verify the TOTP code
        const valid = await verifyTotpCode(
            code,
            user.twoFactorSecret,
            user.userId
        );

        if (!valid) {
            if (config.getRawConfig().app.log_failed_attempts) {
                logger.info(
                    `Two-factor authentication code is incorrect. Email: ${email}. IP: ${req.ip}.`
                );
            }
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "Invalid two-factor authentication code"
                )
            );
        }

        // Generate backup codes and finalize setup
        let codes: string[] = [];
        await db.transaction(async (trx) => {
            // Note: We don't set twoFactorEnabled to true here because it's already true
            // We just need to generate backup codes since the setup is now complete
            
            const backupCodes = await generateBackupCodes();
            codes = backupCodes;
            for (const code of backupCodes) {
                const hash = await hashPassword(code);

                await trx.insert(twoFactorBackupCodes).values({
                    userId: user.userId,
                    codeHash: hash
                });
            }
        });

        // Send notification email
        sendEmail(
            TwoFactorAuthNotification({
                email: user.email!,
                enabled: true
            }),
            {
                to: user.email!,
                from: config.getRawConfig().email?.no_reply,
                subject: "Two-factor authentication enabled"
            }
        );

        return response<CompleteTotpSetupResponse>(res, {
            data: {
                valid: true,
                backupCodes: codes
            },
            success: true,
            error: false,
            message: "Two-factor authentication setup completed successfully",
            status: HttpCode.OK
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Failed to complete two-factor authentication setup"
            )
        );
    }
}

async function generateBackupCodes(): Promise<string[]> {
    const codes = [];
    for (let i = 0; i < 10; i++) {
        const code = generateRandomString(6, alphabet("0-9", "A-Z", "a-z"));
        codes.push(code);
    }
    return codes;
}