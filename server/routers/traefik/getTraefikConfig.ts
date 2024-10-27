import { Request, Response } from "express";
import db from "@server/db";
import * as schema from "@server/db/schema";
import { DynamicTraefikConfig } from "./configSchema";
import { and, eq, isNotNull } from "drizzle-orm";
import logger from "@server/logger";
import HttpCode from "@server/types/HttpCode";
import config from "@server/config";

export async function traefikConfigProvider(
    _: Request,
    res: Response
): Promise<any> {
    try {
        const all = await db
            .select()
            .from(schema.targets)
            .innerJoin(
                schema.resources,
                eq(schema.targets.resourceId, schema.resources.resourceId)
            )
            .where(
                and(
                    eq(schema.targets.enabled, true),
                    isNotNull(schema.resources.fullDomain)
                )
            );

        if (!all.length) {
            return { http: {} } as DynamicTraefikConfig;
        }

        const middlewareName = "badger";

        const baseDomain = new URL(config.app.base_url).hostname;

        const tls = {
            certResolver: config.traefik.cert_resolver,
            ...(config.traefik.prefer_wildcard_cert
                ? {
                      domains: {
                          main: baseDomain,
                          sans: [`*.${baseDomain}`],
                      },
                  }
                : {}),
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
        for (const item of all) {
            const target = item.targets;
            const resource = item.resources;

            const routerName = `${target.targetId}-router`;
            const serviceName = `${target.targetId}-service`;

            http.routers![routerName] = {
                entryPoints: [
                    target.ssl
                        ? config.traefik.https_entrypoint
                        : config.traefik.http_entrypoint,
                ],
                middlewares: [middlewareName],
                service: serviceName,
                rule: `Host(\`${resource.fullDomain}\`)`,
                ...(target.ssl ? { tls } : {}),
            };

            http.services![serviceName] = {
                loadBalancer: {
                    servers: [
                        {
                            url: `${target.method}://${target.ip}:${target.port}`,
                        },
                    ],
                },
            };
        }

        return res.status(HttpCode.OK).json({ http });
    } catch (e) {
        logger.error(`Failed to build traefik config: ${e}`);
        return res.status(HttpCode.INTERNAL_SERVER_ERROR).json({
            error: "Failed to build traefik config",
        });
    }
}
