import { verify } from "@node-rs/argon2";
import lucia, { verifySession } from "@server/auth";
import db from "@server/db";
import { users } from "@server/db/schema";
import HttpCode from "@server/types/HttpCode";
import response from "@server/utils/response";
import { eq } from "drizzle-orm";
import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import { verifyTotpCode } from "@server/auth/2fa";

export const loginBodySchema = z.object({
    email: z.string().email(),
    password: z.string(),
    code: z.string().optional(),
});

export type LoginBody = z.infer<typeof loginBodySchema>;

export type LoginResponse = {
    codeRequested?: boolean;
    emailVerificationRequired?: boolean;
};

export async function login(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<any> {
    const parsedBody = loginBodySchema.safeParse(req.body);

    if (!parsedBody.success) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                fromError(parsedBody.error).toString(),
            ),
        );
    }

    const { email, password, code } = parsedBody.data;

    try {
        const { session: existingSession } = await verifySession(req);
        if (existingSession) {
            return response<null>(res, {
                data: null,
                success: true,
                error: false,
                message: "Already logged in",
                status: HttpCode.OK,
            });
        }

        const existingUserRes = await db
            .select()
            .from(users)
            .where(eq(users.email, email));
        if (!existingUserRes || !existingUserRes.length) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "Username or password is incorrect",
                ),
            );
        }

        const existingUser = existingUserRes[0];

        const validPassword = await verify(
            existingUser.passwordHash,
            password,
            {
                memoryCost: 19456,
                timeCost: 2,
                outputLen: 32,
                parallelism: 1,
            },
        );
        if (!validPassword) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "Username or password is incorrect",
                ),
            );
        }

        if (existingUser.twoFactorEnabled) {
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
                code,
                existingUser.twoFactorSecret!,
                existingUser.id,
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

        const session = await lucia.createSession(existingUser.id, {});
        res.appendHeader(
            "Set-Cookie",
            lucia.createSessionCookie(session.id).serialize(),
        );

        if (!existingUser.emailVerified) {
            return response<LoginResponse>(res, {
                data: { emailVerificationRequired: true },
                success: true,
                error: false,
                message: "Email verification code sent",
                status: HttpCode.ACCEPTED,
            });
        }

        return response<null>(res, {
            data: null,
            success: true,
            error: false,
            message: "Logged in successfully",
            status: HttpCode.OK,
        });
    } catch (e) {
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Failed to authenticate user",
            ),
        );
    }
}
