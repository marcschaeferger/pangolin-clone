import { Request, Response } from "express";
import { db, exitNodes } from "@server/db";
import { and, eq, inArray, or, isNull, ne, isNotNull } from "drizzle-orm";
import logger from "@server/logger";
import HttpCode from "@server/types/HttpCode";
import config from "@server/lib/config";
import { orgs, resources, sites, Target, targets, resourceHostnames } from "@server/db";
import { build } from "@server/build";

let currentExitNodeId: number;
const redirectHttpsMiddlewareName = "redirect-to-https";
const badgerMiddlewareName = "badger";

export async function getCurrentExitNodeId(): Promise<number> {
    if (!currentExitNodeId) {
        if (config.getRawConfig().gerbil.exit_node_name) {
            const exitNodeName = config.getRawConfig().gerbil.exit_node_name!;
            const [exitNode] = await db
                .select({
                    exitNodeId: exitNodes.exitNodeId
                })
                .from(exitNodes)
                .where(eq(exitNodes.name, exitNodeName));
            if (exitNode) {
                currentExitNodeId = exitNode.exitNodeId;
            }
        } else {
            const [exitNode] = await db
                .select({
                    exitNodeId: exitNodes.exitNodeId
                })
                .from(exitNodes)
                .limit(1);

            if (exitNode) {
                currentExitNodeId = exitNode.exitNodeId;
            }
        }
    }
    return currentExitNodeId;
}

export async function traefikConfigProvider(
    _: Request,
    res: Response
): Promise<any> {
    try {
        // First query to get resources with site and org info
        // Get the current exit node name from config
        await getCurrentExitNodeId();

        const traefikConfig = await getTraefikConfig(
            currentExitNodeId,
            config.getRawConfig().traefik.site_types
        );

        if (traefikConfig?.http?.middlewares) {
            // BECAUSE SOMETIMES THE CONFIG CAN BE EMPTY IF THERE IS NOTHING
            traefikConfig.http.middlewares[badgerMiddlewareName] = {
                plugin: {
                    [badgerMiddlewareName]: {
                        apiBaseUrl: new URL(
                            "/api/v1",
                            `http://${
                                config.getRawConfig().server.internal_hostname
                            }:${config.getRawConfig().server.internal_port}`
                        ).href,
                        userSessionCookieName:
                            config.getRawConfig().server.session_cookie_name,

                        // deprecated
                        accessTokenQueryParam:
                            config.getRawConfig().server
                                .resource_access_token_param,

                        resourceSessionRequestParam:
                            config.getRawConfig().server
                                .resource_session_request_param
                    }
                }
            };
        }

        return res.status(HttpCode.OK).json(traefikConfig);
    } catch (e) {
        logger.error(`Failed to build Traefik config: ${e}`);
        return res.status(HttpCode.INTERNAL_SERVER_ERROR).json({
            error: "Failed to build Traefik config"
        });
    }
}

export async function getTraefikConfig(
    exitNodeId: number,
    siteTypes: string[]
): Promise<any> {
    // Define extended target type with site information
    type TargetWithSite = Target & {
        site: {
            siteId: number;
            type: string;
            subnet: string | null;
            exitNodeId: number | null;
            online: boolean;
        };
    };

    // Define hostname type
    type ResourceHostname = {
        hostnameId: number;
        domainId: string;
        subdomain?: string | null;
        fullDomain: string;
        baseDomain: string;
        primary: boolean;
    };

    // Get resources with their targets and sites in a single optimized query
    // Start from sites on this exit node, then join to targets and resources
    const resourcesWithTargetsAndSites = await db
        .select({
            // Resource fields
            resourceId: resources.resourceId,
            fullDomain: resources.fullDomain,
            ssl: resources.ssl,
            http: resources.http,
            proxyPort: resources.proxyPort,
            protocol: resources.protocol,
            subdomain: resources.subdomain,
            domainId: resources.domainId,
            enabled: resources.enabled,
            stickySession: resources.stickySession,
            tlsServerName: resources.tlsServerName,
            setHostHeader: resources.setHostHeader,
            enableProxy: resources.enableProxy,
            headers: resources.headers,
            hostMode: resources.hostMode,
            // Target fields
            targetId: targets.targetId,
            targetEnabled: targets.enabled,
            ip: targets.ip,
            method: targets.method,
            port: targets.port,
            internalPort: targets.internalPort,
            path: targets.path,
            pathMatchType: targets.pathMatchType,

            // Site fields
            siteId: sites.siteId,
            siteType: sites.type,
            siteOnline: sites.online,
            subnet: sites.subnet,
            exitNodeId: sites.exitNodeId
        })
        .from(sites)
        .innerJoin(targets, eq(targets.siteId, sites.siteId))
        .innerJoin(resources, eq(resources.resourceId, targets.resourceId))
        .where(
            and(
                eq(targets.enabled, true),
                eq(resources.enabled, true),
                or(eq(sites.exitNodeId, exitNodeId), isNull(sites.exitNodeId)),
                inArray(sites.type, siteTypes),
                config.getRawConfig().traefik.allow_raw_resources
                    ? isNotNull(resources.http) // ignore the http check if allow_raw_resources is true
                    : eq(resources.http, true)
            )
        );

    // Get all hostnames for the resources
    const resourceIds = [...new Set(resourcesWithTargetsAndSites.map(row => row.resourceId))];
    const hostnamesData = resourceIds.length > 0 ? await db
        .select({
            resourceId: resourceHostnames.resourceId,
            hostnameId: resourceHostnames.hostnameId,
            domainId: resourceHostnames.domainId,
            subdomain: resourceHostnames.subdomain,
            fullDomain: resourceHostnames.fullDomain,
            baseDomain: resourceHostnames.baseDomain,
            primary: resourceHostnames.primary
        })
        .from(resourceHostnames)
        .where(inArray(resourceHostnames.resourceId, resourceIds)) : [];

    // Create hostname lookup map
    const hostnamesMap = new Map<number, ResourceHostname[]>();
    hostnamesData.forEach(hostname => {
        if (!hostnamesMap.has(hostname.resourceId)) {
            hostnamesMap.set(hostname.resourceId, []);
        }
        hostnamesMap.get(hostname.resourceId)!.push(hostname);
    });

    // Group by resource and include targets with their unique site data
    const resourcesMap = new Map();

    resourcesWithTargetsAndSites.forEach((row) => {
        const resourceId = row.resourceId;
        const targetPath = sanitizePath(row.path) || ""; // Handle null/undefined paths
        const pathMatchType = row.pathMatchType || "";

        // Create a unique key combining resourceId and path+pathMatchType
        const pathKey = [targetPath, pathMatchType].filter(Boolean).join("-");
        const mapKey = [resourceId, pathKey].filter(Boolean).join("-");

        if (!resourcesMap.has(mapKey)) {
            resourcesMap.set(mapKey, {
                resourceId: row.resourceId,
                fullDomain: row.fullDomain,
                ssl: row.ssl,
                http: row.http,
                proxyPort: row.proxyPort,
                protocol: row.protocol,
                subdomain: row.subdomain,
                domainId: row.domainId,
                enabled: row.enabled,
                stickySession: row.stickySession,
                tlsServerName: row.tlsServerName,
                setHostHeader: row.setHostHeader,
                enableProxy: row.enableProxy,
                hostMode: row.hostMode || "multi",
                targets: [],
                headers: row.headers,
                path: row.path, // the targets will all have the same path
                pathMatchType: row.pathMatchType, // the targets will all have the same pathMatchType
                hostnames: hostnamesMap.get(row.resourceId) || []
            });
        }

        // Add target with its associated site data
        resourcesMap.get(mapKey).targets.push({
            resourceId: row.resourceId,
            targetId: row.targetId,
            ip: row.ip,
            method: row.method,
            port: row.port,
            internalPort: row.internalPort,
            enabled: row.targetEnabled,
            site: {
                siteId: row.siteId,
                type: row.siteType,
                subnet: row.subnet,
                exitNodeId: row.exitNodeId,
                online: row.siteOnline
            }
        });
    });

    // make sure we have at least one resource
    if (resourcesMap.size === 0) {
        return {};
    }

    const config_output: any = {
        http: {
            middlewares: {
                [redirectHttpsMiddlewareName]: {
                    redirectScheme: {
                        scheme: "https"
                    }
                }
            }
        }
    };

    // get the key and the resource
    for (const [key, resource] of resourcesMap.entries()) {
        const targets = resource.targets;

        if (!resource.enabled) {
            continue;
        }

        if (resource.http) {
            // For HTTP resources, handle multiple hostnames
            const hostnames = resource.hostnames;
            const domains = [];

            // If we have hostnames in the new format, use them
            if (hostnames && hostnames.length > 0) {
                domains.push(...hostnames.map((h: ResourceHostname) => h.fullDomain));
            } else if (resource.fullDomain) {
                // Fall back to legacy single domain
                domains.push(resource.fullDomain);
            }

            if (domains.length === 0) {
                continue;
            }

            // Determine primary domain for redirect mode
            const primaryDomain = hostnames && hostnames.length > 0 
                ? hostnames.find((h: ResourceHostname) => h.primary)?.fullDomain || hostnames[0].fullDomain
                : resource.fullDomain;

            if (!primaryDomain) {
                continue;
            }

            const routerName = `${key}-router`;
            const serviceName = `${key}-service`;
            const transportName = `${key}-transport`;
            const headersMiddlewareName = `${key}-headers-middleware`;

            // add routers and services empty objects if they don't exist
            if (!config_output.http.routers) {
                config_output.http.routers = {};
            }

            if (!config_output.http.services) {
                config_output.http.services = {};
            }

            // Handle hostMode logic
            if (resource.hostMode === "redirect" && domains.length > 1) {
                // Create redirect routers for non-primary domains
                const nonPrimaryDomains = domains.filter(domain => domain !== primaryDomain);
                
                for (const domain of nonPrimaryDomains) {
                    const redirectRouterName = `${key}-${sanitizePath(domain)}-redirect`;
                    const redirectMiddlewareName = `${key}-${sanitizePath(domain)}-redirect-middleware`;

                    // Create redirect middleware
                    if (!config_output.http.middlewares) {
                        config_output.http.middlewares = {};
                    }
                    config_output.http.middlewares[redirectMiddlewareName] = {
                        redirectRegex: {
                            regex: `^https?://${domain.replace(/\./g, '\\.')}(.*)`,
                            replacement: `${resource.ssl ? 'https' : 'http'}://${primaryDomain}$1`,
                            permanent: true
                        }
                    };

                    // Create redirect router
                    const redirectRule = `Host(\`${domain}\`)`;
                    
                    // Get TLS config for this specific domain
                    let redirectTls = {};
                    if (resource.ssl && build == "oss") {
                        const domainParts = domain.split(".");
                        let domainWildCard;
                        if (domainParts.length <= 2) {
                            domainWildCard = `*.${domainParts.join(".")}`;
                        } else {
                            domainWildCard = `*.${domainParts.slice(1).join(".")}`;
                        }

                        const domainConfig = config.getDomain(resource.domainId || (hostnames && hostnames.length > 0 ? hostnames[0].domainId : ''));
                        let domainCertResolver: string, domainPreferWildcard: boolean;
                        
                        if (!domainConfig) {
                            domainCertResolver = config.getRawConfig().traefik.cert_resolver;
                            domainPreferWildcard = config.getRawConfig().traefik.prefer_wildcard_cert;
                        } else {
                            domainCertResolver = domainConfig.cert_resolver;
                            domainPreferWildcard = domainConfig.prefer_wildcard_cert;
                        }

                        redirectTls = {
                            certResolver: domainCertResolver,
                            ...(domainPreferWildcard
                                ? {
                                      domains: [
                                          {
                                              main: domainWildCard
                                          }
                                      ]
                                  }
                                : {})
                        };
                    }
                    
                    config_output.http.routers[redirectRouterName] = {
                        entryPoints: [
                            resource.ssl
                                ? config.getRawConfig().traefik.https_entrypoint
                                : config.getRawConfig().traefik.http_entrypoint
                        ],
                        middlewares: [redirectMiddlewareName],
                        service: serviceName, // Still needs a service even for redirects
                        rule: redirectRule,
                        priority: 90, // Lower priority than main router
                        ...(resource.ssl ? { tls: redirectTls } : {})
                    };

                    // HTTP to HTTPS redirect for non-primary domains
                    if (resource.ssl) {
                        config_output.http.routers[redirectRouterName + "-http"] = {
                            entryPoints: [
                                config.getRawConfig().traefik.http_entrypoint
                            ],
                            middlewares: [redirectHttpsMiddlewareName],
                            service: serviceName,
                            rule: redirectRule,
                            priority: 90
                        };
                    }
                }

                // Use only primary domain for the main router
                domains.splice(0, domains.length, primaryDomain);
            }

            // Create main router for primary domain (or all domains in multi mode)
            const domainParts = primaryDomain.split(".");
            let wildCard;
            if (domainParts.length <= 2) {
                wildCard = `*.${domainParts.join(".")}`;
            } else {
                wildCard = `*.${domainParts.slice(1).join(".")}`;
            }

            // Use wildcard only if we have a subdomain
            const hasSubdomain = hostnames && hostnames.length > 0
                ? hostnames.some((h: ResourceHostname) => h.subdomain)
                : resource.subdomain;

            if (!hasSubdomain) {
                wildCard = primaryDomain;
            }

            const configDomain = config.getDomain(resource.domainId || (hostnames && hostnames.length > 0 ? hostnames[0].domainId : ''));

            let certResolver: string, preferWildcardCert: boolean;
            if (!configDomain) {
                certResolver = config.getRawConfig().traefik.cert_resolver;
                preferWildcardCert =
                    config.getRawConfig().traefik.prefer_wildcard_cert;
            } else {
                certResolver = configDomain.cert_resolver;
                preferWildcardCert = configDomain.prefer_wildcard_cert;
            }

            let tls = {};
            if (build == "oss") {
                tls = {
                    certResolver: certResolver,
                    ...(preferWildcardCert
                        ? {
                              domains: [
                                  {
                                      main: wildCard
                                  }
                              ]
                          }
                        : {})
                };
            }

            const additionalMiddlewares =
                config.getRawConfig().traefik.additional_middlewares || [];

            const routerMiddlewares = [
                badgerMiddlewareName,
                ...additionalMiddlewares
            ];

            if (resource.headers || resource.setHostHeader) {
                // if there are headers, parse them into an object
                const headersObj: { [key: string]: string } = {};
                if (resource.headers) {
                    let headersArr: { name: string; value: string }[] = [];
                    try {
                        headersArr = JSON.parse(resource.headers) as {
                            name: string;
                            value: string;
                        }[];
                    } catch (e) {
                        logger.warn(
                            `Failed to parse headers for resource ${resource.resourceId}: ${e}`
                        );
                    }

                    headersArr.forEach((header) => {
                        headersObj[header.name] = header.value;
                    });
                }

                if (resource.setHostHeader) {
                    headersObj["Host"] = resource.setHostHeader;
                }

                // check if the object is not empty
                if (Object.keys(headersObj).length > 0) {
                    // Add the headers middleware
                    if (!config_output.http.middlewares) {
                        config_output.http.middlewares = {};
                    }
                    config_output.http.middlewares[headersMiddlewareName] = {
                        headers: {
                            customRequestHeaders: headersObj
                        }
                    };

                    routerMiddlewares.push(headersMiddlewareName);
                }
            }

            // Create rule for multiple domains in multi mode, or just primary domain in redirect mode
            let rule;
            if (resource.hostMode === "multi" && domains.length > 1) {
                rule = `Host(${domains.map(d => `\`${d}\``).join(', ')})`;
            } else {
                rule = `Host(\`${primaryDomain}\`)`;
            }

            let priority = 100;
            if (resource.path && resource.pathMatchType) {
                priority += 1;
                // add path to rule based on match type
                if (resource.pathMatchType === "exact") {
                    rule += ` && Path(\`${resource.path}\`)`;
                } else if (resource.pathMatchType === "prefix") {
                    rule += ` && PathPrefix(\`${resource.path}\`)`;
                } else if (resource.pathMatchType === "regex") {
                    rule += ` && PathRegexp(\`${resource.path}\`)`;
                }
            }

            config_output.http.routers![routerName] = {
                entryPoints: [
                    resource.ssl
                        ? config.getRawConfig().traefik.https_entrypoint
                        : config.getRawConfig().traefik.http_entrypoint
                ],
                middlewares: routerMiddlewares,
                service: serviceName,
                rule: rule,
                priority: priority,
                ...(resource.ssl ? { tls } : {})
            };

            if (resource.ssl) {
                config_output.http.routers![routerName + "-redirect"] = {
                    entryPoints: [
                        config.getRawConfig().traefik.http_entrypoint
                    ],
                    middlewares: [redirectHttpsMiddlewareName],
                    service: serviceName,
                    rule: rule,
                    priority: priority
                };
            }

            config_output.http.services![serviceName] = {
                loadBalancer: {
                    servers: (() => {
                        // Check if any sites are online
                        // THIS IS SO THAT THERE IS SOME IMMEDIATE FEEDBACK
                        // EVEN IF THE SITES HAVE NOT UPDATED YET FROM THE
                        // RECEIVE BANDWIDTH ENDPOINT.

                        // TODO: HOW TO HANDLE ^^^^^^ BETTER
                        const anySitesOnline = (
                            targets as TargetWithSite[]
                        ).some((target: TargetWithSite) => target.site.online);

                        return (
                            (targets as TargetWithSite[])
                                .filter((target: TargetWithSite) => {
                                    if (!target.enabled) {
                                        return false;
                                    }

                                    // If any sites are online, exclude offline sites
                                    if (anySitesOnline && !target.site.online) {
                                        return false;
                                    }

                                    if (
                                        target.site.type === "local" ||
                                        target.site.type === "wireguard"
                                    ) {
                                        if (
                                            !target.ip ||
                                            !target.port ||
                                            !target.method
                                        ) {
                                            return false;
                                        }
                                    } else if (target.site.type === "newt") {
                                        if (
                                            !target.internalPort ||
                                            !target.method ||
                                            !target.site.subnet
                                        ) {
                                            return false;
                                        }
                                    }
                                    return true;
                                })
                                .map((target: TargetWithSite) => {
                                    if (
                                        target.site.type === "local" ||
                                        target.site.type === "wireguard"
                                    ) {
                                        return {
                                            url: `${target.method}://${target.ip}:${target.port}`
                                        };
                                    } else if (target.site.type === "newt") {
                                        const ip =
                                            target.site.subnet!.split("/")[0];
                                        return {
                                            url: `${target.method}://${ip}:${target.internalPort}`
                                        };
                                    }
                                })
                                // filter out duplicates
                                .filter(
                                    (v, i, a) =>
                                        a.findIndex(
                                            (t) => t && v && t.url === v.url
                                        ) === i
                                )
                        );
                    })(),
                    ...(resource.stickySession
                        ? {
                              sticky: {
                                  cookie: {
                                      name: "p_sticky", // TODO: make this configurable via config.yml like other cookies
                                      secure: resource.ssl,
                                      httpOnly: true
                                  }
                              }
                          }
                        : {})
                }
            };

            // Add the serversTransport if TLS server name is provided
            if (resource.tlsServerName) {
                if (!config_output.http.serversTransports) {
                    config_output.http.serversTransports = {};
                }
                config_output.http.serversTransports![transportName] = {
                    serverName: resource.tlsServerName,
                    //unfortunately the following needs to be set. traefik doesn't merge the default serverTransport settings
                    // if defined in the static config and here. if not set, self-signed certs won't work
                    insecureSkipVerify: true
                };
                config_output.http.services![
                    serviceName
                ].loadBalancer.serversTransport = transportName;
            }
        } else {
            // Non-HTTP (TCP/UDP) configuration - unchanged from original
            if (!resource.enableProxy) {
                continue;
            }

            const protocol = resource.protocol.toLowerCase();
            const port = resource.proxyPort;
            const routerName = `${key}-router`;
            const serviceName = `${key}-service`;

            if (!port) {
                continue;
            }

            if (!config_output[protocol]) {
                config_output[protocol] = {
                    routers: {},
                    services: {}
                };
            }

            config_output[protocol].routers[routerName] = {
                entryPoints: [`${protocol}-${port}`],
                service: serviceName,
                ...(protocol === "tcp" ? { rule: "HostSNI(`*`)" } : {})
            };

            config_output[protocol].services[serviceName] = {
                loadBalancer: {
                    servers: (() => {
                        // Check if any sites are online
                        const anySitesOnline = (
                            targets as TargetWithSite[]
                        ).some((target: TargetWithSite) => target.site.online);

                        return (targets as TargetWithSite[])
                            .filter((target: TargetWithSite) => {
                                if (!target.enabled) {
                                    return false;
                                }

                                // If any sites are online, exclude offline sites
                                if (anySitesOnline && !target.site.online) {
                                    return false;
                                }

                                if (
                                    target.site.type === "local" ||
                                    target.site.type === "wireguard"
                                ) {
                                    if (!target.ip || !target.port) {
                                        return false;
                                    }
                                } else if (target.site.type === "newt") {
                                    if (
                                        !target.internalPort ||
                                        !target.site.subnet
                                    ) {
                                        return false;
                                    }
                                }
                                return true;
                            })
                            .map((target: TargetWithSite) => {
                                if (
                                    target.site.type === "local" ||
                                    target.site.type === "wireguard"
                                ) {
                                    return {
                                        address: `${target.ip}:${target.port}`
                                    };
                                } else if (target.site.type === "newt") {
                                    const ip =
                                        target.site.subnet!.split("/")[0];
                                    return {
                                        address: `${ip}:${target.internalPort}`
                                    };
                                }
                            });
                    })(),
                    ...(resource.stickySession
                        ? {
                              sticky: {
                                  ipStrategy: {
                                      depth: 0,
                                      sourcePort: true
                                  }
                              }
                          }
                        : {})
                }
            };
        }
    }
    return config_output;
}

function sanitizePath(path: string | null | undefined): string | undefined {
    if (!path) return undefined;
    // clean any non alphanumeric characters from the path and replace with dashes
    // the path cant be too long either, so limit to 50 characters
    if (path.length > 50) {
        path = path.substring(0, 50);
    }
    return path.replace(/[^a-zA-Z0-9]/g, "");
}
