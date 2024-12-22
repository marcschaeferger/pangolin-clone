import { verify } from "@node-rs/argon2";
import { generateSessionToken } from "@server/auth";
import db from "@server/db";
import { orgs, resourcePassword, resources } from "@server/db/schema";
import HttpCode from "@server/types/HttpCode";
import response from "@server/utils/response";
import { eq } from "drizzle-orm";
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

export const authWithPasswordBodySchema = z
    .object({
        password: z.string()
    })
    .strict();

export const authWithPasswordParamsSchema = z
    .object({
        resourceId: z
            .string()
            .transform(Number)
            .pipe(z.number().int().positive())
    })
    .strict();

export type AuthWithPasswordResponse = {
    session?: string;
};

export async function authWithPassword(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    const parsedBody = authWithPasswordBodySchema.safeParse(req.body);

    if (!parsedBody.success) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                fromError(parsedBody.error).toString()
            )
        );
    }

    const parsedParams = authWithPasswordParamsSchema.safeParse(req.params);

    if (!parsedParams.success) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                fromError(parsedParams.error).toString()
            )
        );
    }

    const { resourceId } = parsedParams.data;
    const { password } = parsedBody.data;

    try {
        const [result] = await db
            .select()
            .from(resources)
            .leftJoin(
                resourcePassword,
                eq(resourcePassword.resourceId, resources.resourceId)
            )
            .leftJoin(orgs, eq(orgs.orgId, resources.orgId))
            .where(eq(resources.resourceId, resourceId))
            .limit(1);

        const resource = result?.resources;
        const org = result?.orgs;
        const definedPassword = result?.resourcePassword;

        if (!org) {
            return next(
                createHttpError(HttpCode.BAD_REQUEST, "Resource does not exist")
            );
        }

        if (!resource) {
            return next(
                createHttpError(HttpCode.BAD_REQUEST, "Resource does not exist")
            );
        }

        if (!definedPassword) {
            return next(
                createHttpError(
                    HttpCode.UNAUTHORIZED,
                    createHttpError(
                        HttpCode.BAD_REQUEST,
                        "Resource has no password protection"
                    )
                )
            );
        }

        const validPassword = await verify(
            definedPassword.passwordHash,
            password,
            {
                memoryCost: 19456,
                timeCost: 2,
                outputLen: 32,
                parallelism: 1
            }
        );
        if (!validPassword) {
            return next(
                createHttpError(HttpCode.UNAUTHORIZED, "Incorrect password")
            );
        }

        const token = generateSessionToken();
        await createResourceSession({
            resourceId,
            token,
            passwordId: definedPassword.passwordId
        });
        const cookieName = `${config.server.resource_session_cookie_name}_${resource.resourceId}`;
        const cookie = serializeResourceSessionCookie(cookieName, token);
        res.appendHeader("Set-Cookie", cookie);

        return response<AuthWithPasswordResponse>(res, {
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
