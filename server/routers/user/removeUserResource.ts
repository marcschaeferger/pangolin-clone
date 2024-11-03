import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { userResources } from "@server/db/schema";
import { and, eq } from "drizzle-orm";
import response from "@server/utils/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import { ActionsEnum, checkUserActionPermission } from "@server/auth/actions";
import logger from "@server/logger";
import { fromError } from "zod-validation-error";

const removeUserResourceSchema = z.object({
    userId: z.string(),
    resourceId: z.string().transform(Number).pipe(z.number().int().positive()),
});

export async function removeUserResource(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedParams = removeUserResourceSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const { userId, resourceId } = parsedParams.data;

        // Check if the user has permission to remove user resources
        const hasPermission = await checkUserActionPermission(
            ActionsEnum.removeUserResource,
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

        const deletedUserResource = await db
            .delete(userResources)
            .where(
                and(
                    eq(userResources.userId, userId),
                    eq(userResources.resourceId, resourceId)
                )
            )
            .returning();

        if (deletedUserResource.length === 0) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `Resource with ID ${resourceId} not found for user with ID ${userId}`
                )
            );
        }

        return response(res, {
            data: null,
            success: true,
            error: false,
            message: "Resource removed from user successfully",
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
