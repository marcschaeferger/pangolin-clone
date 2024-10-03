import { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import { decodeHex } from "oslo/encoding";
import { TOTPController } from "oslo/otp";
import HttpCode from "@server/types/HttpCode";
import { verifySession, unauthorized } from "@server/auth";
import { response } from "@server/utils";
import { db } from "@server/db";
import { users } from "@server/db/schema";
import { eq } from "drizzle-orm";

export const verifyTotpBody = z.object({
    code: z.string(),
});

export type VerifyTotpBody = z.infer<typeof verifyTotpBody>;

export type VerifyTotpResponse = {
    valid: boolean;
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

    const { session, user } = await verifySession(req);
    if (!session) {
        return next(unauthorized());
    }

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

    const totpController = new TOTPController();
    const valid = await totpController.verify(
        code,
        decodeHex(user.twoFactorSecret),
    );

    if (valid) {
        // if valid, enable two-factor authentication; the totp secret is no longer temporary
        await db
            .update(users)
            .set({ twoFactorEnabled: true })
            .where(eq(users.id, user.id));
    }

    return response<{ valid: boolean }>(res, {
        data: { valid },
        success: true,
        error: false,
        message: valid ? "Code is valid" : "Code is invalid",
        status: HttpCode.OK,
    });
}
