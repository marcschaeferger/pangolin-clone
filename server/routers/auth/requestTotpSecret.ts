import { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import { encodeHex } from "oslo/encoding";
import HttpCode from "@server/types/HttpCode";
import { response } from "@server/lib";
import { db } from "@server/db";
import { User, users } from "@server/db";
import { eq } from "drizzle-orm";
import { createTOTPKeyURI } from "oslo/otp";
import logger from "@server/logger";
import { verifyPassword } from "@server/auth/password";
import { unauthorized } from "@server/auth/unauthorizedResponse";
import { UserType } from "@server/types/UserTypes";

export const requestTotpSecretBody = z
    .object({
        password: z.string()
    })
    .strict();

export type RequestTotpSecretBody = z.infer<typeof requestTotpSecretBody>;

export type RequestTotpSecretResponse = {
    secret: string;
    uri: string;
};

export async function requestTotpSecret(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    const parsedBody = requestTotpSecretBody.safeParse(req.body);

    if (!parsedBody.success) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                fromError(parsedBody.error).toString()
            )
        );
    }

    const { password } = parsedBody.data;

    const user = req.user as User;

    if (user.type !== UserType.Internal) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                "Two-factor authentication is not supported for external users"
            )
        );
    }

    try {
        const validPassword = await verifyPassword(password, user.passwordHash!);
        if (!validPassword) {
            return next(unauthorized());
        }

        if (user.twoFactorEnabled) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "User has already enabled two-factor authentication"
                )
            );
        }

        const hex = crypto.getRandomValues(new Uint8Array(20));
        const secret = encodeHex(hex);
        const uri = createTOTPKeyURI("Pangolin", user.email!, hex);

        await db
            .update(users)
            .set({
                twoFactorSecret: secret
            })
            .where(eq(users.userId, user.userId));

        return response<RequestTotpSecretResponse>(res, {
            data: {
                secret,
                uri
            },
            success: true,
            error: false,
            message: "TOTP secret generated successfully",
            status: HttpCode.OK
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Failed to generate TOTP secret"
            )
        );
    }
}
