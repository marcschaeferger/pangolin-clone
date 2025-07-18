import { z } from "zod";
import { MessageHandler } from "../ws";
import logger from "@server/logger";
import { fromError } from "zod-validation-error";
import { db } from "@server/db";
import { clients, clientSites, Newt, sites } from "@server/db";
import { eq } from "drizzle-orm";
import { updatePeer } from "../olm/peers";

const inputSchema = z.object({
    publicKey: z.string(),
    port: z.number().int().positive()
});

type Input = z.infer<typeof inputSchema>;

export const handleGetConfigMessage: MessageHandler = async (context) => {
    const { message, client, sendToClient } = context;
    const newt = client as Newt;

    const now = new Date().getTime() / 1000;

    logger.debug("Handling Newt get config message!");

    if (!newt) {
        logger.warn("Newt not found");
        return;
    }

    if (!newt.siteId) {
        logger.warn("Newt has no site!"); // TODO: Maybe we create the site here?
        return;
    }

    const parsed = inputSchema.safeParse(message.data);
    if (!parsed.success) {
        logger.error(
            "handleGetConfigMessage: Invalid input: " +
                fromError(parsed.error).toString()
        );
        return;
    }

    const { publicKey, port } = message.data as Input;
    const siteId = newt.siteId;

    // Get the current site data
    const [existingSite] = await db
        .select()
        .from(sites)
        .where(eq(sites.siteId, siteId));

    if (!existingSite) {
        logger.warn("handleGetConfigMessage: Site not found");
        return;
    }
    
    // we need to wait for hole punch success
    if (!existingSite.endpoint) {
        logger.warn(`Site ${existingSite.siteId} has no endpoint, skipping`);
        return;
    }

    if (existingSite.publicKey !== publicKey) {
        // TODO: somehow we should make sure a recent hole punch has happened if this occurs (hole punch could be from the last restart if done quickly)
    }

    if (existingSite.lastHolePunch && now - existingSite.lastHolePunch > 6) {
        logger.warn(
            `Site ${existingSite.siteId} last hole punch is too old, skipping`
        );
        return;
    }

    // update the endpoint and the public key
    const [site] = await db
        .update(sites)
        .set({
            publicKey,
            listenPort: port
        })
        .where(eq(sites.siteId, siteId))
        .returning();

    if (!site) {
        logger.error("handleGetConfigMessage: Failed to update site");
        return;
    }

    // Get all clients connected to this site
    const clientsRes = await db
        .select()
        .from(clients)
        .innerJoin(clientSites, eq(clients.clientId, clientSites.clientId))
        .where(eq(clientSites.siteId, siteId));

    // Prepare peers data for the response
    const peers = await Promise.all(
        clientsRes
            .filter((client) => {
                if (!client.clients.pubKey) {
                    return false;
                }
                if (!client.clients.subnet) {
                    return false;
                }
                if (!client.clients.endpoint) {
                    return false;
                }
                if (!client.clients.online) {
                    return false;
                }

                return true;
            })
            .map(async (client) => {
                // Add or update this peer on the olm if it is connected
                try {
                    if (site.endpoint && site.publicKey) {
                        await updatePeer(client.clients.clientId, {
                            siteId: site.siteId,
                            endpoint: site.endpoint,
                            publicKey: site.publicKey,
                            serverIP: site.address,
                            serverPort: site.listenPort
                        });
                    }
                } catch (error) {
                    logger.error(
                        `Failed to add/update peer ${client.clients.pubKey} to newt ${newt.newtId}: ${error}`
                    );
                }

                return {
                    publicKey: client.clients.pubKey!,
                    allowedIps: [`${client.clients.subnet.split('/')[0]}/32`], // we want to only allow from that client
                    endpoint: client.clientSites.isRelayed
                        ? ""
                        : client.clients.endpoint! // if its relayed it should be localhost
                };
            })
    );

    // Filter out any null values from peers that didn't have an olm
    const validPeers = peers.filter((peer) => peer !== null);

    // Build the configuration response
    const configResponse = {
        ipAddress: site.address,
        peers: validPeers
    };

    logger.debug("Sending config: ", configResponse);

    return {
        message: {
            type: "newt/wg/receive-config",
            data: {
                ...configResponse
            }
        },
        broadcast: false,
        excludeSender: false
    };
};
