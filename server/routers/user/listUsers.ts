import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@server/db';
import { roles, userOrgs, users } from '@server/db/schema';
import response from "@server/utils/response";
import HttpCode from '@server/types/HttpCode';
import createHttpError from 'http-errors';
import { sql } from 'drizzle-orm';
import { ActionsEnum, checkUserActionPermission } from '@server/auth/actions';
import logger from '@server/logger';

const listUsersSchema = z.object({
  limit: z.string().optional().transform(Number).pipe(z.number().int().positive().default(10)),
  offset: z.string().optional().transform(Number).pipe(z.number().int().nonnegative().default(0)),
});

export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<any> {
  try {
    const parsedQuery = listUsersSchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return next(
        createHttpError(
          HttpCode.BAD_REQUEST,
          parsedQuery.error.errors.map(e => e.message).join(', ')
        )
      );
    }
    const { limit, offset } = parsedQuery.data;

    // Check if the user has permission to list users
    const hasPermission = await checkUserActionPermission(ActionsEnum.listUsers, req);
    if (!hasPermission) {
      return next(createHttpError(HttpCode.FORBIDDEN, 'User does not have permission to perform this action'));
    }

    // Query to join users, userOrgs, and roles tables
    const usersWithRoles = await db
      .select({
        id: users.id,
        email: users.email,
        emailVerified: users.emailVerified,
        dateCreated: users.dateCreated,
        orgId: userOrgs.orgId,
        roleId: userOrgs.roleId,
        roleName: roles.name,
      })
      .from(users)
      .leftJoin(userOrgs, sql`${users.id} = ${userOrgs.userId}`)
      .leftJoin(roles, sql`${userOrgs.roleId} = ${roles.roleId}`)
      .limit(limit)
      .offset(offset);

    // Count total users
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    return response(res, {
      data: {
        users: usersWithRoles,
        pagination: {
          total: count,
          limit,
          offset,
        },
      },
      success: true,
      error: false,
      message: "Users retrieved successfully",
      status: HttpCode.OK,
    });
  } catch (error) {
    logger.error(error);
    return next(createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred..."));
  }
}