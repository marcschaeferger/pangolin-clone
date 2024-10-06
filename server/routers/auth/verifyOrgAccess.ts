import { Request, Response, NextFunction } from 'express';
import { db } from '@server/db';
import { userOrgs } from '@server/db/schema';
import { and, eq } from 'drizzle-orm';
import createHttpError from 'http-errors';
import HttpCode from '@server/types/HttpCode';
import { AuthenticatedRequest } from '@server/types/Auth';

export function verifyOrgAccess(req: Request, res: Response, next: NextFunction) {
  const userId = req.user!.id; // Assuming you have user information in the request
  const orgId = parseInt(req.params.orgId);

  if (!userId) {
    return next(createHttpError(HttpCode.UNAUTHORIZED, 'User not authenticated'));
  }

  if (isNaN(orgId)) {
    return next(createHttpError(HttpCode.BAD_REQUEST, 'Invalid organization ID'));
  }

  db.select()
    .from(userOrgs)
    .where(and(eq(userOrgs.userId, userId), eq(userOrgs.orgId, orgId)))
    .then((result) => {
      if (result.length === 0) {
        next(createHttpError(HttpCode.FORBIDDEN, 'User does not have access to this organization'));
      } else {
        // User has access, attach the user's role to the request for potential future use
        req.userOrgRoleId = result[0].roleId;
        req.userOrgId = orgId;
        next();
      }
    })
    .catch((error) => {
      next(createHttpError(HttpCode.INTERNAL_SERVER_ERROR, 'Error verifying organization access'));
    });
}
