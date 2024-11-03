import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { roleResources } from "@server/db/schema";
import { and, eq } from "drizzle-orm";
import response from "@server/utils/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import { ActionsEnum, checkUserActionPermission } from "@server/auth/actions";
import logger from "@server/logger";
import { fromError } from "zod-validation-error";

const removeRoleResourceParamsSchema = z.object({
    roleId: z.string().transform(Number).pipe(z.number().int().positive()),
});

const removeRoleResourceSchema = z.object({
    resourceId: z.string().transform(Number).pipe(z.number().int().positive()),
});

export async function removeRoleResource(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedParams = removeRoleResourceSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const { resourceId } = parsedParams.data;

        const parsedBody = removeRoleResourceParamsSchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedBody.error).toString()
                )
            );
        }

        const { roleId } = parsedBody.data;

        // Check if the user has permission to remove role resources
        const hasPermission = await checkUserActionPermission(
            ActionsEnum.removeRoleResource,
            req
        );
        if (!hasPermission) {
            return next(
                createHttpError(
                    HttpCode.FORBIDDEN,
                    "User does not have permission to perform this action"
                )
            );
        }

        const deletedRoleResource = await db
            .delete(roleResources)
            .where(
                and(
                    eq(roleResources.roleId, roleId),
                    eq(roleResources.resourceId, resourceId)
                )
            )
            .returning();

        if (deletedRoleResource.length === 0) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `Resource with ID ${resourceId} not found for role with ID ${roleId}`
                )
            );
        }

        return response(res, {
            data: null,
            success: true,
            error: false,
            message: "Resource removed from role successfully",
            status: HttpCode.OK,
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "An error occurred..."
            )
        );
    }
}
