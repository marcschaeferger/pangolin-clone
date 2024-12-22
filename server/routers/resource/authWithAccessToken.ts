import { generateSessionToken } from "@server/auth";
import db from "@server/db";
import { resourceAccessToken, resources } from "@server/db/schema";
import HttpCode from "@server/types/HttpCode";
import response from "@server/utils/response";
import { eq, and } from "drizzle-orm";
import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import {
    createResourceSession,
    serializeResourceSessionCookie
} from "@server/auth/resource";
import config from "@server/config";
import logger from "@server/logger";
import { verify } from "@node-rs/argon2";
import { isWithinExpirationDate } from "oslo";
import { verifyPassword } from "@server/auth/password";

const authWithAccessTokenBodySchema = z
    .object({
        accessToken: z.string(),
        accessTokenId: z.string()
    })
    .strict();

const authWithAccessTokenParamsSchema = z
    .object({
        resourceId: z
            .string()
            .transform(Number)
            .pipe(z.number().int().positive())
    })
    .strict();

export type AuthWithAccessTokenResponse = {
    session?: string;
};

export async function authWithAccessToken(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    const parsedBody = authWithAccessTokenBodySchema.safeParse(req.body);

    if (!parsedBody.success) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                fromError(parsedBody.error).toString()
            )
        );
    }

    const parsedParams = authWithAccessTokenParamsSchema.safeParse(req.params);

    if (!parsedParams.success) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                fromError(parsedParams.error).toString()
            )
        );
    }

    const { resourceId } = parsedParams.data;
    const { accessToken, accessTokenId } = parsedBody.data;

    try {
        const [result] = await db
            .select()
            .from(resourceAccessToken)
            .where(
                and(
                    eq(resourceAccessToken.resourceId, resourceId),
                    eq(resourceAccessToken.accessTokenId, accessTokenId)
                )
            )
            .leftJoin(
                resources,
                eq(resources.resourceId, resourceAccessToken.resourceId)
            )
            .limit(1);

        const resource = result?.resources;
        const tokenItem = result?.resourceAccessToken;

        if (!tokenItem) {
            return next(
                createHttpError(
                    HttpCode.UNAUTHORIZED,
                    createHttpError(
                        HttpCode.BAD_REQUEST,
                        "Access token does not exist for resource"
                    )
                )
            );
        }

        if (!resource) {
            return next(
                createHttpError(HttpCode.BAD_REQUEST, "Resource does not exist")
            );
        }

        const validCode = await verifyPassword(tokenItem.tokenHash, accessToken);

        if (!validCode) {
            return next(
                createHttpError(HttpCode.UNAUTHORIZED, "Invalid access token")
            );
        }

        if (
            tokenItem.expiresAt &&
            !isWithinExpirationDate(new Date(tokenItem.expiresAt))
        ) {
            return next(
                createHttpError(
                    HttpCode.UNAUTHORIZED,
                    "Access token has expired"
                )
            );
        }

        const token = generateSessionToken();
        await createResourceSession({
            resourceId,
            token,
            accessTokenId: tokenItem.accessTokenId,
            sessionLength: tokenItem.sessionLength,
            expiresAt: tokenItem.expiresAt,
            doNotExtend: tokenItem.expiresAt ? false : true
        });
        const cookieName = `${config.server.resource_session_cookie_name}_${resource.resourceId}`;
        const cookie = serializeResourceSessionCookie(cookieName, token);
        res.appendHeader("Set-Cookie", cookie);

        return response<AuthWithAccessTokenResponse>(res, {
            data: {
                session: token
            },
            success: true,
            error: false,
            message: "Authenticated with resource successfully",
            status: HttpCode.OK
        });
    } catch (e) {
        logger.error(e);
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Failed to authenticate with resource"
            )
        );
    }
}
