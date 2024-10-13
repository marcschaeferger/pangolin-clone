import { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import HttpCode from "@server/types/HttpCode";
import { fromError } from "zod-validation-error";
import { unauthorized, invalidateAllSessions } from "@server/auth";
import { z } from "zod";
import { db } from "@server/db";
import { User, users } from "@server/db/schema";
import { eq } from "drizzle-orm";
import { response } from "@server/utils";
import { hashPassword, verifyPassword } from "@server/auth/password";
import { verifyTotpCode } from "@server/auth/2fa";
import { passwordSchema } from "@server/auth/passwordSchema";

export const changePasswordBody = z.object({
    oldPassword: z.string(),
    newPassword: passwordSchema,
    code: z.string().optional(),
});

export type ChangePasswordBody = z.infer<typeof changePasswordBody>;

export type ChangePasswordResponse = {
    codeRequested?: boolean;
};

export async function changePassword(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<any> {
    const parsedBody = changePasswordBody.safeParse(req.body);

    if (!parsedBody.success) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                fromError(parsedBody.error).toString(),
            ),
        );
    }

    const { newPassword, oldPassword, code } = parsedBody.data;
    const user = req.user as User;

    try {
        if (newPassword === oldPassword) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "New password cannot be the same as the old password",
                ),
            );
        }

        const validPassword = await verifyPassword(
            oldPassword,
            user.passwordHash,
        );
        if (!validPassword) {
            return next(unauthorized());
        }

        if (user.twoFactorEnabled) {
            if (!code) {
                return response<{ codeRequested: boolean }>(res, {
                    data: { codeRequested: true },
                    success: true,
                    error: false,
                    message: "Two-factor authentication required",
                    status: HttpCode.ACCEPTED,
                });
            }
            const validOTP = await verifyTotpCode(
                code!,
                user.twoFactorSecret!,
                user.userId,
            );

            if (!validOTP) {
                return next(
                    createHttpError(
                        HttpCode.BAD_REQUEST,
                        "The two-factor code you entered is incorrect",
                    ),
                );
            }
        }

        const hash = await hashPassword(newPassword);

        await db
            .update(users)
            .set({
                passwordHash: hash,
            })
            .where(eq(users.userId, user.userId));

        await invalidateAllSessions(user.userId);

        // TODO: send email to user confirming password change

        return response(res, {
            data: null,
            success: true,
            error: false,
            message: "Password changed successfully",
            status: HttpCode.OK,
        });
    } catch (error) {
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Failed to authenticate user",
            ),
        );
    }
}
