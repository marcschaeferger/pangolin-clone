import { generateSessionToken } from "@server/auth/sessions/app";
import {
    createResourceSession,
    serializeResourceSessionCookie,
    validateResourceSessionToken
} from "@server/auth/sessions/resource";
import { verifyResourceAccessToken } from "@server/auth/verifyResourceAccessToken";
import db from "@server/db";
import {
    Resource,
    ResourceAccessToken,
    ResourcePassword,
    resourcePassword,
    ResourcePincode,
    resourcePincode,
    ResourceRule,
    resourceRules,
    resources,
    roleResources,
    sessions,
    userOrgs,
    userResources,
    users
} from "@server/db/schema";
import config from "@server/lib/config";
import { isIpInCidr } from "@server/lib/ip";
import { response } from "@server/lib/response";
import logger from "@server/logger";
import HttpCode from "@server/types/HttpCode";
import { and, eq } from "drizzle-orm";
import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import NodeCache from "node-cache";
import { z } from "zod";
import { fromError } from "zod-validation-error";

// We'll see if this speeds anything up
const cache = new NodeCache({
    stdTTL: 5 // seconds
});

const verifyResourceSessionSchema = z.object({
    sessions: z.record(z.string()).optional(),
    originalRequestURL: z.string().url(),
    scheme: z.string(),
    host: z.string(),
    path: z.string(),
    method: z.string(),
    accessToken: z.string().optional(),
    tls: z.boolean(),
    requestIp: z.string().optional()
});

export type VerifyResourceSessionSchema = z.infer<
    typeof verifyResourceSessionSchema
>;

export type VerifyUserResponse = {
    valid: boolean;
    redirectUrl?: string;
};

export async function verifyResourceSession(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    logger.debug("Verify session: Badger sent", req.body); // remove when done testing

    const parsedBody = verifyResourceSessionSchema.safeParse(req.body);

    if (!parsedBody.success) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                fromError(parsedBody.error).toString()
            )
        );
    }

    try {
        const {
            sessions,
            host,
            originalRequestURL,
            requestIp,
            path,
            accessToken: token
        } = parsedBody.data;

        const clientIp = requestIp?.split(":")[0];

        const resourceCacheKey = `resource:${host}`;
        let resourceData:
            | {
                  resource: Resource | null;
                  pincode: ResourcePincode | null;
                  password: ResourcePassword | null;
              }
            | undefined = cache.get(resourceCacheKey);

        if (!resourceData) {
            const [result] = await db
                .select()
                .from(resources)
                .leftJoin(
                    resourcePincode,
                    eq(resourcePincode.resourceId, resources.resourceId)
                )
                .leftJoin(
                    resourcePassword,
                    eq(resourcePassword.resourceId, resources.resourceId)
                )
                .where(eq(resources.fullDomain, host))
                .limit(1);

            if (!result) {
                logger.debug("Resource not found", host);
                return notAllowed(res);
            }

            resourceData = {
                resource: result.resources,
                pincode: result.resourcePincode,
                password: result.resourcePassword
            };

            cache.set(resourceCacheKey, resourceData);
        }

        const { resource, pincode, password } = resourceData;

        if (!resource) {
            logger.debug("Resource not found", host);
            return notAllowed(res);
        }

        const { sso, blockAccess } = resource;

        if (blockAccess) {
            logger.debug("Resource blocked", host);
            return notAllowed(res);
        }

        if (
            !resource.sso &&
            !pincode &&
            !password &&
            !resource.emailWhitelistEnabled
        ) {
            logger.debug("Resource allowed because no auth");
            return allowed(res);
        }

        // check the rules
        if (resource.applyRules) {
            const action = await checkRules(
                resource.resourceId,
                clientIp,
                path
            );

            if (action == "ACCEPT") {
                logger.debug("Resource allowed by rule");
                return allowed(res);
            } else if (action == "DROP") {
                logger.debug("Resource denied by rule");
                return notAllowed(res);
            }

            // otherwise its undefined and we pass
        }

        const redirectUrl = `${config.getRawConfig().app.dashboard_url}/auth/resource/${encodeURIComponent(
            resource.resourceId
        )}?redirect=${encodeURIComponent(originalRequestURL)}`;

        // check for access token
        let validAccessToken: ResourceAccessToken | undefined;
        if (token) {
            const [accessTokenId, accessToken] = token.split(".");
            const { valid, error, tokenItem } = await verifyResourceAccessToken(
                { resource, accessTokenId, accessToken }
            );

            if (error) {
                logger.debug("Access token invalid: " + error);
            }

            if (!valid) {
                if (config.getRawConfig().app.log_failed_attempts) {
                    logger.info(
                        `Resource access token is invalid. Resource ID: ${
                            resource.resourceId
                        }. IP: ${clientIp}.`
                    );
                }
            }

            if (valid && tokenItem) {
                validAccessToken = tokenItem;

                if (!sessions) {
                    return await createAccessTokenSession(
                        res,
                        resource,
                        tokenItem
                    );
                }
            }
        }

        if (!sessions) {
            if (config.getRawConfig().app.log_failed_attempts) {
                logger.info(
                    `Missing resource sessions. Resource ID: ${
                        resource.resourceId
                    }. IP: ${clientIp}.`
                );
            }
            return notAllowed(res);
        }

        const resourceSessionToken =
            sessions[
                `${config.getRawConfig().server.session_cookie_name}${
                    resource.ssl ? "_s" : ""
                }`
            ];

        if (resourceSessionToken) {
            const sessionCacheKey = `session:${resourceSessionToken}`;
            let resourceSession: any = cache.get(sessionCacheKey);

            if (!resourceSession) {
                const result = await validateResourceSessionToken(
                    resourceSessionToken,
                    resource.resourceId
                );

                resourceSession = result?.resourceSession;
                cache.set(sessionCacheKey, resourceSession);
            }

            if (resourceSession?.isRequestToken) {
                logger.debug(
                    "Resource not allowed because session is a temporary request token"
                );
                if (config.getRawConfig().app.log_failed_attempts) {
                    logger.info(
                        `Resource session is an exchange token. Resource ID: ${
                            resource.resourceId
                        }. IP: ${clientIp}.`
                    );
                }
                return notAllowed(res);
            }

            if (resourceSession) {
                if (pincode && resourceSession.pincodeId) {
                    logger.debug(
                        "Resource allowed because pincode session is valid"
                    );
                    return allowed(res);
                }

                if (password && resourceSession.passwordId) {
                    logger.debug(
                        "Resource allowed because password session is valid"
                    );
                    return allowed(res);
                }

                if (
                    resource.emailWhitelistEnabled &&
                    resourceSession.whitelistId
                ) {
                    logger.debug(
                        "Resource allowed because whitelist session is valid"
                    );
                    return allowed(res);
                }

                if (resourceSession.accessTokenId) {
                    logger.debug(
                        "Resource allowed because access token session is valid"
                    );
                    return allowed(res);
                }

                if (resourceSession.userSessionId && sso) {
                    const userAccessCacheKey = `userAccess:${
                        resourceSession.userSessionId
                    }:${resource.resourceId}`;

                    let isAllowed: boolean | undefined =
                        cache.get(userAccessCacheKey);

                    if (isAllowed === undefined) {
                        isAllowed = await isUserAllowedToAccessResource(
                            resourceSession.userSessionId,
                            resource
                        );

                        cache.set(userAccessCacheKey, isAllowed);
                    }

                    if (isAllowed) {
                        logger.debug(
                            "Resource allowed because user session is valid"
                        );
                        return allowed(res);
                    }
                }
            }
        }

        // At this point we have checked all sessions, but since the access token is
        // valid, we should allow access and create a new session.
        if (validAccessToken) {
            return await createAccessTokenSession(
                res,
                resource,
                validAccessToken
            );
        }

        logger.debug("No more auth to check, resource not allowed");

        if (config.getRawConfig().app.log_failed_attempts) {
            logger.info(
                `Resource access not allowed. Resource ID: ${
                    resource.resourceId
                }. IP: ${clientIp}.`
            );
        }
        return notAllowed(res, redirectUrl);
    } catch (e) {
        console.error(e);
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Failed to verify session"
            )
        );
    }
}

function notAllowed(res: Response, redirectUrl?: string) {
    const data = {
        data: { valid: false, redirectUrl },
        success: true,
        error: false,
        message: "Access denied",
        status: HttpCode.OK
    };
    logger.debug(JSON.stringify(data));
    return response<VerifyUserResponse>(res, data);
}

function allowed(res: Response) {
    const data = {
        data: { valid: true },
        success: true,
        error: false,
        message: "Access allowed",
        status: HttpCode.OK
    };
    logger.debug(JSON.stringify(data));
    return response<VerifyUserResponse>(res, data);
}

async function createAccessTokenSession(
    res: Response,
    resource: Resource,
    tokenItem: ResourceAccessToken
) {
    const token = generateSessionToken();
    await createResourceSession({
        resourceId: resource.resourceId,
        token,
        accessTokenId: tokenItem.accessTokenId,
        sessionLength: tokenItem.sessionLength,
        expiresAt: tokenItem.expiresAt,
        doNotExtend: tokenItem.expiresAt ? true : false
    });
    const cookieName = `${config.getRawConfig().server.session_cookie_name}`;
    const cookie = serializeResourceSessionCookie(
        cookieName,
        resource.fullDomain!,
        token,
        !resource.ssl
    );
    res.appendHeader("Set-Cookie", cookie);
    logger.debug("Access token is valid, creating new session");
    return response<VerifyUserResponse>(res, {
        data: { valid: true },
        success: true,
        error: false,
        message: "Access allowed",
        status: HttpCode.OK
    });
}

async function isUserAllowedToAccessResource(
    userSessionId: string,
    resource: Resource
): Promise<boolean> {
    const [res] = await db
        .select()
        .from(sessions)
        .leftJoin(users, eq(users.userId, sessions.userId))
        .where(eq(sessions.sessionId, userSessionId));

    const user = res.user;
    const session = res.session;

    if (!user || !session) {
        return false;
    }

    if (
        config.getRawConfig().flags?.require_email_verification &&
        !user.emailVerified
    ) {
        return false;
    }

    const userOrgRole = await db
        .select()
        .from(userOrgs)
        .where(
            and(
                eq(userOrgs.userId, user.userId),
                eq(userOrgs.orgId, resource.orgId)
            )
        )
        .limit(1);

    if (userOrgRole.length === 0) {
        return false;
    }

    const roleResourceAccess = await db
        .select()
        .from(roleResources)
        .where(
            and(
                eq(roleResources.resourceId, resource.resourceId),
                eq(roleResources.roleId, userOrgRole[0].roleId)
            )
        )
        .limit(1);

    if (roleResourceAccess.length > 0) {
        return true;
    }

    const userResourceAccess = await db
        .select()
        .from(userResources)
        .where(
            and(
                eq(userResources.userId, user.userId),
                eq(userResources.resourceId, resource.resourceId)
            )
        )
        .limit(1);

    if (userResourceAccess.length > 0) {
        return true;
    }

    return false;
}

async function checkRules(
    resourceId: number,
    clientIp: string | undefined,
    path: string | undefined
): Promise<"ACCEPT" | "DROP" | undefined> {
    const ruleCacheKey = `rules:${resourceId}`;

    let rules: ResourceRule[] | undefined = cache.get(ruleCacheKey);

    if (!rules) {
        rules = await db
            .select()
            .from(resourceRules)
            .where(eq(resourceRules.resourceId, resourceId));

        cache.set(ruleCacheKey, rules);
    }

    if (rules.length === 0) {
        logger.debug("No rules found for resource", resourceId);
        return;
    }

    // sort rules by priority in ascending order
    rules = rules.sort((a, b) => a.priority - b.priority);

    for (const rule of rules) {
        if (!rule.enabled) {
            continue;
        }

        if (
            clientIp &&
            rule.match == "CIDR" &&
            isIpInCidr(clientIp, rule.value)
        ) {
            return rule.action as any;
        } else if (clientIp && rule.match == "IP" && clientIp == rule.value) {
            return rule.action as any;
        } else if (
            path &&
            rule.match == "PATH" &&
            isPathAllowed(rule.value, path)
        ) {
            return rule.action as any;
        }
    }

    return;
}

function isPathAllowed(pattern: string, path: string): boolean {
    logger.debug(`\nMatching path "${path}" against pattern "${pattern}"`);

    // Normalize and split paths into segments
    const normalize = (p: string) => p.split("/").filter(Boolean);
    const patternParts = normalize(pattern);
    const pathParts = normalize(path);

    logger.debug(`Normalized pattern parts: [${patternParts.join(", ")}]`);
    logger.debug(`Normalized path parts: [${pathParts.join(", ")}]`);

    // Recursive function to try different wildcard matches
    function matchSegments(patternIndex: number, pathIndex: number): boolean {
        const indent = "  ".repeat(pathIndex); // Indent based on recursion depth
        const currentPatternPart = patternParts[patternIndex];
        const currentPathPart = pathParts[pathIndex];

        logger.debug(
            `${indent}Checking patternIndex=${patternIndex} (${currentPatternPart || "END"}) vs pathIndex=${pathIndex} (${currentPathPart || "END"})`
        );

        // If we've consumed all pattern parts, we should have consumed all path parts
        if (patternIndex >= patternParts.length) {
            const result = pathIndex >= pathParts.length;
            logger.debug(
                `${indent}Reached end of pattern, remaining path: ${pathParts.slice(pathIndex).join("/")} -> ${result}`
            );
            return result;
        }

        // If we've consumed all path parts but still have pattern parts
        if (pathIndex >= pathParts.length) {
            // The only way this can match is if all remaining pattern parts are wildcards
            const remainingPattern = patternParts.slice(patternIndex);
            const result = remainingPattern.every((p) => p === "*");
            logger.debug(
                `${indent}Reached end of path, remaining pattern: ${remainingPattern.join("/")} -> ${result}`
            );
            return result;
        }

        // For wildcards, try consuming different numbers of path segments
        if (currentPatternPart === "*") {
            logger.debug(
                `${indent}Found wildcard at pattern index ${patternIndex}`
            );

            // Try consuming 0 segments (skip the wildcard)
            logger.debug(
                `${indent}Trying to skip wildcard (consume 0 segments)`
            );
            if (matchSegments(patternIndex + 1, pathIndex)) {
                logger.debug(
                    `${indent}Successfully matched by skipping wildcard`
                );
                return true;
            }

            // Try consuming current segment and recursively try rest
            logger.debug(
                `${indent}Trying to consume segment "${currentPathPart}" for wildcard`
            );
            if (matchSegments(patternIndex, pathIndex + 1)) {
                logger.debug(
                    `${indent}Successfully matched by consuming segment for wildcard`
                );
                return true;
            }

            logger.debug(`${indent}Failed to match wildcard`);
            return false;
        }

        // For regular segments, they must match exactly
        if (currentPatternPart !== currentPathPart) {
            logger.debug(
                `${indent}Segment mismatch: "${currentPatternPart}" != "${currentPathPart}"`
            );
            return false;
        }

        logger.debug(
            `${indent}Segments match: "${currentPatternPart}" = "${currentPathPart}"`
        );
        // Move to next segments in both pattern and path
        return matchSegments(patternIndex + 1, pathIndex + 1);
    }

    const result = matchSegments(0, 0);
    logger.debug(`Final result: ${result}`);
    return result;
}
