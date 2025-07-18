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
import { isValidIP } from "@server/lib/validators";
import { isIpInCidr } from "@server/lib/ip";
import config from "@server/lib/config";

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
        address: z.string().optional(),
        type: z.enum(["newt", "wireguard", "local"])
    })
    .strict()
    .refine((data) => {
        if (data.type === "local") {
            return !config.getRawConfig().flags?.disable_local_sites;
        } else if (data.type === "wireguard") {
            return !config.getRawConfig().flags?.disable_basic_wireguard_sites;
        }
        return true;
    });

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
            secret,
            address
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

        if (!org.subnet) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    `Organization with ID ${orgId} has no subnet defined`
                )
            );
        }

        let updatedAddress = null;
        if (address) {
            if (!isValidIP(address)) {
                return next(
                    createHttpError(
                        HttpCode.BAD_REQUEST,
                        "Invalid subnet format. Please provide a valid CIDR notation."
                    )
                );
            }
        
            if (!isIpInCidr(address, org.subnet)) {
                return next(
                    createHttpError(
                        HttpCode.BAD_REQUEST,
                        "IP is not in the CIDR range of the subnet."
                    )
                );
            }
        
            updatedAddress = `${address}/${org.subnet.split("/")[1]}`; // we want the block size of the whole org
        
            // make sure the subnet is unique
            const addressExistsSites = await db
                .select()
                .from(sites)
                .where(eq(sites.address, updatedAddress))
                .limit(1);
        
            if (addressExistsSites.length > 0) {
                return next(
                    createHttpError(
                        HttpCode.CONFLICT,
                        `Subnet ${subnet} already exists`
                    )
                );
            }
        
            const addressExistsClients = await db
                .select()
                .from(sites)
                .where(eq(sites.subnet, updatedAddress))
                .limit(1);
            if (addressExistsClients.length > 0) {
                return next(
                    createHttpError(
                        HttpCode.CONFLICT,
                        `Subnet ${subnet} already exists`
                    )
                );
            }
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
                        address: updatedAddress || null,
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
                        address: updatedAddress || null,
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
