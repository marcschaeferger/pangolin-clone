import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@server/db';
import { users } from '@server/db/schema';
import response from "@server/utils/response";
import HttpCode from '@server/types/HttpCode';
import createHttpError from 'http-errors';
import { sql } from 'drizzle-orm';
import { ActionsEnum, checkUserActionPermission } from '@server/auth/actions';

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

    // Check if the user has permission to list sites
    const hasPermission = await checkUserActionPermission(ActionsEnum.listUsers, req);
    if (!hasPermission) {
      return next(createHttpError(HttpCode.FORBIDDEN, 'User does not have permission to list sites'));
    }

    const usersList = await db.select()
      .from(users)
      .limit(limit)
      .offset(offset);

    const totalCountResult = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(users);
    const totalCount = totalCountResult[0].count;

    // Remove passwordHash from each user object
    const usersWithoutPassword = usersList.map(({ passwordHash, ...userWithoutPassword }) => userWithoutPassword);

    return res.status(HttpCode.OK).send(
      response(res, {
        data: {
          users: usersWithoutPassword,
          pagination: {
            total: totalCount,
            limit,
            offset,
          },
        },
        success: true,
        error: false,
        message: "Users retrieved successfully",
        status: HttpCode.OK,
      })
    );
  } catch (error) {
    next(error);
  }
}