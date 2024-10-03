import { Request, Response, NextFunction } from "express";
import { verifySession } from "@server/auth";
import createHttpError from "http-errors";
import HttpCode from "@server/types/HttpCode";
import { fromError } from "zod-validation-error";
import { unauthorized } from "@server/auth";
import { z } from "zod";
import { verify } from "@node-rs/argon2";
import { db } from "@server/db";
import { users } from "@server/db/schema";
import { eq } from "drizzle-orm";
import { response } from "@server/utils";

export const disable2faBody = z.object({
    password: z.string(),
});

export type Disable2faBody = z.infer<typeof disable2faBody>;

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

    const { password } = parsedBody.data;

    const { session, user } = await verifySession(req);
    if (!session) {
        return next(unauthorized());
    }

    const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.id, user.id));

    if (!existingUser || !existingUser[0]) {
        return next(
            createHttpError(HttpCode.BAD_REQUEST, "User does not exist"),
        );
    }

    const validPassword = await verify(existingUser[0].passwordHash, password, {
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
}
