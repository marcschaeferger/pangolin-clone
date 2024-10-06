import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@server/db';
import { targets, resources } from '@server/db/schema';
import response from "@server/utils/response";
import HttpCode from '@server/types/HttpCode';
import createHttpError from 'http-errors';
import { sql, eq } from 'drizzle-orm';
import { ActionsEnum, checkUserActionPermission } from '@server/auth/actions';

const listTargetsParamsSchema = z.object({
    resourceId: z.string().optional()
});

const listTargetsSchema = z.object({
  limit: z.string().optional().transform(Number).pipe(z.number().int().positive().default(10)),
  offset: z.string().optional().transform(Number).pipe(z.number().int().nonnegative().default(0)),
});

export async function listTargets(req: Request, res: Response, next: NextFunction): Promise<any> {
  try {
    const parsedQuery = listTargetsSchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return next(
        createHttpError(
          HttpCode.BAD_REQUEST,
          parsedQuery.error.errors.map(e => e.message).join(', ')
        )
      );
    }

    const { limit, offset } = parsedQuery.data;

    const parsedParams = listTargetsParamsSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return next(
        createHttpError(
          HttpCode.BAD_REQUEST,
          parsedParams.error.errors.map(e => e.message).join(', ')
        )
      );
    }

    const { resourceId } = parsedParams.data;
    
    // Check if the user has permission to list sites
    const hasPermission = await checkUserActionPermission(ActionsEnum.listTargets, req);
    if (!hasPermission) {
      return next(createHttpError(HttpCode.FORBIDDEN, 'User does not have permission to list sites'));
    }

    let baseQuery: any = db
      .select({
        targetId: targets.targetId,
        ip: targets.ip,
        method: targets.method,
        port: targets.port,
        protocol: targets.protocol,
        enabled: targets.enabled,
        resourceName: resources.name,
      })
      .from(targets)
      .leftJoin(resources, eq(targets.resourceId, resources.resourceId));

    let countQuery: any = db.select({ count: sql<number>`cast(count(*) as integer)` }).from(targets);

    if (resourceId) {
      baseQuery = baseQuery.where(eq(targets.resourceId, resourceId));
      countQuery = countQuery.where(eq(targets.resourceId, resourceId));
    }

    const targetsList = await baseQuery.limit(limit).offset(offset);
    const totalCountResult = await countQuery;
    const totalCount = totalCountResult[0].count;

    return response(res, {
        data: {
          targets: targetsList,
          pagination: {
            total: totalCount,
            limit,
            offset,
          },
        },
        success: true,
        error: false,
        message: "Targets retrieved successfully",
        status: HttpCode.OK,
      })
  } catch (error) {
    console.log(error);
    
    return next(createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "sadfdf"));
  }
}