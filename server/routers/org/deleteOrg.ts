import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import {
    newts,
    newtSessions,
    orgs,
    sites,
    userActions
} from "@server/db";
import { eq } from "drizzle-orm";
import response from "@server/lib/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import { ActionsEnum, checkUserActionPermission } from "@server/auth/actions";
import logger from "@server/logger";
import { fromError } from "zod-validation-error";
import { sendToClient } from "../ws";
import { deletePeer } from "../gerbil/peers";
import { OpenAPITags, registry } from "@server/openApi";

const deleteOrgSchema = z
    .object({
        orgId: z.string()
    })
    .strict();

export type DeleteOrgResponse = {};

registry.registerPath({
    method: "delete",
    path: "/org/{orgId}",
    description: "Delete an organization",
    tags: [OpenAPITags.Org],
    request: {
        params: deleteOrgSchema
    },
    responses: {}
});

export async function deleteOrg(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedParams = deleteOrgSchema.safeParse(req.params);
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
            ActionsEnum.deleteOrg,
            req
        );
        if (!hasPermission) {
            return next(
                createHttpError(
                    HttpCode.FORBIDDEN,
                    "User does not have permission to perform this action"
                )
            );
        }
        const [org] = await db
            .select()
            .from(orgs)
            .where(eq(orgs.orgId, orgId))
            .limit(1);

        if (!org) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `Organization with ID ${orgId} not found`
                )
            );
        }
        // we need to handle deleting each site
        const orgSites = await db
            .select()
            .from(sites)
            .where(eq(sites.orgId, orgId))
            .limit(1);

        await db.transaction(async (trx) => {
            if (sites) {
                for (const site of orgSites) {
                    if (site.pubKey) {
                        if (site.type == "wireguard") {
                            await deletePeer(site.exitNodeId!, site.pubKey);
                        } else if (site.type == "newt") {
                            // get the newt on the site by querying the newt table for siteId
                            const [deletedNewt] = await trx
                                .delete(newts)
                                .where(eq(newts.siteId, site.siteId))
                                .returning();
                            if (deletedNewt) {
                                const payload = {
                                    type: `newt/terminate`,
                                    data: {}
                                };
                                sendToClient(deletedNewt.newtId, payload);

                                // delete all of the sessions for the newt
                                await trx
                                    .delete(newtSessions)
                                    .where(
                                        eq(
                                            newtSessions.newtId,
                                            deletedNewt.newtId
                                        )
                                    );
                            }
                        }
                    }

                    logger.info(`Deleting site ${site.siteId}`);
                    await trx
                        .delete(sites)
                        .where(eq(sites.siteId, site.siteId));
                }
            }

            await trx.delete(orgs).where(eq(orgs.orgId, orgId));
        });

        return response(res, {
            data: null,
            success: true,
            error: false,
            message: "Organization deleted successfully",
            status: HttpCode.OK
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
