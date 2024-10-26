import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@server/db';
import { targets } from '@server/db/schema';
import response from "@server/utils/response";
import HttpCode from '@server/types/HttpCode';
import createHttpError from 'http-errors';
import { ActionsEnum, checkUserActionPermission } from '@server/auth/actions';
import logger from '@server/logger';

const createTargetParamsSchema = z.object({
    resourceId: z.string().transform(Number).pipe(z.number().int().positive()),
});

const createTargetSchema = z.object({
    ip: z.string().ip(),
    method: z.string().min(1).max(10),
    port: z.number().int().min(1).max(65535),
    protocol: z.string().optional(),
    enabled: z.boolean().default(true),
});

export async function createTarget(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
        const parsedBody = createTargetSchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    parsedBody.error.errors.map(e => e.message).join(', ')
                )
            );
        }

        const targetData = parsedBody.data;

        const parsedParams = createTargetParamsSchema.safeParse(req.params);
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
        const hasPermission = await checkUserActionPermission(ActionsEnum.createTarget, req);
        if (!hasPermission) {
            return next(createHttpError(HttpCode.FORBIDDEN, 'User does not have permission to perform this action'));
        }

        const newTarget = await db.insert(targets).values({
            resourceId,
            ...targetData
        }).returning();

        return response(res, {
            data: newTarget[0],
            success: true,
            error: false,
            message: "Target created successfully",
            status: HttpCode.CREATED,
        });
    } catch (error) {
        logger.error(error);
        return next(createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred..."));
    }
}
