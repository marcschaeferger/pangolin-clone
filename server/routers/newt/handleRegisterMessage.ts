import db from "@server/db";
import { MessageHandler } from "../ws";
import { exitNodes, resources, sites, targets } from "@server/db/schema";
import { eq, inArray } from "drizzle-orm";
import { addPeer, deletePeer } from "../gerbil/peers";
import logger from "@server/logger";

export const handleRegisterMessage: MessageHandler = async (context) => {
    const { message, newt, sendToClient } = context;

    logger.info("Handling register message!");

    if (!newt) {
        logger.warn("Newt not found");
        return;
    }

    if (!newt.siteId) {
        logger.warn("Newt has no site!"); // TODO: Maybe we create the site here?
        return;
    }

    const siteId = newt.siteId;

    const { publicKey } = message.data;
    if (!publicKey) {
        logger.warn("Public key not provided");
        return;
    }

    const [site] = await db
        .select()
        .from(sites)
        .where(eq(sites.siteId, siteId))
        .limit(1);

    if (!site || !site.exitNodeId) {
        logger.warn("Site not found or does not have exit node");
        return;
    }

    await db
        .update(sites)
        .set({
            pubKey: publicKey
        })
        .where(eq(sites.siteId, siteId))
        .returning();

    const [exitNode] = await db
        .select()
        .from(exitNodes)
        .where(eq(exitNodes.exitNodeId, site.exitNodeId))
        .limit(1);

    if (site.pubKey && site.pubKey !== publicKey) {
        logger.info("Public key mismatch. Deleting old peer...");
        await deletePeer(site.exitNodeId, site.pubKey);
    }

    if (!site.subnet) {
        logger.warn("Site has no subnet");
        return;
    }

    // add the peer to the exit node
    await addPeer(site.exitNodeId, {
        publicKey: publicKey,
        allowedIps: [site.subnet]
    });

    const siteResources = await db
        .select()
        .from(resources)
        .where(eq(resources.siteId, siteId));

    // get the targets from the resourceIds
    const siteTargets = await db
        .select()
        .from(targets)
        .where(
            inArray(
                targets.resourceId,
                siteResources.map((resource) => resource.resourceId)
            )
        );

    const udpTargets = siteTargets
        .filter((target) => target.protocol === "udp")
        .map((target) => {
            return `${target.internalPort ? target.internalPort + ":" : ""}${
                target.ip
            }:${target.port}`;
        });

    const tcpTargets = siteTargets
        .filter((target) => target.protocol === "tcp")
        .map((target) => {
            return `${target.internalPort ? target.internalPort + ":" : ""}${
                target.ip
            }:${target.port}`;
        });

    return {
        message: {
            type: "newt/wg/connect",
            data: {
                endpoint: `${exitNode.endpoint}:${exitNode.listenPort}`,
                publicKey: exitNode.publicKey,
                serverIP: exitNode.address.split("/")[0],
                tunnelIP: site.subnet.split("/")[0],
                targets: {
                    udp: udpTargets,
                    tcp: tcpTargets
                }
            }
        },
        broadcast: false, // Send to all clients
        excludeSender: false // Include sender in broadcast
    };
};
