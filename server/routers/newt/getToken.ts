import { generateSessionToken } from "@server/auth/sessions/app";
import { db } from "@server/db";
import { newts } from "@server/db";
import HttpCode from "@server/types/HttpCode";
import response from "@server/lib/response";
import { eq } from "drizzle-orm";
import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import {
    createNewtSession,
    validateNewtSessionToken
} from "@server/auth/sessions/newt";
import { verifyPassword } from "@server/auth/password";
import logger from "@server/logger";
import config from "@server/lib/config";

export const newtGetTokenBodySchema = z.object({
    newtId: z.string(),
    secret: z.string(),
    token: z.string().optional()
});

export type NewtGetTokenBody = z.infer<typeof newtGetTokenBodySchema>;

export async function getToken(
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
            const { session, newt } = await validateNewtSessionToken(token);
            if (session) {
                if (config.getRawConfig().app.log_failed_attempts) {
                    logger.info(
                        `Newt session already valid. Newt ID: ${newtId}. IP: ${req.ip}.`
                    );
                }
                return response<null>(res, {
                    data: null,
                    success: true,
                    error: false,
                    message: "Token session already valid",
                    status: HttpCode.OK
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

        const validSecret = await verifyPassword(
            secret,
            existingNewt.secretHash
        );
        if (!validSecret) {
            if (config.getRawConfig().app.log_failed_attempts) {
                logger.info(
                    `Newt id or secret is incorrect. Newt: ID ${newtId}. IP: ${req.ip}.`
                );
            }
            return next(
                createHttpError(HttpCode.BAD_REQUEST, "Secret is incorrect")
            );
        }

        const resToken = generateSessionToken();
        await createNewtSession(resToken, existingNewt.newtId);

        return response<{ token: string }>(res, {
            data: {
                token: resToken
            },
            success: true,
            error: false,
            message: "Token created successfully",
            status: HttpCode.OK
        });
    } catch (e) {
        console.error(e);
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Failed to authenticate newt"
            )
        );
    }
}
