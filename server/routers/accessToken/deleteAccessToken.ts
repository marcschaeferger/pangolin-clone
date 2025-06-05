import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import response from "@server/lib/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import logger from "@server/logger";
import { fromError } from "zod-validation-error";
import { resourceAccessToken } from "@server/db";
import { and, eq } from "drizzle-orm";
import { db } from "@server/db";
import { OpenAPITags, registry } from "@server/openApi";

const deleteAccessTokenParamsSchema = z
    .object({
        accessTokenId: z.string()
    })
    .strict();

registry.registerPath({
    method: "delete",
    path: "/access-token/{accessTokenId}",
    description: "Delete a access token.",
    tags: [OpenAPITags.AccessToken],
    request: {
        params: deleteAccessTokenParamsSchema
    },
    responses: {}
});

export async function deleteAccessToken(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedParams = deleteAccessTokenParamsSchema.safeParse(
            req.params
        );
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const { accessTokenId } = parsedParams.data;

        const [accessToken] = await db
            .select()
            .from(resourceAccessToken)
            .where(and(eq(resourceAccessToken.accessTokenId, accessTokenId)));

        if (!accessToken) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    "Resource access token not found"
                )
            );
        }

        await db
            .delete(resourceAccessToken)
            .where(and(eq(resourceAccessToken.accessTokenId, accessTokenId)));

        return response(res, {
            data: null,
            success: true,
            error: false,
            message: "Resource access token deleted successfully",
            status: HttpCode.OK
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
