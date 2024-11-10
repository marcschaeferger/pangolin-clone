import { verify } from "@node-rs/argon2";
import {
    createSession,
    generateSessionToken,
    verifySession,
} from "@server/auth";
import db from "@server/db";
import { newts } from "@server/db/schema";
import HttpCode from "@server/types/HttpCode";
import response from "@server/utils/response";
import { eq } from "drizzle-orm";
import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import config from "@server/config";
import { validateNewtSessionToken } from "@server/auth/newt";

export const newtGetTokenBodySchema = z.object({
    newtId: z.string().email(),
    secret: z.string(),
    token: z.string().optional(),
});

export type NewtGetTokenBody = z.infer<typeof newtGetTokenBodySchema>;

export async function newtGetToken(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    const parsedBody = newtGetTokenBodySchema.safeParse(req.body);

    if (!parsedBody.success) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                fromError(parsedBody.error).toString()
            )
        );
    }

    const { newtId, secret, token } = parsedBody.data;

    try {
        if (token) {
            const { session, newt } = await validateNewtSessionToken(
                token
            );
            if (session) {
                return response<null>(res, {
                    data: null,
                    success: true,
                    error: false,
                    message: "Token session already valid",
                    status: HttpCode.OK,
                });
            }
        }

        const existingNewtRes = await db
            .select()
            .from(newts)
            .where(eq(newts.newtId, newtId));
        if (!existingNewtRes || !existingNewtRes.length) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "No newt found with that newtId"
                )
            );
        }

        const existingNewt = existingNewtRes[0];

        const validSecret = await verify(
            existingNewt.secretHash,
            secret,
            {
                memoryCost: 19456,
                timeCost: 2,
                outputLen: 32,
                parallelism: 1,
            }
        );
        if (!validSecret) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "Secret is incorrect"
                )
            );
        }

        const resToken = generateSessionToken();
        await createSession(resToken, existingNewt.newtId);

        return response<{ token: string }>(res, {
            data: {
                token: resToken
            },
            success: true,
            error: false,
            message: "Token created successfully",
            status: HttpCode.OK,
        });
    } catch (e) {
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Failed to authenticate newt"
            )
        );
    }
}
