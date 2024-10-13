import { Request, Response, NextFunction } from 'express';
import { db } from '@server/db';
import { roles, userOrgs } from '@server/db/schema';
import { and, eq } from 'drizzle-orm';
import createHttpError from 'http-errors';
import HttpCode from '@server/types/HttpCode';
import logger from '@server/logger';

export async function verifySuperuser(req: Request, res: Response, next: NextFunction) {
    const userId = req.user?.userId; // Assuming you have user information in the request
    const orgId = req.userOrgId;

    if (!userId) {
        return next(createHttpError(HttpCode.UNAUTHORIZED, 'User does not have orgId'));
    }

    if (!userId) {
        return next(createHttpError(HttpCode.UNAUTHORIZED, 'User not authenticated'));
    }

    try {
        // Check if the user has a role in the organization
        const userOrgRole = await db.select()
            .from(userOrgs)
            .where(and(eq(userOrgs.userId, userId), eq(userOrgs.orgId, orgId!)))
            .limit(1);

        if (userOrgRole.length === 0) {
            return next(createHttpError(HttpCode.FORBIDDEN, 'User does not have access to this organization'));
        }

        // get userOrgRole[0].roleId
        // Check if the user's role in the organization is a superuser role
        const userRole = await db.select()
            .from(roles)
            .where(eq(roles.roleId, userOrgRole[0].roleId))
            .limit(1);

        if (userRole.length === 0 || !userRole[0].isSuperuserRole) {
            return next(createHttpError(HttpCode.FORBIDDEN, 'User does not have superuser access'));
        }

        return next();
    } catch (error) {
        logger.error('Error verifying role access:', error);
        return next(createHttpError(HttpCode.INTERNAL_SERVER_ERROR, 'Error verifying role access'));
    }
}
