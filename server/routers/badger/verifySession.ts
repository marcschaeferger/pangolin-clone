import HttpCode from "@server/types/HttpCode";
import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import { response } from "@server/utils/response";
import { validateSessionToken } from "@server/auth";
import db from "@server/db";
import {
    resourcePassword,
    resourcePincode,
    resources,
    User,
    userOrgs,
} from "@server/db/schema";
import { and, eq } from "drizzle-orm";
import config from "@server/config";
import { validateResourceSessionToken } from "@server/auth/resource";
import { Resource, roleResources, userResources } from "@server/db/schema";
import logger from "@server/logger";

const verifyResourceSessionSchema = z.object({
    sessions: z.record(z.string()).optional(),
    originalRequestURL: z.string().url(),
    scheme: z.string(),
    host: z.string(),
    path: z.string(),
    method: z.string(),
    tls: z.boolean(),
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
    next: NextFunction,
): Promise<any> {
    logger.debug("Badger sent", req.body); // remove when done testing

    const parsedBody = verifyResourceSessionSchema.safeParse(req.body);

    if (!parsedBody.success) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                fromError(parsedBody.error).toString(),
            ),
        );
    }

    try {
        const { sessions, host, originalRequestURL } = parsedBody.data;

        const [result] = await db
            .select()
            .from(resources)
            .leftJoin(
                resourcePincode,
                eq(resourcePincode.resourceId, resources.resourceId),
            )
            .leftJoin(
                resourcePassword,
                eq(resourcePassword.resourceId, resources.resourceId),
            )
            .where(eq(resources.fullDomain, host))
            .limit(1);

        const resource = result?.resources;
        const pincode = result?.resourcePincode;
        const password = result?.resourcePassword;

        if (!resource) {
            logger.debug("Resource not found", host);
            return notAllowed(res);
        }

        const { sso, blockAccess } = resource;

        if (blockAccess) {
            logger.debug("Resource blocked", host);
            return notAllowed(res);
        }

        if (!resource.sso && !pincode && !password) {
            logger.debug("Resource allowed because no auth");
            return allowed(res);
        }

        const redirectUrl = `${config.app.base_url}/auth/resource/${encodeURIComponent(resource.resourceId)}?redirect=${encodeURIComponent(originalRequestURL)}`;

        if (!sessions) {
            return notAllowed(res);
        }

        const sessionToken = sessions[config.server.session_cookie_name];

        // check for unified login
        if (sso && sessionToken) {
            const { session, user } = await validateSessionToken(sessionToken);
            if (session && user) {
                const isAllowed = await isUserAllowedToAccessResource(
                    user,
                    resource,
                );

                if (isAllowed) {
                    logger.debug(
                        "Resource allowed because user session is valid",
                    );
                    return allowed(res);
                }
            }
        }

        const resourceSessionToken =
            sessions[
                `${config.server.resource_session_cookie_name}_${resource.resourceId}`
            ];

        if ((pincode || password) && resourceSessionToken) {
            const { resourceSession } = await validateResourceSessionToken(
                resourceSessionToken,
                resource.resourceId,
            );

            if (resourceSession) {
                if (
                    pincode &&
                    resourceSession.pincodeId === pincode.pincodeId
                ) {
                    logger.debug(
                        "Resource allowed because pincode session is valid",
                    );
                    return allowed(res);
                }

                if (
                    password &&
                    resourceSession.passwordId === password.passwordId
                ) {
                    logger.debug(
                        "Resource allowed because password session is valid",
                    );
                    return allowed(res);
                }
            }
        }

        logger.debug("No more auth to check, resource not allowed");
        return notAllowed(res, redirectUrl);
    } catch (e) {
        console.error(e);
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Failed to verify session",
            ),
        );
    }
}

function notAllowed(res: Response, redirectUrl?: string) {
    const data = {
        data: { valid: false, redirectUrl },
        success: true,
        error: false,
        message: "Access denied",
        status: HttpCode.OK,
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
        status: HttpCode.OK,
    };
    logger.debug(JSON.stringify(data));
    return response<VerifyUserResponse>(res, data);
}

async function isUserAllowedToAccessResource(
    user: User,
    resource: Resource,
): Promise<boolean> {
    if (config.flags?.require_email_verification && !user.emailVerified) {
        return false;
    }

    const userOrgRole = await db
        .select()
        .from(userOrgs)
        .where(
            and(
                eq(userOrgs.userId, user.userId),
                eq(userOrgs.orgId, resource.orgId),
            ),
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
                eq(roleResources.roleId, userOrgRole[0].roleId),
            ),
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
                eq(userResources.resourceId, resource.resourceId),
            ),
        )
        .limit(1);

    if (userResourceAccess.length > 0) {
        return true;
    }

    return false;
}
