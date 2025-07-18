import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { clients, clientSites } from "@server/db";
import response from "@server/lib/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import logger from "@server/logger";
import { eq, and } from "drizzle-orm";
import { fromError } from "zod-validation-error";
import { OpenAPITags, registry } from "@server/openApi";
import {
    addPeer as newtAddPeer,
    deletePeer as newtDeletePeer
} from "../newt/peers";
import {
    addPeer as olmAddPeer,
    deletePeer as olmDeletePeer
} from "../olm/peers";

const updateClientParamsSchema = z
    .object({
        clientId: z.string().transform(Number).pipe(z.number().int().positive())
    })
    .strict();

const updateClientSchema = z
    .object({
        name: z.string().min(1).max(255).optional(),
        siteIds: z
            .array(z.string().transform(Number).pipe(z.number()))
            .optional()
    })
    .strict();

export type UpdateClientBody = z.infer<typeof updateClientSchema>;

registry.registerPath({
    method: "post",
    path: "/client/{clientId}",
    description: "Update a client by its client ID.",
    tags: [OpenAPITags.Client],
    request: {
        params: updateClientParamsSchema,
        body: {
            content: {
                "application/json": {
                    schema: updateClientSchema
                }
            }
        }
    },
    responses: {}
});

export async function updateClient(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedBody = updateClientSchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedBody.error).toString()
                )
            );
        }

        const { name, siteIds } = parsedBody.data;

        const parsedParams = updateClientParamsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const { clientId } = parsedParams.data;

        // Fetch the client to make sure it exists and the user has access to it
        const [client] = await db
            .select()
            .from(clients)
            .where(eq(clients.clientId, clientId))
            .limit(1);

        if (!client) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `Client with ID ${clientId} not found`
                )
            );
        }

        if (siteIds) {
            let sitesAdded = [];
            let sitesRemoved = [];

            // Fetch existing site associations
            const existingSites = await db
                .select({ siteId: clientSites.siteId })
                .from(clientSites)
                .where(eq(clientSites.clientId, clientId));

            const existingSiteIds = existingSites.map((site) => site.siteId);

            // Determine which sites were added and removed
            sitesAdded = siteIds.filter(
                (siteId) => !existingSiteIds.includes(siteId)
            );
            sitesRemoved = existingSiteIds.filter(
                (siteId) => !siteIds.includes(siteId)
            );

            logger.info(
                `Adding ${sitesAdded.length} new sites to client ${client.clientId}`
            );
            for (const siteId of sitesAdded) {
                if (!client.subnet || !client.pubKey || !client.endpoint) {
                    logger.debug("Client subnet, pubKey or endpoint is not set");
                    continue;
                }

                const site = await newtAddPeer(siteId, {
                    publicKey: client.pubKey,
                    allowedIps: [`${client.subnet.split("/")[0]}/32`], // we want to only allow from that client
                    endpoint: client.endpoint
                });
                if (!site) {
                    logger.debug("Failed to add peer to newt - missing site");
                    continue;
                }

                if (!site.endpoint || !site.publicKey) {
                    logger.debug("Site endpoint or publicKey is not set");
                    continue;
                }
                await olmAddPeer(client.clientId, {
                    siteId: siteId,
                    endpoint: site.endpoint,
                    publicKey: site.publicKey,
                    serverIP: site.address,
                    serverPort: site.listenPort
                });
            }

            logger.info(
                `Removing ${sitesRemoved.length} sites from client ${client.clientId}`
            );
            for (const siteId of sitesRemoved) {
                if (!client.pubKey) {
                    logger.debug("Client pubKey is not set");
                    continue;
                }
                const site = await newtDeletePeer(siteId, client.pubKey);
                if (!site) {
                    logger.debug(
                        "Failed to delete peer from newt - missing site"
                    );
                    continue;
                }
                if (!site.endpoint || !site.publicKey) {
                    logger.debug("Site endpoint or publicKey is not set");
                    continue;
                }
                await olmDeletePeer(client.clientId, site.siteId, site.publicKey);
            }
        }

        await db.transaction(async (trx) => {
            // Update client name if provided
            if (name) {
                await trx
                    .update(clients)
                    .set({ name })
                    .where(eq(clients.clientId, clientId));
            }

            // Update site associations if provided
            if (siteIds) {
                // Delete existing site associations
                await trx
                    .delete(clientSites)
                    .where(eq(clientSites.clientId, clientId));

                // Create new site associations
                if (siteIds.length > 0) {
                    await trx.insert(clientSites).values(
                        siteIds.map((siteId) => ({
                            clientId,
                            siteId
                        }))
                    );
                }
            }

            // Fetch the updated client
            const [updatedClient] = await trx
                .select()
                .from(clients)
                .where(eq(clients.clientId, clientId))
                .limit(1);

            return response(res, {
                data: updatedClient,
                success: true,
                error: false,
                message: "Client updated successfully",
                status: HttpCode.OK
            });
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
