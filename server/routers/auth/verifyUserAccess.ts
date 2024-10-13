import { Request, Response, NextFunction } from 'express';
import { db } from '@server/db';
import { sites, userOrgs, userSites, roleSites, roles } from '@server/db/schema';
import { and, eq, or } from 'drizzle-orm';
import createHttpError from 'http-errors';
import HttpCode from '@server/types/HttpCode';

export async function verifyUserAccess(req: Request, res: Response, next: NextFunction) {
    const userId = req.user!.userId; // Assuming you have user information in the request
    const reqUserId = req.params.userId || req.body.userId || req.query.userId;

    if (!userId) {
        return next(createHttpError(HttpCode.UNAUTHORIZED, 'User not authenticated'));
    }

    if (!reqUserId) {
        return next(createHttpError(HttpCode.BAD_REQUEST, 'Invalid user ID'));
    }

    try {

        const userOrg = await db.select()
            .from(userOrgs)
            .where(and(eq(userOrgs.userId, userId), eq(userOrgs.orgId, req.userOrgId!)))
            .limit(1);

        if (userOrg.length === 0) {
            return next(createHttpError(HttpCode.FORBIDDEN, 'User does not have access to this user'));
        }

        // If we reach here, the user doesn't have access to the site
        return next(createHttpError(HttpCode.FORBIDDEN, 'User does not have access to this site'));

    } catch (error) {
        return next(createHttpError(HttpCode.INTERNAL_SERVER_ERROR, 'Error verifying site access'));
    }
}
