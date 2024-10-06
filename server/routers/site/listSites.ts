import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@server/db';
import { sites, orgs, exitNodes, userSites, roleSites } from '@server/db/schema';
import response from "@server/utils/response";
import HttpCode from '@server/types/HttpCode';
import createHttpError from 'http-errors';
import { sql, eq, and, or, inArray } from 'drizzle-orm';
import { ActionsEnum, checkUserActionPermission } from '@server/auth/actions';

const listSitesParamsSchema = z.object({
    orgId: z.string().optional().transform(Number).pipe(z.number().int().positive()),
});

const listSitesSchema = z.object({
  limit: z.string().optional().transform(Number).pipe(z.number().int().positive().default(10)),
  offset: z.string().optional().transform(Number).pipe(z.number().int().nonnegative().default(0)),
});

export async function listSites(req: Request, res: Response, next: NextFunction): Promise<any> {
  try {
    const parsedQuery = listSitesSchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return next(createHttpError(HttpCode.BAD_REQUEST, parsedQuery.error.errors.map(e => e.message).join(', ')));
    }
    const { limit, offset } = parsedQuery.data;

    
    const parsedParams = listSitesParamsSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return next(createHttpError(HttpCode.BAD_REQUEST, parsedParams.error.errors.map(e => e.message).join(', ')));
    }
    const { orgId } = parsedParams.data;
    
    // Check if the user has permission to list sites
    const hasPermission = await checkUserActionPermission(ActionsEnum.listSites, req);
    if (!hasPermission) {
      return next(createHttpError(HttpCode.FORBIDDEN, 'User does not have permission to list sites'));
    }
    
    if (orgId && orgId !== req.userOrgId) {
      return next(createHttpError(HttpCode.FORBIDDEN, 'User does not have access to this organization'));
    }

    const accessibleSites = await db
      .select({ siteId: sql<number>`COALESCE(${userSites.siteId}, ${roleSites.siteId})` })
      .from(userSites)
      .fullJoin(roleSites, eq(userSites.siteId, roleSites.siteId))
      .where(
        or(
          eq(userSites.userId, req.user!.id),
          eq(roleSites.roleId, req.userOrgRoleId!)
        )
      );

    const accessibleSiteIds = accessibleSites.map(site => site.siteId);

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
      .where(inArray(sites.siteId, accessibleSiteIds));

    let countQuery: any = db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(sites)
      .where(inArray(sites.siteId, accessibleSiteIds));

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