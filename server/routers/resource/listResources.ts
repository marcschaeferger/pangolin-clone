import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@server/db';
import { resources, sites, userResources, roleResources } from '@server/db/schema';
import response from "@server/utils/response";
import HttpCode from '@server/types/HttpCode';
import createHttpError from 'http-errors';
import { sql, eq, and, or, inArray } from 'drizzle-orm';
import { ActionsEnum, checkUserActionPermission } from '@server/auth/actions';

const listResourcesParamsSchema = z.object({
    siteId: z.coerce.number().int().positive().optional(),
    orgId: z.coerce.number().int().positive().optional(),
}).refine(data => !!data.siteId !== !!data.orgId, {
    message: "Either siteId or orgId must be provided, but not both",
});

const listResourcesSchema = z.object({
  limit: z.coerce.number().int().positive().default(10),
  offset: z.coerce.number().int().nonnegative().default(0),
});

interface RequestWithOrgAndRole extends Request {
  userOrgRoleId?: number;
  orgId?: number;
}

export async function listResources(req: RequestWithOrgAndRole, res: Response, next: NextFunction): Promise<any> {
  try {
    const parsedQuery = listResourcesSchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return next(createHttpError(HttpCode.BAD_REQUEST, parsedQuery.error.errors.map(e => e.message).join(', ')));
    }
    const { limit, offset } = parsedQuery.data;

    const parsedParams = listResourcesParamsSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return next(createHttpError(HttpCode.BAD_REQUEST, parsedParams.error.errors.map(e => e.message).join(', ')));
    }
    const { siteId, orgId } = parsedParams.data;

    // Check if the user has permission to list sites
    const hasPermission = await checkUserActionPermission(ActionsEnum.listResources, req);
    if (!hasPermission) {
      return next(createHttpError(HttpCode.FORBIDDEN, 'User does not have permission to list sites'));
    }
    
    if (orgId && orgId !== req.orgId) {
      return next(createHttpError(HttpCode.FORBIDDEN, 'User does not have access to this organization'));
    }

    // Get the list of resources the user has access to
    const accessibleResources = await db
      .select({ resourceId: sql<string>`COALESCE(${userResources.resourceId}, ${roleResources.resourceId})` })
      .from(userResources)
      .fullJoin(roleResources, eq(userResources.resourceId, roleResources.resourceId))
      .where(
        or(
          eq(userResources.userId, req.user!.id),
          eq(roleResources.roleId, req.userOrgRoleId!)
        )
      );

    const accessibleResourceIds = accessibleResources.map(resource => resource.resourceId);

    let baseQuery: any = db
      .select({
        resourceId: resources.resourceId,
        name: resources.name,
        subdomain: resources.subdomain,
        siteName: sites.name,
      })
      .from(resources)
      .leftJoin(sites, eq(resources.siteId, sites.siteId))
      .where(inArray(resources.resourceId, accessibleResourceIds));

    let countQuery: any = db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(resources)
      .where(inArray(resources.resourceId, accessibleResourceIds));

    if (siteId) {
      baseQuery = baseQuery.where(eq(resources.siteId, siteId));
      countQuery = countQuery.where(eq(resources.siteId, siteId));
    } else {
      // If orgId is provided, it's already checked to match req.orgId
      baseQuery = baseQuery.where(eq(resources.orgId, req.orgId!));
      countQuery = countQuery.where(eq(resources.orgId, req.orgId!));
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