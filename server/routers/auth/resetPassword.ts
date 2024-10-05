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
import { hashPassword } from "./password";
import { verifyTotpCode } from "./2fa";
import { passwordSchema } from "./passwordSchema";
import { encodeHex } from "oslo/encoding";
import { isWithinExpirationDate } from "oslo";
import lucia from "@server/auth";

export const resetPasswordBody = z.object({
    token: z.string(),
    newPassword: passwordSchema,
    code: z.string().optional(),
});

export type ResetPasswordBody = z.infer<typeof resetPasswordBody>;

export type ResetPasswordResponse = {
    codeRequested?: boolean;
};

export async function resetPassword(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<any> {
    const parsedBody = resetPasswordBody.safeParse(req.body);

    if (!parsedBody.success) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                fromError(parsedBody.error).toString(),
            ),
        );
    }

    const { token, newPassword, code } = parsedBody.data;

    try {
        const tokenHash = encodeHex(
            await sha256(new TextEncoder().encode(token)),
        );

        const resetRequest = await db
            .select()
            .from(passwordResetTokens)
            .where(eq(passwordResetTokens.tokenHash, tokenHash));

        if (
            !resetRequest ||
            !resetRequest.length ||
            !isWithinExpirationDate(new Date(resetRequest[0].expiresAt))
        ) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "Invalid or expired password reset token",
                ),
            );
        }

        const user = await db
            .select()
            .from(users)
            .where(eq(users.id, resetRequest[0].userId));

        if (!user || !user.length) {
            return next(
                createHttpError(
                    HttpCode.INTERNAL_SERVER_ERROR,
                    "User not found",
                ),
            );
        }

        if (user[0].twoFactorEnabled) {
            if (!code) {
                return response<ResetPasswordResponse>(res, {
                    data: { codeRequested: true },
                    success: true,
                    error: false,
                    message: "Two-factor authentication required",
                    status: HttpCode.ACCEPTED,
                });
            }

            const validOTP = await verifyTotpCode(
                code!,
                user[0].twoFactorSecret!,
                user[0].id,
            );

            if (!validOTP) {
                return next(
                    createHttpError(
                        HttpCode.BAD_REQUEST,
                        "Invalid two-factor authentication code",
                    ),
                );
            }
        }

        const passwordHash = await hashPassword(newPassword);

        await lucia.invalidateUserSessions(resetRequest[0].userId);

        await db
            .update(users)
            .set({ passwordHash })
            .where(eq(users.id, resetRequest[0].userId));

        await db
            .delete(passwordResetTokens)
            .where(eq(passwordResetTokens.tokenHash, tokenHash));

        // TODO: send email to user confirming password reset

        return response<ResetPasswordResponse>(res, {
            data: null,
            success: true,
            error: false,
            message: "Password reset successfully",
            status: HttpCode.OK,
        });
    } catch (e) {
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Failed to reset password",
            ),
        );
    }
}
