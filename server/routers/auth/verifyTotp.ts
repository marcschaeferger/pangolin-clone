import { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import { decodeHex } from "oslo/encoding";
import { TOTPController } from "oslo/otp";
import HttpCode from "@server/types/HttpCode";
import { verifySession, lucia, unauthorized } from "@server/auth";

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
        return unauthorized();
    }
}
