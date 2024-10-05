import { Request, Response, NextFunction } from 'express';
import { db } from '@server/db';
import { sites, userOrgs } from '@server/db/schema';
import { and, eq } from 'drizzle-orm';
import createHttpError from 'http-errors';
import HttpCode from '@server/types/HttpCode';

export async function verifySiteAccess(req: Request, res: Response, next: NextFunction) {
  const userId = req.user!.id; // Assuming you have user information in the request
  const siteId = parseInt(req.params.siteId);

  if (!userId) {
    return next(createHttpError(HttpCode.UNAUTHORIZED, 'User not authenticated'));
  }

  if (isNaN(siteId)) {
    return next(createHttpError(HttpCode.BAD_REQUEST, 'Invalid organization ID'));
  }

  const site = await db.select()
    .from(sites)
    .where(eq(sites.siteId, siteId))
    .limit(1);

  if (site.length === 0) {
    return next(
      createHttpError(
        HttpCode.NOT_FOUND,
        `Site with ID ${siteId} not found`
      )
    );
  }

  if (!site[0].orgId) {
    return next(
      createHttpError(
        HttpCode.INTERNAL_SERVER_ERROR,
        `Site with ID ${siteId} does not have an organization ID`
      )
    );
  }

  db.select()
    .from(userOrgs)
    .where(and(eq(userOrgs.userId, userId), eq(userOrgs.orgId, site[0].orgId)))
    .then((result) => {
      if (result.length === 0) {
        next(createHttpError(HttpCode.FORBIDDEN, 'User does not have access to this organization'));
      } else {
        // User has access, attach the user's role to the request for potential future use
        req.userOrgRole = result[0].role;
        next();
      }
    })
    .catch((error) => {
      next(createHttpError(HttpCode.INTERNAL_SERVER_ERROR, 'Error verifying organization access'));
    });
}