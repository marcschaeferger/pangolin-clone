import { Request, Response } from "express";
import db from "@server/db";
import * as schema from "@server/db/schema";
import { DynamicTraefikConfig } from "./configSchema";
import { and, like, eq } from "drizzle-orm";
import logger from "@server/logger";
import HttpCode from "@server/types/HttpCode";
import env from "@server/config";
import config from "@server/config";

export async function traefikConfigProvider(_: Request, res: Response) {
    try {
        const targets = await getAllTargets();
        const traefikConfig = buildTraefikConfig(targets);
        res.status(HttpCode.OK).json(traefikConfig);
    } catch (e) {
        logger.error(`Failed to build traefik config: ${e}`);
        res.status(HttpCode.INTERNAL_SERVER_ERROR).json({
            error: "Failed to build traefik config",
        });
    }
}

export function buildTraefikConfig(
    targets: schema.Target[],
): DynamicTraefikConfig {
    const middlewareName = "badger";

    // if (!targets.length) {
    //     return {};
    // }

    const http: DynamicTraefikConfig["http"] = {
        routers: {
            main: {
                entryPoints: ["http"],
                middlewares: [],
                service: "service-main",
                rule: "Host(`fossorial.io`)",
            },
        },
        services: {
            "service-main": {
                loadBalancer: {
                    servers: [
                        {
                            url: `http://${config.server.internal_hostname}:${config.server.internal_port}`,
                        },
                    ],
                },
            },
        },
        middlewares: {
            [middlewareName]: {
                plugin: {
                    [middlewareName]: {
                        apiBaseUrl: new URL(
                            "/api/v1",
                            `http://${config.server.internal_hostname}:${config.server.internal_port}`,
                        ).href,
                    },
                },
            },
        },
    };
    for (const target of targets) {
        const routerName = `router-${target.targetId}`;
        const serviceName = `service-${target.targetId}`;

        http.routers![routerName] = {
            entryPoints: [target.method],
            middlewares: [middlewareName],
            service: serviceName,
            rule: `Host(\`${target.resourceId}\`)`, // assuming resourceId is a valid full hostname
        };

        http.services![serviceName] = {
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
        .where(
            and(
                eq(schema.targets.enabled, true),
                like(schema.targets.resourceId, "%.%"),
            ),
        ); // any resourceId with a dot is a valid hostname; otherwise it's a UUID placeholder
    return all;
}
