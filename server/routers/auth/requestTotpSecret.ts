import { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import { encodeHex } from "oslo/encoding";
import HttpCode from "@server/types/HttpCode";
import { unauthorized } from "@server/auth";
import { response } from "@server/utils";
import { db } from "@server/db";
import { User, users } from "@server/db/schema";
import { eq } from "drizzle-orm";
import { verify } from "@node-rs/argon2";
import { createTOTPKeyURI } from "oslo/otp";
import config from "@server/config";

export const requestTotpSecretBody = z.object({
    password: z.string(),
});

export type RequestTotpSecretBody = z.infer<typeof requestTotpSecretBody>;

export type RequestTotpSecretResponse = {
    secret: string;
};

export async function requestTotpSecret(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<any> {
    const parsedBody = requestTotpSecretBody.safeParse(req.body);

    if (!parsedBody.success) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                fromError(parsedBody.error).toString(),
            ),
        );
    }

    const { password } = parsedBody.data;

    const user = req.user as User;

    try {
        const validPassword = await verify(user.passwordHash, password, {
            memoryCost: 19456,
            timeCost: 2,
            outputLen: 32,
            parallelism: 1,
        });
        if (!validPassword) {
            return next(unauthorized());
        }

        if (user.twoFactorEnabled) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "User has already enabled two-factor authentication",
                ),
            );
        }

        const hex = crypto.getRandomValues(new Uint8Array(20));
        const secret = encodeHex(hex);
        const uri = createTOTPKeyURI(config.app.name, user.email, hex);

        await db
            .update(users)
            .set({
                twoFactorSecret: secret,
            })
            .where(eq(users.userId, user.userId));

        return response<RequestTotpSecretResponse>(res, {
            data: {
                secret: uri,
            },
            success: true,
            error: false,
            message: "TOTP secret generated successfully",
            status: HttpCode.OK,
        });
    } catch (error) {
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Failed to generate TOTP secret",
            ),
        );
    }
}
