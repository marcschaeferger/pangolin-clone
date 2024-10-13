import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@server/db';
import { roleResources } from '@server/db/schema';
import response from "@server/utils/response";
import HttpCode from '@server/types/HttpCode';
import createHttpError from 'http-errors';
import { ActionsEnum, checkUserActionPermission } from '@server/auth/actions';
import logger from '@server/logger';

const addRoleResourceSchema = z.object({
    roleId: z.string().transform(Number).pipe(z.number().int().positive()),
    resourceId: z.string(),
});

export async function addRoleResource(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
        const parsedBody = addRoleResourceSchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    parsedBody.error.errors.map(e => e.message).join(', ')
                )
            );
        }

        const { roleId, resourceId } = parsedBody.data;

        // Check if the user has permission to add role resources
        const hasPermission = await checkUserActionPermission(ActionsEnum.addRoleResource, req);
        if (!hasPermission) {
            return next(createHttpError(HttpCode.FORBIDDEN, 'User does not have permission to perform this action'));
        }

        const newRoleResource = await db.insert(roleResources).values({
            roleId,
            resourceId,
        }).returning();

        return response(res, {
            data: newRoleResource[0],
            success: true,
            error: false,
            message: "Resource added to role successfully",
            status: HttpCode.CREATED,
        });
    } catch (error) {
        logger.error(error);
        return next(createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred..."));
    }
}