import { Request, Response } from "express";
import db from "@server/db";
import * as schema from "@server/db/schema";
import { DynamicTraefikConfig } from "./configSchema";
import { and, like, eq, isNotNull } from "drizzle-orm";
import logger from "@server/logger";
import HttpCode from "@server/types/HttpCode";
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
    targets: schema.Target[]
): DynamicTraefikConfig {
    if (!targets.length) {
        return { http: {} } as DynamicTraefikConfig;
    }

    const middlewareName = "badger";

    const baseDomain = new URL(config.app.base_url).hostname;

    const tls = {
        certResolver: config.traefik.cert_resolver,
        // domains: [ // TODO: figure out if this is neccessary
        //     {
        //         main: baseDomain,
        //         sans: ["*." + baseDomain], 
        //     },
        // ],
    };

    const http: any = {
        routers: {},
        services: {},
        middlewares: {
            [middlewareName]: {
                plugin: {
                    [middlewareName]: {
                        apiBaseUrl: new URL(
                            "/api/v1",
                            `http://${config.server.internal_hostname}:${config.server.internal_port}`
                        ).href,
                        appBaseUrl: config.app.base_url,
                    },
                },
            },
        },
    };
    for (const target of targets) {
        const routerName = `router-${target.targetId}`;
        const serviceName = `service-${target.targetId}`;

        http.routers![routerName] = {
            entryPoints: [target.ssl ? config.traefik.https_entrypoint : config.traefik.https_entrypoint],
            middlewares: [middlewareName],
            service: serviceName,
            rule: `Host(\`${target.resourceId}\`)`, // assuming resourceId is a valid full hostname
            ...(target.ssl ? { tls } : {}),
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
        .innerJoin(schema.resources, eq(schema.targets.resourceId, schema.resources.resourceId))
        .where(
            and(
                eq(schema.targets.enabled, true),
                isNotNull(schema.resources.fullDomain)
            )
        );
    return all.map((row) => row.targets);
}
