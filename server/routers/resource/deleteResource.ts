import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@server/db';
import { resources } from '@server/db/schema';
import { eq } from 'drizzle-orm';
import response from "@server/utils/response";
import HttpCode from '@server/types/HttpCode';
import createHttpError from 'http-errors';
import { ActionsEnum, checkUserActionPermission } from '@server/auth/actions';
import logger from '@server/logger';

// Define Zod schema for request parameters validation
const deleteResourceSchema = z.object({
    resourceId: z.string().uuid()
});

export async function deleteResource(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
        // Validate request parameters
        const parsedParams = deleteResourceSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    parsedParams.error.errors.map(e => e.message).join(', ')
                )
            );
        }

        const { resourceId } = parsedParams.data;

        // Check if the user has permission to list sites
        const hasPermission = await checkUserActionPermission(ActionsEnum.deleteResource, req);
        if (!hasPermission) {
            return next(createHttpError(HttpCode.FORBIDDEN, 'User does not have permission to perform this action'));
        }

        // Delete the resource from the database
        const deletedResource = await db.delete(resources)
            .where(eq(resources.resourceId, resourceId))
            .returning();

        if (deletedResource.length === 0) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `Resource with ID ${resourceId} not found`
                )
            );
        }

        return response(res, {
            data: null,
            success: true,
            error: false,
            message: "Resource deleted successfully",
            status: HttpCode.OK,
        });
    } catch (error) {
        logger.error(error);
        return next(createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred..."));
    }
}
