import { generateSessionToken } from "@server/auth/sessions/app";
import db from "@server/db";
import { resourceAccessToken, resources } from "@server/db/schema";
import HttpCode from "@server/types/HttpCode";
import response from "@server/lib/response";
import { eq, and } from "drizzle-orm";
import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import {
    createResourceSession,
    serializeResourceSessionCookie
} from "@server/auth/sessions/resource";
import config from "@server/lib/config";
import logger from "@server/logger";
import { verifyResourceAccessToken } from "@server/auth/verifyResourceAccessToken";

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
        const [resource] = await db
            .select()
            .from(resources)
            .where(eq(resources.resourceId, resourceId))
            .limit(1);

        if (!resource) {
            return next(
                createHttpError(HttpCode.NOT_FOUND, "Resource not found")
            );
        }

        const { valid, error, tokenItem } = await verifyResourceAccessToken({
            resource,
            accessTokenId,
            accessToken
        });

        if (!valid) {
            return next(
                createHttpError(
                    HttpCode.UNAUTHORIZED,
                    error || "Invalid access token"
                )
            );
        }

        if (!tokenItem || !resource) {
            return next(
                createHttpError(
                    HttpCode.UNAUTHORIZED,
                    "Access token does not exist for resource"
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
            doNotExtend: tokenItem.expiresAt ? true : false
        });
        const cookieName = `${config.getRawConfig().server.resource_session_cookie_name}_${resource.resourceId}`;
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
