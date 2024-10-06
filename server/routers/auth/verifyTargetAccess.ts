import { Request, Response, NextFunction } from 'express';
import { db } from '@server/db';
import { resources, targets, userOrgs } from '@server/db/schema';
import { and, eq } from 'drizzle-orm';
import createHttpError from 'http-errors';
import HttpCode from '@server/types/HttpCode';

export async function verifyTargetAccess(req: Request, res: Response, next: NextFunction) {
  const userId = req.user!.id; // Assuming you have user information in the request
  const targetId = parseInt(req.params.targetId);

  if (!userId) {
    return next(createHttpError(HttpCode.UNAUTHORIZED, 'User not authenticated'));
  }

  if (isNaN(targetId)) {
    return next(createHttpError(HttpCode.BAD_REQUEST, 'Invalid organization ID'));
  }

  const target = await db.select()
    .from(targets)
    .where(eq(targets.targetId, targetId))
    .limit(1);

  if (target.length === 0) {
    return next(
      createHttpError(
        HttpCode.NOT_FOUND,
        `target with ID ${targetId} not found`
      )
    );
  }

  const resourceId = target[0].resourceId;

  if (resourceId) {
    return next(
      createHttpError(
        HttpCode.INTERNAL_SERVER_ERROR,
        `target with ID ${targetId} does not have a resource ID`
      )
    );
  }

  const resource = await db.select()
    .from(resources)
    .where(eq(resources.resourceId, resourceId!))
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
        req.userOrgRoleId = result[0].roleId;
        req.userOrgId = resource[0].orgId!;
        next();
      }
    })
    .catch((error) => {
      next(createHttpError(HttpCode.INTERNAL_SERVER_ERROR, 'Error verifying organization access'));
    });
}