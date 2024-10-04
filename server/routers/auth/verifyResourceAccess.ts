import { Request, Response, NextFunction } from 'express';
import { db } from '@server/db';
import { resources, userOrgs } from '@server/db/schema';
import { and, eq } from 'drizzle-orm';
import createHttpError from 'http-errors';
import HttpCode from '@server/types/HttpCode';

export async function verifyResourceAccess(req: Request, res: Response, next: NextFunction) {
  const userId = req.user!.id; // Assuming you have user information in the request
  const resourceId = req.params.resourceId;

  if (!userId) {
    return next(createHttpError(HttpCode.UNAUTHORIZED, 'User not authenticated'));
  }

  const resource = await db.select()
    .from(resources)
    .where(eq(resources.resourceId, resourceId))
    .limit(1);

  if (resource.length === 0) {
    return next(
      createHttpError(
        HttpCode.NOT_FOUND,
        `resource with ID ${resourceId} not found`
      )
    );
  }

  if (!resource[0].orgId) {
    return next(
      createHttpError(
        HttpCode.INTERNAL_SERVER_ERROR,
        `resource with ID ${resourceId} does not have an organization ID`
      )
    );
  }

  db.select()
    .from(userOrgs)
    .where(and(eq(userOrgs.userId, userId), eq(userOrgs.orgId, resource[0].orgId)))
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