import { verify } from "@node-rs/argon2";
import lucia from "@server/auth";
import db from "@server/db";
import { users } from "@server/db/schema";
import logger from "@server/logger";
import HttpCode from "@server/types/HttpCode";
import response from "@server/utils/response";
import { eq } from "drizzle-orm";
import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { z } from "zod";
import { fromError } from "zod-validation-error";

export const loginBodySchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

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

    const { email, password } = parsedBody.data;

    const sessionId = req.cookies[lucia.sessionCookieName];
    const { session: existingSession } = await lucia.validateSession(sessionId);
    if (existingSession) {
        return res.status(HttpCode.OK).send(
            response<null>({
                data: null,
                success: true,
                error: false,
                message: "Already logged in",
                status: HttpCode.OK,
            }),
        );
    }

    const existingUserRes = await db
        .select()
        .from(users)
        .where(eq(users.email, email));
    if (!existingUserRes || !existingUserRes.length) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                "A user with that email address does not exist",
            ),
        );
    }

    const existingUser = existingUserRes[0];

    const validPassword = await verify(existingUser.passwordHash, password, {
        memoryCost: 19456,
        timeCost: 2,
        outputLen: 32,
        parallelism: 1,
    });
    if (!validPassword) {
        await new Promise((resolve) => setTimeout(resolve, 500)); // delay to prevent brute force attacks
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                "The password you entered is incorrect",
            ),
        );
    }

    const session = await lucia.createSession(existingUser.id, {});
    res.appendHeader(
        "Set-Cookie",
        lucia.createSessionCookie(session.id).serialize(),
    );

    return res.status(HttpCode.OK).send(
        response<null>({
            data: null,
            success: true,
            error: false,
            message: "Logged in successfully",
            status: HttpCode.OK,
        }),
    );
}
