import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import {
    roles,
    userSites,
    sites,
    roleSites,
    exitNodes,
} from "@server/db/schema";
import response from "@server/utils/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import { ActionsEnum, checkUserActionPermission } from "@server/auth/actions";
import logger from "@server/logger";
import { eq, and } from "drizzle-orm";
import { getUniqueSiteName } from "@server/db/names";
import { addPeer } from "../gerbil/peers";
import { fromError } from "zod-validation-error";

const createSiteParamsSchema = z.object({
    orgId: z.string(),
});

// Define Zod schema for request body validation
const createSiteSchema = z.object({
    name: z.string().min(1).max(255),
    exitNodeId: z.number().int().positive(),
    subdomain: z.string().min(1).max(255).optional(),
    pubKey: z.string(),
    subnet: z.string(),
});

export type CreateSiteResponse = {
    name: string;
    siteId: number;
    orgId: string;
    niceId: string;
    // niceId: string;
    // subdomain: string;
    // subnet: string;
};

export async function createSite(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        // Validate request body
        const parsedBody = createSiteSchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedBody.error).toString()
                )
            );
        }

        const { name, subdomain, exitNodeId, pubKey, subnet } = parsedBody.data;

        // Validate request params
        const parsedParams = createSiteParamsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const { orgId } = parsedParams.data;

        // Check if the user has permission to list sites
        const hasPermission = await checkUserActionPermission(
            ActionsEnum.createSite,
            req
        );
        if (!hasPermission) {
            return next(
                createHttpError(
                    HttpCode.FORBIDDEN,
                    "User does not have permission perform this action"
                )
            );
        }

        if (!req.userOrgRoleId) {
            return next(
                createHttpError(HttpCode.FORBIDDEN, "User does not have a role")
            );
        }

        const niceId = await getUniqueSiteName(orgId);

        // Create new site in the database
        const [newSite] = await db
            .insert(sites)
            .values({
                orgId,
                exitNodeId,
                name,
                niceId,
                pubKey,
                subnet,
            })
            .returning();
        const adminRole = await db
            .select()
            .from(roles)
            .where(and(eq(roles.isAdmin, true), eq(roles.orgId, orgId)))
            .limit(1);

        if (adminRole.length === 0) {
            return next(
                createHttpError(HttpCode.NOT_FOUND, `Admin role not found`)
            );
        }

        await db.insert(roleSites).values({
            roleId: adminRole[0].roleId,
            siteId: newSite.siteId,
        });

        if (req.userOrgRoleId != adminRole[0].roleId) {
            // make sure the user can access the site
            db.insert(userSites).values({
                userId: req.user?.userId!,
                siteId: newSite.siteId,
            });
        }

        // Add the peer to the exit node
        await addPeer(exitNodeId, {
            publicKey: pubKey,
            allowedIps: [],
        });

        return response(res, {
            data: {
                name: newSite.name,
                niceId: newSite.niceId,
                siteId: newSite.siteId,
                orgId: newSite.orgId,
                // subdomain: newSite.subdomain,
                // subnet: newSite.subnet,
            },
            success: true,
            error: false,
            message: "Site created successfully",
            status: HttpCode.CREATED,
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "An error occurred..."
            )
        );
    }
}
