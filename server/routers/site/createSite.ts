import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { roles, userSites, sites, roleSites, Site, orgs } from "@server/db";
import response from "@server/lib/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import logger from "@server/logger";
import { eq, and } from "drizzle-orm";
import { getUniqueSiteName } from "../../db/names";
import { addPeer } from "../gerbil/peers";
import { fromError } from "zod-validation-error";
import { newts } from "@server/db";
import moment from "moment";
import { OpenAPITags, registry } from "@server/openApi";
import { hashPassword } from "@server/auth/password";

const createSiteParamsSchema = z
    .object({
        orgId: z.string()
    })
    .strict();

const createSiteSchema = z
    .object({
        name: z.string().min(1).max(255),
        exitNodeId: z.number().int().positive().optional(),
        // subdomain: z
        //     .string()
        //     .min(1)
        //     .max(255)
        //     .transform((val) => val.toLowerCase())
        //     .optional(),
        pubKey: z.string().optional(),
        subnet: z.string().optional(),
        newtId: z.string().optional(),
        secret: z.string().optional(),
        type: z.enum(["newt", "wireguard", "local"])
    })
    .strict();

export type CreateSiteBody = z.infer<typeof createSiteSchema>;

export type CreateSiteResponse = Site;

registry.registerPath({
    method: "put",
    path: "/org/{orgId}/site",
    description: "Create a new site.",
    tags: [OpenAPITags.Site, OpenAPITags.Org],
    request: {
        params: createSiteParamsSchema,
        body: {
            content: {
                "application/json": {
                    schema: createSiteSchema
                }
            }
        }
    },
    responses: {}
});

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

        const {
            name,
            type,
            exitNodeId,
            pubKey,
            subnet,
            newtId,
            secret
        } = parsedBody.data;

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

        if (req.user && !req.userOrgRoleId) {
            return next(
                createHttpError(HttpCode.FORBIDDEN, "User does not have a role")
            );
        }

        const [org] = await db.select().from(orgs).where(eq(orgs.orgId, orgId));

        if (!org) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `Organization with ID ${orgId} not found`
                )
            );
        }

        const niceId = await getUniqueSiteName(orgId);

        await db.transaction(async (trx) => {
            let newSite: Site;

            if (exitNodeId) {
                // we are creating a site with an exit node (tunneled)
                if (!subnet) {
                    return next(
                        createHttpError(
                            HttpCode.BAD_REQUEST,
                            "Subnet is required for tunneled sites"
                        )
                    );
                }

                [newSite] = await trx
                    .insert(sites)
                    .values({
                        orgId,
                        exitNodeId,
                        name,
                        niceId,
                        subnet,
                        type,
                        dockerSocketEnabled: type == "newt",
                        ...(pubKey && type == "wireguard" && { pubKey })
                    })
                    .returning();
            } else {
                // we are creating a site with no tunneling

                [newSite] = await trx
                    .insert(sites)
                    .values({
                        orgId,
                        name,
                        niceId,
                        type,
                        dockerSocketEnabled: type == "newt",
                        subnet: "0.0.0.0/0"
                    })
                    .returning();
            }

            const adminRole = await trx
                .select()
                .from(roles)
                .where(and(eq(roles.isAdmin, true), eq(roles.orgId, orgId)))
                .limit(1);

            if (adminRole.length === 0) {
                return next(
                    createHttpError(HttpCode.NOT_FOUND, `Admin role not found`)
                );
            }

            await trx.insert(roleSites).values({
                roleId: adminRole[0].roleId,
                siteId: newSite.siteId
            });

            if (req.user && req.userOrgRoleId != adminRole[0].roleId) {
                // make sure the user can access the site
                trx.insert(userSites).values({
                    userId: req.user?.userId!,
                    siteId: newSite.siteId
                });
            }

            // add the peer to the exit node
            if (type == "newt") {
                const secretHash = await hashPassword(secret!);

                await trx.insert(newts).values({
                    newtId: newtId!,
                    secretHash,
                    siteId: newSite.siteId,
                    dateCreated: moment().toISOString()
                });
            } else if (type == "wireguard") {
                if (!pubKey) {
                    return next(
                        createHttpError(
                            HttpCode.BAD_REQUEST,
                            "Public key is required for wireguard sites"
                        )
                    );
                }

                if (!exitNodeId) {
                    return next(
                        createHttpError(
                            HttpCode.BAD_REQUEST,
                            "Exit node ID is required for wireguard sites"
                        )
                    );
                }

                await addPeer(exitNodeId, {
                    publicKey: pubKey,
                    allowedIps: []
                });
            }

            return response<CreateSiteResponse>(res, {
                data: newSite,
                success: true,
                error: false,
                message: "Site created successfully",
                status: HttpCode.CREATED
            });
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
