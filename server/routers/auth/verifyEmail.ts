import { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import HttpCode from "@server/types/HttpCode";
import { response } from "@server/utils";
import { db } from "@server/db";
import { User, emailVerificationCodes, users } from "@server/db/schema";
import { eq } from "drizzle-orm";
import { isWithinExpirationDate } from "oslo";

export const verifyEmailBody = z.object({
    code: z.string(),
});

export type VerifyEmailBody = z.infer<typeof verifyEmailBody>;

export type VerifyEmailResponse = {
    valid: boolean;
};

export async function verifyEmail(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<any> {
    const parsedBody = verifyEmailBody.safeParse(req.body);

    if (!parsedBody.success) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                fromError(parsedBody.error).toString(),
            ),
        );
    }

    const { code } = parsedBody.data;

    const user = req.user as User;

    if (user.emailVerified) {
        return next(
            createHttpError(HttpCode.BAD_REQUEST, "Email is already verified"),
        );
    }

    try {
        const valid = await isValidCode(user, code);

        if (valid) {
            await db
                .delete(emailVerificationCodes)
                .where(eq(emailVerificationCodes.userId, user.id));

            await db
                .update(users)
                .set({
                    emailVerified: true,
                })
                .where(eq(users.id, user.id));
        } else {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "Invalid verification code",
                ),
            );
        }

        return response<VerifyEmailResponse>(res, {
            success: true,
            error: false,
            message: "Email verified",
            status: HttpCode.OK,
            data: {
                valid,
            },
        });
    } catch (error) {
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Failed to verify email",
            ),
        );
    }
}

export default verifyEmail;

async function isValidCode(user: User, code: string): Promise<boolean> {
    const codeRecord = await db
        .select()
        .from(emailVerificationCodes)
        .where(eq(emailVerificationCodes.userId, user.id))
        .limit(1);

    if (user.email !== codeRecord[0].email) {
        return false;
    }

    if (codeRecord.length === 0) {
        return false;
    }

    if (codeRecord[0].code !== code) {
        return false;
    }

    if (!isWithinExpirationDate(new Date(codeRecord[0].expiresAt))) {
        return false;
    }

    return true;
}
