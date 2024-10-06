import { Request, Response, NextFunction } from 'express';
import { db } from '@server/db';
import { resources, userOrgs, userResources, roleResources } from '@server/db/schema';
import { and, eq } from 'drizzle-orm';
import createHttpError from 'http-errors';
import HttpCode from '@server/types/HttpCode';

export async function verifyResourceAccess(req: Request, res: Response, next: NextFunction) {
  const userId = req.user!.id; // Assuming you have user information in the request
  const resourceId = req.params.resourceId;

  if (!userId) {
    return next(createHttpError(HttpCode.UNAUTHORIZED, 'User not authenticated'));
  }

  try {
    // Get the resource
    const resource = await db.select()
      .from(resources)
      .where(eq(resources.resourceId, resourceId))
      .limit(1);

    if (resource.length === 0) {
      return next(createHttpError(HttpCode.NOT_FOUND, `Resource with ID ${resourceId} not found`));
    }

    if (!resource[0].orgId) {
      return next(createHttpError(HttpCode.INTERNAL_SERVER_ERROR, `Resource with ID ${resourceId} does not have an organization ID`));
    }

    // Get user's role ID in the organization
    const userOrgRole = await db.select()
      .from(userOrgs)
      .where(and(eq(userOrgs.userId, userId), eq(userOrgs.orgId, resource[0].orgId)))
      .limit(1);

    if (userOrgRole.length === 0) {
      return next(createHttpError(HttpCode.FORBIDDEN, 'User does not have access to this organization'));
    }

    const userOrgRoleId = userOrgRole[0].roleId;
    req.userOrgRoleId = userOrgRoleId;
    req.userOrgId = resource[0].orgId;

    // Check role-based resource access first
    const roleResourceAccess = await db.select()
      .from(roleResources)
      .where(
        and(
          eq(roleResources.resourceId, resourceId),
          eq(roleResources.roleId, userOrgRoleId)
        )
      )
      .limit(1);

    if (roleResourceAccess.length > 0) {
      // User's role has access to the resource
      return next();
    }

    // If role doesn't have access, check user-specific resource access
    const userResourceAccess = await db.select()
      .from(userResources)
      .where(and(eq(userResources.userId, userId), eq(userResources.resourceId, resourceId)))
      .limit(1);

    if (userResourceAccess.length > 0) {
      // User has direct access to the resource
      return next();
    }

    // If we reach here, the user doesn't have access to the resource
    return next(createHttpError(HttpCode.FORBIDDEN, 'User does not have access to this resource'));

  } catch (error) {
    return next(createHttpError(HttpCode.INTERNAL_SERVER_ERROR, 'Error verifying resource access'));
  }
}