import { db } from "@server/db";
import { MessageHandler } from "../ws";
import {
    exitNodes,
    resources,
    sites,
    Target,
    targets
} from "@server/db";
import { eq, and, sql, inArray } from "drizzle-orm";
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

    // Improved version
    const allResources = await db.transaction(async (tx) => {
        // First get all resources for the site
        const resourcesList = await tx
            .select({
                resourceId: resources.resourceId,
                subdomain: resources.subdomain,
                fullDomain: resources.fullDomain,
                ssl: resources.ssl,
                blockAccess: resources.blockAccess,
                sso: resources.sso,
                emailWhitelistEnabled: resources.emailWhitelistEnabled,
                http: resources.http,
                proxyPort: resources.proxyPort,
                protocol: resources.protocol
            })
            .from(resources)
            .where(eq(resources.siteId, siteId));

        // Get all enabled targets for these resources in a single query
        const resourceIds = resourcesList.map((r) => r.resourceId);
        const allTargets =
            resourceIds.length > 0
                ? await tx
                      .select({
                          resourceId: targets.resourceId,
                          targetId: targets.targetId,
                          ip: targets.ip,
                          method: targets.method,
                          port: targets.port,
                          internalPort: targets.internalPort,
                          enabled: targets.enabled
                      })
                      .from(targets)
                      .where(
                          and(
                              inArray(targets.resourceId, resourceIds),
                              eq(targets.enabled, true)
                          )
                      )
                : [];

        // Combine the data in JS instead of using SQL for the JSON
        return resourcesList.map((resource) => ({
            ...resource,
            targets: allTargets.filter(
                (target) => target.resourceId === resource.resourceId
            )
        }));
    });

    const { tcpTargets, udpTargets } = allResources.reduce(
        (acc, resource) => {
            // Skip resources with no targets
            if (!resource.targets?.length) return acc;

            // Format valid targets into strings
            const formattedTargets = resource.targets
                .filter(
                    (target: Target) =>
                        target?.internalPort && target?.ip && target?.port
                )
                .map(
                    (target: Target) =>
                        `${target.internalPort}:${target.ip}:${target.port}`
                );

            // Add to the appropriate protocol array
            if (resource.protocol === "tcp") {
                acc.tcpTargets.push(...formattedTargets);
            } else {
                acc.udpTargets.push(...formattedTargets);
            }

            return acc;
        },
        { tcpTargets: [] as string[], udpTargets: [] as string[] }
    );

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
