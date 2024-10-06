import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@server/db';
import { orgs } from '@server/db/schema';
import { eq } from 'drizzle-orm';
import response from "@server/utils/response";
import HttpCode from '@server/types/HttpCode';
import createHttpError from 'http-errors';
import { ActionsEnum, checkUserActionPermission } from '@server/auth/actions';
import logger from '@server/logger';

const updateOrgParamsSchema = z.object({
    orgId: z.string().transform(Number).pipe(z.number().int().positive())
});

const updateOrgBodySchema = z.object({
    name: z.string().min(1).max(255).optional(),
    domain: z.string().min(1).max(255).optional(),
}).refine(data => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update"
});

export async function updateOrg(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
        const parsedParams = updateOrgParamsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    parsedParams.error.errors.map(e => e.message).join(', ')
                )
            );
        }

        const parsedBody = updateOrgBodySchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    parsedBody.error.errors.map(e => e.message).join(', ')
                )
            );
        }

        const { orgId } = parsedParams.data;
        const updateData = parsedBody.data;


        // Check if the user has permission to list sites
        const hasPermission = await checkUserActionPermission(ActionsEnum.updateOrg, req);
        if (!hasPermission) {
            return next(createHttpError(HttpCode.FORBIDDEN, 'User does not have permission to list sites'));
        }

        const updatedOrg = await db.update(orgs)
            .set(updateData)
            .where(eq(orgs.orgId, orgId))
            .returning();

        if (updatedOrg.length === 0) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `Organization with ID ${orgId} not found`
                )
            );
        }

        return response(res, {
            data: updatedOrg[0],
            success: true,
            error: false,
            message: "Organization updated successfully",
            status: HttpCode.OK,
        });
    } catch (error) {
        logger.error(error);
        return next(createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred..."));
    }
}
