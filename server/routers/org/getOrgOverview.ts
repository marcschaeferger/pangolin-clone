import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import {
    orgs,
    resources,
    roles,
    sites,
    userOrgs,
    userResources,
    users,
    userSites
} from "@server/db";
import { and, count, eq, inArray } from "drizzle-orm";
import response from "@server/lib/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import logger from "@server/logger";
import { fromZodError } from "zod-validation-error";

const getOrgParamsSchema = z
    .object({
        orgId: z.string()
    })
    .strict();

export type GetOrgOverviewResponse = {
    orgName: string;
    orgId: string;
    userRoleName: string;
    numSites: number;
    numUsers: number;
    numResources: number;
    isAdmin: boolean;
    isOwner: boolean;
};

export async function getOrgOverview(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedParams = getOrgParamsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromZodError(parsedParams.error)
                )
            );
        }

        const { orgId } = parsedParams.data;

        const org = await db
            .select()
            .from(orgs)
            .where(eq(orgs.orgId, orgId))
            .limit(1);

        if (org.length === 0) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `Organization with ID ${orgId} not found`
                )
            );
        }

        if (!req.userOrg) {
            return next(
                createHttpError(HttpCode.UNAUTHORIZED, "User not authenticated")
            );
        }

        const allSiteIds = await db
            .select({
                siteId: sites.siteId
            })
            .from(sites)
            .where(eq(sites.orgId, orgId));

        const [{ numSites }] = await db
            .select({ numSites: count() })
            .from(userSites)
            .where(
                and(
                    eq(userSites.userId, req.userOrg.userId),
                    inArray(
                        userSites.siteId,
                        allSiteIds.map((site) => site.siteId)
                    )
                )
            );

        const allResourceIds = await db
            .select({
                resourceId: resources.resourceId
            })
            .from(resources)
            .where(eq(resources.orgId, orgId));

        const [{ numResources }] = await db
            .select({ numResources: count() })
            .from(userResources)
            .where(
                and(
                    eq(userResources.userId, req.userOrg.userId),
                    inArray(
                        userResources.resourceId,
                        allResourceIds.map((resource) => resource.resourceId)
                    )
                )
            );

        const [{ numUsers }] = await db
            .select({ numUsers: count() })
            .from(userOrgs)
            .where(eq(userOrgs.orgId, orgId));

        const [role] = await db
            .select()
            .from(roles)
            .where(eq(roles.roleId, req.userOrg.roleId));

        return response<GetOrgOverviewResponse>(res, {
            data: {
                orgName: org[0].name,
                orgId: org[0].orgId,
                userRoleName: role.name,
                numSites,
                numUsers,
                numResources,
                isAdmin: role.name === "Admin",
                isOwner: req.userOrg?.isOwner || false
            },
            success: true,
            error: false,
            message: "Organization overview retrieved successfully",
            status: HttpCode.OK
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
