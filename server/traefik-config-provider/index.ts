import { Request, Response } from "express";
import db from "@server/db";
import * as schema from "@server/db/schema";
import { DynamicTraefikConfig } from "./configSchema";
import { like } from "drizzle-orm";
import logger from "@server/logger";

export async function traefikConfigProvider(_: Request, res: Response) {
    try {
        const targets = await getAllTargets();
        const traefikConfig = buildTraefikConfig(targets);
        res.status(200).send(traefikConfig);
    } catch (e) {
        logger.error(`Failed to build traefik config: ${e}`);
        res.status(500).send({ message: "Failed to build traefik config" });
    }
}

export function buildTraefikConfig(
    targets: schema.Target[],
): DynamicTraefikConfig {
    const middlewareName = "gerbil";

    const http: DynamicTraefikConfig["http"] = {
        routers: {},
        services: {},
        middlewares: {
            [middlewareName]: {
                plugin: {
                    [middlewareName]: {
                        // These are temporary values
                        APIEndpoint:
                            "http://host.docker.internal:3001/api/v1/gerbil",
                        ValidToken: "abc123",
                    },
                },
            },
        },
    };

    for (const target of targets) {
        const routerName = `router-${target.targetId}`;
        const serviceName = `service-${target.targetId}`;

        http.routers[routerName] = {
            entryPoints: [target.method],
            middlewares: [middlewareName],
            service: serviceName,
            rule: `Host(\`${target.resourceId}\`)`, // assuming resourceId is a valid full hostname
        };

        http.services[serviceName] = {
            loadBalancer: {
                servers: [
                    { url: `${target.method}://${target.ip}:${target.port}` },
                ],
            },
        };
    }

    return { http } as DynamicTraefikConfig;
}

export async function getAllTargets(): Promise<schema.Target[]> {
    const all = await db
        .select()
        .from(schema.targets)
        .where(like(schema.targets.resourceId, "%.%")); // any resourceId with a dot is a valid hostname; otherwise it's a UUID placeholder
    return all;
}
