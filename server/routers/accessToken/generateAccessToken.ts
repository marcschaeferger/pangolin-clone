import { hash } from "@node-rs/argon2";
import {
    generateId,
    generateIdFromEntropySize,
    SESSION_COOKIE_EXPIRES
} from "@server/auth";
import db from "@server/db";
import { ResourceAccessToken, resourceAccessToken, resources } from "@server/db/schema";
import HttpCode from "@server/types/HttpCode";
import response from "@server/utils/response";
import { eq } from "drizzle-orm";
import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import logger from "@server/logger";
import { createDate, TimeSpan } from "oslo";

export const generateAccessTokenBodySchema = z.object({
    validForSeconds: z.number().int().positive().optional(), // seconds
    title: z.string().optional(),
    description: z.string().optional()
});

export const generateAccssTokenParamsSchema = z.object({
    resourceId: z.string().transform(Number).pipe(z.number().int().positive())
});

export type GenerateAccessTokenResponse = ResourceAccessToken;

export async function generateAccessToken(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    const parsedBody = generateAccessTokenBodySchema.safeParse(req.body);

    if (!parsedBody.success) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                fromError(parsedBody.error).toString()
            )
        );
    }

    const parsedParams = generateAccssTokenParamsSchema.safeParse(req.params);

    if (!parsedParams.success) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                fromError(parsedParams.error).toString()
            )
        );
    }

    const { resourceId } = parsedParams.data;
    const { validForSeconds, title, description } = parsedBody.data;

    const [resource] = await db
        .select()
        .from(resources)
        .where(eq(resources.resourceId, resourceId));

    if (!resource) {
        return next(createHttpError(HttpCode.NOT_FOUND, "Resource not found"));
    }

    try {
        const sessionLength = validForSeconds
            ? validForSeconds * 1000
            : SESSION_COOKIE_EXPIRES;
        const expiresAt = validForSeconds
            ? createDate(new TimeSpan(validForSeconds, "s")).getTime()
            : undefined;

        const token = generateIdFromEntropySize(25);

        // const tokenHash = await hash(token, {
        //     memoryCost: 19456,
        //     timeCost: 2,
        //     outputLen: 32,
        //     parallelism: 1
        // });

        const id = generateId(15);
        const [result] = await db.insert(resourceAccessToken).values({
            accessTokenId: id,
            orgId: resource.orgId,
            resourceId,
            tokenHash: token,
            expiresAt: expiresAt || null,
            sessionLength: sessionLength,
            title: title || null,
            description: description || null,
            createdAt: new Date().getTime()
        }).returning();

        if (!result) {
            return next(
                createHttpError(
                    HttpCode.INTERNAL_SERVER_ERROR,
                    "Failed to generate access token"
                )
            );
        }

        return response<GenerateAccessTokenResponse>(res, {
            data: result,
            success: true,
            error: false,
            message: "Resource access token generated successfully",
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
