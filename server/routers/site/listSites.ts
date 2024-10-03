import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@server/db';
import { sites, orgs, exitNodes } from '@server/db/schema';
import response from "@server/utils/response";
import HttpCode from '@server/types/HttpCode';
import createHttpError from 'http-errors';
import { sql, eq } from 'drizzle-orm';

const listSitesSchema = z.object({
  limit: z.string().optional().transform(Number).pipe(z.number().int().positive().default(10)),
  offset: z.string().optional().transform(Number).pipe(z.number().int().nonnegative().default(0)),
  orgId: z.string().optional().transform(Number).pipe(z.number().int().positive()),
});

export async function listSites(req: Request, res: Response, next: NextFunction): Promise<any> {
  try {
    const parsedQuery = listSitesSchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return next(
        createHttpError(
          HttpCode.BAD_REQUEST,
          parsedQuery.error.errors.map(e => e.message).join(', ')
        )
      );
    }

    const { limit, offset, orgId } = parsedQuery.data;

    let baseQuery: any = db
      .select({
        siteId: sites.siteId,
        name: sites.name,
        subdomain: sites.subdomain,
        pubKey: sites.pubKey,
        subnet: sites.subnet,
        megabytesIn: sites.megabytesIn,
        megabytesOut: sites.megabytesOut,
        orgName: orgs.name,
        exitNodeName: exitNodes.name,
      })
      .from(sites)
      .leftJoin(orgs, eq(sites.orgId, orgs.orgId))
      .leftJoin(exitNodes, eq(sites.exitNode, exitNodes.exitNodeId));

    let countQuery: any = db.select({ count: sql<number>`cast(count(*) as integer)` }).from(sites);

    if (orgId) {
      baseQuery = baseQuery.where(eq(sites.orgId, orgId));
      countQuery = countQuery.where(eq(sites.orgId, orgId));
    }

    const sitesList = await baseQuery.limit(limit).offset(offset);
    const totalCountResult = await countQuery;
    const totalCount = totalCountResult[0].count;

    return res.status(HttpCode.OK).send(
      response(res, {
        data: {
          sites: sitesList,
          pagination: {
            total: totalCount,
            limit,
            offset,
          },
        },
        success: true,
        error: false,
        message: "Sites retrieved successfully",
        status: HttpCode.OK,
      })
    );
  } catch (error) {
    next(error);
  }
}