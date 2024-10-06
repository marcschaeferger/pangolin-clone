import { Request } from 'express';
import { db } from '@server/db';
import { userActions, roleActions, userOrgs } from '@server/db/schema';
import { and, eq, or } from 'drizzle-orm';
import createHttpError from 'http-errors';
import HttpCode from '@server/types/HttpCode';

export async function checkUserActionPermission(actionId: number, req: Request): Promise<boolean> {
  const userId = req.user?.id;

  if (!userId) {
    throw createHttpError(HttpCode.UNAUTHORIZED, 'User not authenticated');
  }

  try {
    // Check if the user has direct permission for the action
    const userActionPermission = await db.select()
      .from(userActions)
      .where(and(eq(userActions.userId, userId), eq(userActions.actionId, actionId)))
      .limit(1);

    if (userActionPermission.length > 0) {
      return true;
    }

    // If no direct permission, check role-based permission
    const userOrgRoles = await db.select()
      .from(userOrgs)
      .where(eq(userOrgs.userId, userId));

    if (userOrgRoles.length === 0) {
      return false; // User doesn't belong to any organization
    }

    const roleIds = userOrgRoles.map(role => role.roleId);

    const roleActionPermission = await db.select()
      .from(roleActions)
      .where(
        and(
          eq(roleActions.actionId, actionId),
          or(...roleIds.map(roleId => eq(roleActions.roleId, roleId)))
        )
      )
      .limit(1);

    return roleActionPermission.length > 0;

  } catch (error) {
    console.error('Error checking user action permission:', error);
    throw createHttpError(HttpCode.INTERNAL_SERVER_ERROR, 'Error checking action permission');
  }
}