import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@server/db';
import { resources, sites } from '@server/db/schema';
import response from "@server/utils/response";
import HttpCode from '@server/types/HttpCode';
import createHttpError from 'http-errors';
import { sql, eq } from 'drizzle-orm';

const listResourcesSchema = z.object({
  limit: z.string().optional().transform(Number).pipe(z.number().int().positive().default(10)),
  offset: z.string().optional().transform(Number).pipe(z.number().int().nonnegative().default(0)),
  siteId: z.string().optional().transform(Number).pipe(z.number().int().positive()),
});

export async function listResources(req: Request, res: Response, next: NextFunction): Promise<any> {
  try {
    const parsedQuery = listResourcesSchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return next(
        createHttpError(
          HttpCode.BAD_REQUEST,
          parsedQuery.error.errors.map(e => e.message).join(', ')
        )
      );
    }

    const { limit, offset, siteId } = parsedQuery.data;

    let baseQuery = db
      .select({
        resourceId: resources.resourceId,
        name: resources.name,
        subdomain: resources.subdomain,
        siteName: sites.name,
      })
      .from(resources)
      .leftJoin(sites, eq(resources.siteId, sites.siteId));

    let countQuery = db.select({ count: sql<number>`cast(count(*) as integer)` }).from(resources);

    if (siteId) {
      baseQuery = baseQuery.where(eq(resources.siteId, siteId));
      countQuery = countQuery.where(eq(resources.siteId, siteId));
    }

    const resourcesList = await baseQuery.limit(limit).offset(offset);
    const totalCountResult = await countQuery;
    const totalCount = totalCountResult[0].count;

    return res.status(HttpCode.OK).send(
      response(res, {
        data: {
          resources: resourcesList,
          pagination: {
            total: totalCount,
            limit,
            offset,
          },
        },
        success: true,
        error: false,
        message: "Resources retrieved successfully",
        status: HttpCode.OK,
      })
    );
  } catch (error) {
    next(error);
  }
}