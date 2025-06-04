import { db } from "@server/db";
import { orgs, roleSites, sites, userSites } from "@server/db";
import logger from "@server/logger";
import HttpCode from "@server/types/HttpCode";
import response from "@server/lib/response";
import { and, count, eq, inArray, or, sql } from "drizzle-orm";
import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import { OpenAPITags, registry } from "@server/openApi";

const listSitesParamsSchema = z
    .object({
        orgId: z.string()
    })
    .strict();

const listSitesSchema = z.object({
    limit: z
        .string()
        .optional()
        .default("1000")
        .transform(Number)
        .pipe(z.number().int().positive()),
    offset: z
        .string()
        .optional()
        .default("0")
        .transform(Number)
        .pipe(z.number().int().nonnegative())
});

function querySites(orgId: string, accessibleSiteIds: number[]) {
    return db
        .select({
            siteId: sites.siteId,
            niceId: sites.niceId,
            name: sites.name,
            pubKey: sites.pubKey,
            subnet: sites.subnet,
            megabytesIn: sites.megabytesIn,
            megabytesOut: sites.megabytesOut,
            orgName: orgs.name,
            type: sites.type,
            online: sites.online
        })
        .from(sites)
        .leftJoin(orgs, eq(sites.orgId, orgs.orgId))
        .where(
            and(
                inArray(sites.siteId, accessibleSiteIds),
                eq(sites.orgId, orgId)
            )
        );
}

export type ListSitesResponse = {
    sites: Awaited<ReturnType<typeof querySites>>;
    pagination: { total: number; limit: number; offset: number };
};

registry.registerPath({
    method: "get",
    path: "/org/{orgId}/sites",
    description: "List all sites in an organization",
    tags: [OpenAPITags.Org, OpenAPITags.Site],
    request: {
        params: listSitesParamsSchema,
        query: listSitesSchema
    },
    responses: {}
});

export async function listSites(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedQuery = listSitesSchema.safeParse(req.query);
        if (!parsedQuery.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedQuery.error)
                )
            );
        }
        const { limit, offset } = parsedQuery.data;

        const parsedParams = listSitesParamsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error)
                )
            );
        }
        const { orgId } = parsedParams.data;

        if (req.user && orgId && orgId !== req.userOrgId) {
            return next(
                createHttpError(
                    HttpCode.FORBIDDEN,
                    "User does not have access to this organization"
                )
            );
        }

        let accessibleSites;
        if (req.user) {
            accessibleSites = await db
                .select({
                    siteId: sql<number>`COALESCE(${userSites.siteId}, ${roleSites.siteId})`
                })
                .from(userSites)
                .fullJoin(roleSites, eq(userSites.siteId, roleSites.siteId))
                .where(
                    or(
                        eq(userSites.userId, req.user!.userId),
                        eq(roleSites.roleId, req.userOrgRoleId!)
                    )
                );
        } else {
            accessibleSites = await db
                .select({ siteId: sites.siteId })
                .from(sites)
                .where(eq(sites.orgId, orgId));
        }

        const accessibleSiteIds = accessibleSites.map((site) => site.siteId);
        const baseQuery = querySites(orgId, accessibleSiteIds);

        let countQuery = db
            .select({ count: count() })
            .from(sites)
            .where(
                and(
                    inArray(sites.siteId, accessibleSiteIds),
                    eq(sites.orgId, orgId)
                )
            );

        const sitesList = await baseQuery.limit(limit).offset(offset);
        const totalCountResult = await countQuery;
        const totalCount = totalCountResult[0].count;

        return response<ListSitesResponse>(res, {
            data: {
                sites: sitesList,
                pagination: {
                    total: totalCount,
                    limit,
                    offset
                }
            },
            success: true,
            error: false,
            message: "Sites retrieved successfully",
            status: HttpCode.OK
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
