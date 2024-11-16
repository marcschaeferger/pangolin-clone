import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { roles, userSites, sites, roleSites } from "@server/db/schema";
import response from "@server/utils/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import logger from "@server/logger";
import { eq, and } from "drizzle-orm";
import { getUniqueSiteName } from "@server/db/names";
import { addPeer } from "../gerbil/peers";
import { fromError } from "zod-validation-error";

const createSiteParamsSchema = z.object({
    orgId: z.string(),
});

const createSiteSchema = z.object({
    name: z.string().min(1).max(255),
    exitNodeId: z.number().int().positive(),
    subdomain: z.string().min(1).max(255).optional(),
    pubKey: z.string().optional(),
    subnet: z.string(),
});

export type CreateSiteResponse = {
    name: string;
    siteId: number;
    orgId: string;
    niceId: string;
};

export async function createSite(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
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

        if (!req.userOrgRoleId) {
            return next(
                createHttpError(HttpCode.FORBIDDEN, "User does not have a role")
            );
        }

        const niceId = await getUniqueSiteName(orgId);

        let payload: any = {
            orgId,
            exitNodeId,
            name,
            niceId,
            subnet,
        };

        if (pubKey) {
            payload = {
                ...payload,
                pubKey,
            };
        }

        const [newSite] = await db
            .insert(sites)
            .values(payload)
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

        if (pubKey) {
            // add the peer to the exit node
            await addPeer(exitNodeId, {
                publicKey: pubKey,
                allowedIps: [],
            });
        }

        return response(res, {
            data: {
                name: newSite.name,
                niceId: newSite.niceId,
                siteId: newSite.siteId,
                orgId: newSite.orgId,
            },
            success: true,
            error: false,
            message: "Site created successfully",
            status: HttpCode.CREATED,
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
