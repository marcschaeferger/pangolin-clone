import { hash } from "@node-rs/argon2";
import {
    generateId,
    generateIdFromEntropySize,
    SESSION_COOKIE_EXPIRES
} from "@server/auth/sessions/app";
import { db } from "@server/db";
import {
    ResourceAccessToken,
    resourceAccessToken,
    resources
} from "@server/db";
import HttpCode from "@server/types/HttpCode";
import response from "@server/lib/response";
import { eq } from "drizzle-orm";
import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import logger from "@server/logger";
import { createDate, TimeSpan } from "oslo";
import { hashPassword } from "@server/auth/password";
import { encodeHexLowerCase } from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";
import { OpenAPITags, registry } from "@server/openApi";

export const generateAccessTokenBodySchema = z
    .object({
        validForSeconds: z.number().int().positive().optional(), // seconds
        title: z.string().optional(),
        description: z.string().optional()
    })
    .strict();

export const generateAccssTokenParamsSchema = z
    .object({
        resourceId: z
            .string()
            .transform(Number)
            .pipe(z.number().int().positive())
    })
    .strict();

export type GenerateAccessTokenResponse = Omit<
    ResourceAccessToken,
    "tokenHash"
> & { accessToken: string };

registry.registerPath({
    method: "post",
    path: "/resource/{resourceId}/access-token",
    description: "Generate a new access token for a resource.",
    tags: [OpenAPITags.Resource, OpenAPITags.AccessToken],
    request: {
        params: generateAccssTokenParamsSchema,
        body: {
            content: {
                "application/json": {
                    schema: generateAccessTokenBodySchema
                }
            }
        }
    },
    responses: {}
});

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

        const token = generateIdFromEntropySize(16);

        const tokenHash = encodeHexLowerCase(
            sha256(new TextEncoder().encode(token))
        );

        const id = generateId(8);
        const [result] = await db
            .insert(resourceAccessToken)
            .values({
                accessTokenId: id,
                orgId: resource.orgId,
                resourceId,
                tokenHash,
                expiresAt: expiresAt || null,
                sessionLength: sessionLength,
                title: title || null,
                description: description || null,
                createdAt: new Date().getTime()
            })
            .returning({
                accessTokenId: resourceAccessToken.accessTokenId,
                orgId: resourceAccessToken.orgId,
                resourceId: resourceAccessToken.resourceId,
                expiresAt: resourceAccessToken.expiresAt,
                sessionLength: resourceAccessToken.sessionLength,
                title: resourceAccessToken.title,
                description: resourceAccessToken.description,
                createdAt: resourceAccessToken.createdAt
            })
            .execute();

        if (!result) {
            return next(
                createHttpError(
                    HttpCode.INTERNAL_SERVER_ERROR,
                    "Failed to generate access token"
                )
            );
        }

        return response<GenerateAccessTokenResponse>(res, {
            data: { ...result, accessToken: token },
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
