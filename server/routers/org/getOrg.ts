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

const getOrgSchema = z.object({
    orgId: z.string().transform(Number).pipe(z.number().int().positive())
});

export async function getOrg(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
        const parsedParams = getOrgSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    parsedParams.error.errors.map(e => e.message).join(', ')
                )
            );
        }

        const { orgId } = parsedParams.data;

        // Check if the user has permission to list sites
        const hasPermission = await checkUserActionPermission(ActionsEnum.getOrg, req);
        if (!hasPermission) {
            return next(createHttpError(HttpCode.FORBIDDEN, 'User does not have permission to perform this action'));
        }

        const org = await db.select()
            .from(orgs)
            .where(eq(orgs.orgId, orgId))
            .limit(1);

        if (org.length === 0) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `Organization with ID ${orgId} not found`
                )
            );
        }

        return response(res, {
            data: org[0],
            success: true,
            error: false,
            message: "Organization retrieved successfully",
            status: HttpCode.OK,
        });
    } catch (error) {
        logger.error(error);
        return next(createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred..."));
    }
}
