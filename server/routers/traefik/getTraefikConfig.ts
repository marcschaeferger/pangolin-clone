import { Request, Response } from "express";
import db from "@server/db";
import * as schema from "@server/db/schema";
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
            return res.status(HttpCode.OK).json({});
        }

        const badgerMiddlewareName = "badger";
        const redirectMiddlewareName = "redirect-to-https";

        // const baseDomain = new URL(config.app.base_url).hostname;

        const http: any = {
            routers: {},
            services: {},
            middlewares: {
                [badgerMiddlewareName]: {
                    plugin: {
                        [badgerMiddlewareName]: {
                            apiBaseUrl: new URL(
                                "/api/v1",
                                `http://${config.server.internal_hostname}:${config.server.internal_port}`
                            ).href,
                            appBaseUrl: config.app.base_url,
                        },
                    },
                },
                [redirectMiddlewareName]: {
                    redirectScheme: {
                        scheme: "https",
                        permanent: true,
                    },
                },
            },
        };
        for (const item of all) {
            const target = item.targets;
            const resource = item.resources;

            const routerName = `${target.targetId}-router`;
            const serviceName = `${target.targetId}-service`;

            if (!resource.fullDomain) {
                continue;
            }

            const domainParts = resource.fullDomain.split(".");
            let wildCard;
            if (domainParts.length <= 2) {
                wildCard = `*.${domainParts.join(".")}`;
            } else {
                wildCard = `*.${domainParts.slice(1).join(".")}`;
            }

            const tls = {
                certResolver: config.traefik.cert_resolver,
                ...(config.traefik.prefer_wildcard_cert
                    ? {
                          domains: [
                              {
                                  main: wildCard
                              },
                          ],
                      }
                    : {}),
            };

            http.routers![routerName] = {
                entryPoints: [
                    target.ssl
                        ? config.traefik.https_entrypoint
                        : config.traefik.http_entrypoint,
                ],
                middlewares: target.ssl ? [badgerMiddlewareName] : [],
                service: serviceName,
                rule: `Host(\`${resource.fullDomain}\`)`,
                ...(target.ssl ? { tls } : {}),
            };

            if (target.ssl) {
                // this is a redirect router; all it does is redirect to the https version if tls is enabled
                http.routers![routerName + "-redirect"] = {
                    entryPoints: [config.traefik.http_entrypoint],
                    middlewares: [redirectMiddlewareName],
                    service: serviceName,
                    rule: `Host(\`${resource.fullDomain}\`)`,
                };
            }

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
