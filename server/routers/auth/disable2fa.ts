import { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import HttpCode from "@server/types/HttpCode";
import { fromError } from "zod-validation-error";
import { unauthorized } from "@server/auth";
import { z } from "zod";
import { verify } from "@node-rs/argon2";
import { db } from "@server/db";
import { User, users } from "@server/db/schema";
import { eq } from "drizzle-orm";
import { response } from "@server/utils";
import { decodeHex } from "oslo/encoding";
import { TOTPController } from "oslo/otp";

export const disable2faBody = z.object({
    password: z.string(),
    code: z.string().optional(),
});

export type Disable2faBody = z.infer<typeof disable2faBody>;

export type Disable2faResponse = {
    codeRequested?: boolean;
};

export async function disable2fa(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<any> {
    const parsedBody = disable2faBody.safeParse(req.body);

    if (!parsedBody.success) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                fromError(parsedBody.error).toString(),
            ),
        );
    }

    const { password, code } = parsedBody.data;
    const user = req.user as User;

    try {
        const validPassword = await verify(user.passwordHash, password, {
            memoryCost: 19456,
            timeCost: 2,
            outputLen: 32,
            parallelism: 1,
        });
        if (!validPassword) {
            await new Promise((resolve) => setTimeout(resolve, 250)); // delay to prevent brute force attacks
            return next(unauthorized());
        }

        if (!user.twoFactorEnabled) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "Two-factor authentication is already disabled",
                ),
            );
        } else {
            if (!code) {
                return response<{ codeRequested: boolean }>(res, {
                    data: { codeRequested: true },
                    success: true,
                    error: false,
                    message: "Two-factor authentication required",
                    status: HttpCode.ACCEPTED,
                });
            }
        }

        if (!user.twoFactorSecret) {
            return next(
                createHttpError(
                    HttpCode.INTERNAL_SERVER_ERROR,
                    "Failed to authenticate user",
                ),
            );
        }

        const validOTP = await new TOTPController().verify(
            code,
            decodeHex(user.twoFactorSecret),
        );

        if (!validOTP) {
            await new Promise((resolve) => setTimeout(resolve, 250)); // delay to prevent brute force attacks
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "The two-factor code you entered is incorrect",
                ),
            );
        }

        await db
            .update(users)
            .set({ twoFactorEnabled: false })
            .where(eq(users.id, user.id));

        return response<null>(res, {
            data: null,
            success: true,
            error: false,
            message: "Two-factor authentication disabled",
            status: HttpCode.OK,
        });
    } catch (error) {
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Failed to disable two-factor authentication",
            ),
        );
    }
}
