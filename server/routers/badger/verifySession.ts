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
    userOrgs,
} from "@server/db/schema";
import { and, eq } from "drizzle-orm";
import config from "@server/config";
import { validateResourceSessionToken } from "@server/auth/resource";
import { Resource, roleResources, userResources } from "@server/db/schema";

const verifyResourceSessionSchema = z.object({
    sessions: z.object({
        session: z.string().nullable(),
        resource_session: z.string().nullable(),
    }),
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
    next: NextFunction
): Promise<any> {
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
        const { sessions, host, originalRequestURL } = parsedBody.data;

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

        const resource = result?.resources;
        const pincode = result?.resourcePincode;
        const password = result?.resourcePassword;

        if (!resource) {
            return notAllowed(res);
        }

        const { sso, blockAccess } = resource;

        if (blockAccess) {
            return notAllowed(res);
        }

        if (!resource.sso && !pincode && !password) {
            return allowed(res);
        }

        const redirectUrl = `${config.app.base_url}/auth/resource/${resource.resourceId}/login?redirect=${originalRequestURL}`;

        if (sso && sessions.session) {
            const { session, user } = await validateSessionToken(
                sessions.session
            );
            if (session && user) {
                const isAllowed = await isUserAllowedToAccessResource(
                    user.userId,
                    resource
                );

                if (isAllowed) {
                    return allowed(res);
                }
            }
        }

        if (password && sessions.resource_session) {
            const { resourceSession } = await validateResourceSessionToken(
                sessions.resource_session,
                resource.resourceId
            );
            if (resourceSession) {
                if (
                    pincode &&
                    resourceSession.pincodeId === pincode.pincodeId
                ) {
                    return allowed(res);
                }

                if (
                    password &&
                    resourceSession.passwordId === password.passwordId
                ) {
                    return allowed(res);
                }
            }
        }

        return notAllowed(res, redirectUrl);
    } catch (e) {
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Failed to verify session"
            )
        );
    }
}

function notAllowed(res: Response, redirectUrl?: string) {
    return response<VerifyUserResponse>(res, {
        data: { valid: false, redirectUrl },
        success: true,
        error: false,
        message: "Access denied",
        status: HttpCode.OK,
    });
}

function allowed(res: Response) {
    return response<VerifyUserResponse>(res, {
        data: { valid: true },
        success: true,
        error: false,
        message: "Access allowed",
        status: HttpCode.OK,
    });
}

async function isUserAllowedToAccessResource(
    userId: string,
    resource: Resource
) {
    const userOrgRole = await db
        .select()
        .from(userOrgs)
        .where(
            and(eq(userOrgs.userId, userId), eq(userOrgs.orgId, resource.orgId))
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
                eq(userResources.userId, userId),
                eq(userResources.resourceId, resource.resourceId)
            )
        )
        .limit(1);

    if (userResourceAccess.length > 0) {
        return true;
    }

    return false;
}
