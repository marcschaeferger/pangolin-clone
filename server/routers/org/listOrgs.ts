import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@server/db';
import { orgs } from '@server/db/schema';
import response from "@server/utils/response";
import HttpCode from '@server/types/HttpCode';
import createHttpError from 'http-errors';
import { sql, inArray } from 'drizzle-orm';
import { ActionsEnum, checkUserActionPermission } from '@server/auth/actions';

const listOrgsSchema = z.object({
  limit: z.string().optional().transform(Number).pipe(z.number().int().positive().default(10)),
  offset: z.string().optional().transform(Number).pipe(z.number().int().nonnegative().default(0)),
});

export async function listOrgs(req: Request, res: Response, next: NextFunction): Promise<any> {
  try {
    const parsedQuery = listOrgsSchema.safeParse(req.query);
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
    const hasPermission = await checkUserActionPermission(ActionsEnum.listOrgs, req);
    if (!hasPermission) {
      return next(createHttpError(HttpCode.FORBIDDEN, 'User does not have permission to list sites'));
    }

    // Use the userOrgs passed from the middleware
    const userOrgIds = req.userOrgIds;

    if (!userOrgIds || userOrgIds.length === 0) {
      return res.status(HttpCode.OK).send(
        response(res, {
          data: {
            organizations: [],
            pagination: {
              total: 0,
              limit,
              offset,
            },
          },
          success: true,
          error: false,
          message: "No organizations found for the user",
          status: HttpCode.OK,
        })
      );
    }

    const organizations = await db.select()
      .from(orgs)
      .where(inArray(orgs.orgId, userOrgIds))
      .limit(limit)
      .offset(offset);

    const totalCountResult = await db.select({ count: sql<number>`cast(count(*) as integer)` })
      .from(orgs)
      .where(inArray(orgs.orgId, userOrgIds));
    const totalCount = totalCountResult[0].count;

    // // Add the user's role for each organization
    // const organizationsWithRoles = organizations.map(org => ({
    //   ...org,
    //   userRole: req.userOrgRoleIds[org.orgId],
    // }));

    return res.status(HttpCode.OK).send(
      response(res, {
        data: {
          organizations,
          pagination: {
            total: totalCount,
            limit,
            offset,
          },
        },
        success: true,
        error: false,
        message: "Organizations retrieved successfully",
        status: HttpCode.OK,
      })
    );
  } catch (error) {
    next(error);
  }
}