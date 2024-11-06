import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { roleResources } from "@server/db/schema";
import response from "@server/utils/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import logger from "@server/logger";
import { fromError } from "zod-validation-error";

const addRoleResourceParamsSchema = z.object({
    roleId: z.string().transform(Number).pipe(z.number().int().positive()),
});

const addRoleResourceSchema = z.object({
    resourceId: z.string().transform(Number).pipe(z.number().int().positive()),
});

export async function addRoleResource(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedBody = addRoleResourceSchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedBody.error).toString()
                )
            );
        }

        const { resourceId } = parsedBody.data;

        const parsedParams = addRoleResourceParamsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const { roleId } = parsedParams.data;

        const newRoleResource = await db
            .insert(roleResources)
            .values({
                roleId,
                resourceId,
            })
            .returning();

        return response(res, {
            data: newRoleResource[0],
            success: true,
            error: false,
            message: "Resource added to role successfully",
            status: HttpCode.CREATED,
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
