import config from "@server/config";
import { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import HttpCode from "@server/types/HttpCode";
import { response } from "@server/utils";
import { db } from "@server/db";
import { passwordResetTokens, users } from "@server/db/schema";
import { eq } from "drizzle-orm";
import { sha256 } from "oslo/crypto";
import { hashPassword, verifyPassword } from "@server/auth/password";
import { verifyTotpCode } from "@server/auth/2fa";
import { passwordSchema } from "@server/auth/passwordSchema";
import { encodeHex } from "oslo/encoding";
import { isWithinExpirationDate } from "oslo";
import { invalidateAllSessions } from "@server/auth";
import logger from "@server/logger";
import ConfirmPasswordReset from "@server/emails/templates/NotifyResetPassword";
import { sendEmail } from "@server/emails";

export const resetPasswordBody = z
    .object({
        email: z.string().email(),
        token: z.string(), // reset secret code
        newPassword: passwordSchema,
        code: z.string().optional() // 2fa code
    })
    .strict();

export type ResetPasswordBody = z.infer<typeof resetPasswordBody>;

export type ResetPasswordResponse = {
    codeRequested?: boolean;
};

export async function resetPassword(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    const parsedBody = resetPasswordBody.safeParse(req.body);

    if (!parsedBody.success) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                fromError(parsedBody.error).toString()
            )
        );
    }

    const { token, newPassword, code, email } = parsedBody.data;

    try {
        const resetRequest = await db
            .select()
            .from(passwordResetTokens)
            .where(eq(passwordResetTokens.email, email));

        if (!resetRequest || !resetRequest.length) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "Invalid password reset token"
                )
            );
        }

        if (!isWithinExpirationDate(new Date(resetRequest[0].expiresAt))) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "Password reset token has expired"
                )
            );
        }

        const user = await db
            .select()
            .from(users)
            .where(eq(users.userId, resetRequest[0].userId));

        if (!user || !user.length) {
            return next(
                createHttpError(
                    HttpCode.INTERNAL_SERVER_ERROR,
                    "User not found"
                )
            );
        }

        if (user[0].twoFactorEnabled) {
            if (!code) {
                return response<ResetPasswordResponse>(res, {
                    data: { codeRequested: true },
                    success: true,
                    error: false,
                    message: "Two-factor authentication required",
                    status: HttpCode.ACCEPTED
                });
            }

            const validOTP = await verifyTotpCode(
                code!,
                user[0].twoFactorSecret!,
                user[0].userId
            );

            if (!validOTP) {
                return next(
                    createHttpError(
                        HttpCode.BAD_REQUEST,
                        "Invalid two-factor authentication code"
                    )
                );
            }
        }

        const isTokenValid = await verifyPassword(
            token,
            resetRequest[0].tokenHash
        );

        if (!isTokenValid) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "Invalid password reset token"
                )
            );
        }

        const passwordHash = await hashPassword(newPassword);

        await invalidateAllSessions(resetRequest[0].userId);

        await db.transaction(async (trx) => {
            await trx
                .update(users)
                .set({ passwordHash })
                .where(eq(users.userId, resetRequest[0].userId));

            await trx
                .delete(passwordResetTokens)
                .where(eq(passwordResetTokens.email, email));
        });

        await sendEmail(ConfirmPasswordReset({ email }), {
            from: config.getRawConfig().email?.no_reply,
            to: email,
            subject: "Password Reset Confirmation"
        });

        return response<ResetPasswordResponse>(res, {
            data: null,
            success: true,
            error: false,
            message: "Password reset successfully",
            status: HttpCode.OK
        });
    } catch (e) {
        logger.error(e);
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Failed to reset password"
            )
        );
    }
}
