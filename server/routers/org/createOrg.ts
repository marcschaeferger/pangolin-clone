import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@server/db';
import { eq } from 'drizzle-orm';
import { orgs, userOrgs } from '@server/db/schema';
import response from "@server/utils/response";
import HttpCode from '@server/types/HttpCode';
import createHttpError from 'http-errors';
import { ActionsEnum, checkUserActionPermission } from '@server/auth/actions';
import logger from '@server/logger';
import { createSuperuserRole } from '@server/db/ensureActions';
import config, { APP_PATH } from "@server/config";

const createOrgSchema = z.object({
    orgId: z.string(),
    name: z.string().min(1).max(255),
    // domain: z.string().min(1).max(255).optional(),
});

const MAX_ORGS = 5;

export async function createOrg(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
        const parsedBody = createOrgSchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    parsedBody.error.errors.map(e => e.message).join(', ')
                )
            );
        }

        const userOrgIds = req.userOrgIds;
        if (userOrgIds && userOrgIds.length > MAX_ORGS) {
            return next(
                createHttpError(
                    HttpCode.FORBIDDEN,
                    `Maximum number of organizations reached.`
                )
            );
        }

        // TODO: we cant do this when they create an org because they are not in an org yet... maybe we need to make the org id optional on the userActions table
        // Check if the user has permission 
        // const hasPermission = await checkUserActionPermission(ActionsEnum.createOrg, req);
        // if (!hasPermission) {
        //     return next(createHttpError(HttpCode.FORBIDDEN, 'User does not have permission to perform this action'));
        // }

        const { orgId, name } = parsedBody.data;

        // make sure the orgId is unique
        const orgExists = await db.select()
            .from(orgs)
            .where(eq(orgs.orgId, orgId))
            .limit(1);
        
        if (orgExists.length > 0) {
            return next(
                createHttpError(
                    HttpCode.CONFLICT,
                    `Organization with ID ${orgId} already exists`
                )
            );
        }

        const newOrg = await db.insert(orgs).values({
            orgId,
            name,
            domain: config.app.base_domain
        }).returning();

        const roleId = await createSuperuserRole(newOrg[0].orgId);

        if (!roleId) {
            return next(
                createHttpError(
                    HttpCode.INTERNAL_SERVER_ERROR,
                    `Error creating superuser role`
                )
            );
        }

        // put the user in the super user role
        await db.insert(userOrgs).values({
            userId: req.user!.userId,
            orgId: newOrg[0].orgId,
            roleId: roleId,
        }).execute();

        return response(res, {
            data: newOrg[0],
            success: true,
            error: false,
            message: "Organization created successfully",
            status: HttpCode.CREATED,
        });
    } catch (error) {
        logger.error(error);
        return next(createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred..."));
    }
}
