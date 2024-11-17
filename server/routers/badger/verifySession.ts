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
} from "@server/db/schema";
import { eq } from "drizzle-orm";
import config from "@server/config";
import { validateResourceSessionToken } from "@server/auth/resource";

const verifyResourceSessionSchema = z.object({
    cookies: z.object({
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
    const parsedBody = verifyResourceSessionSchema.safeParse(req.query);

    if (!parsedBody.success) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                fromError(parsedBody.error).toString()
            )
        );
    }

    try {
        const { cookies, host, originalRequestURL } = parsedBody.data;

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

        // resource doesn't exist for some reason
        if (!resource) {
            return notAllowed(res); // no resource to redirect to
        }

        // no auth is configured; auth check is disabled
        if (!resource.appSSOEnabled && !pincode && !password) {
            return allowed(res);
        }

        const redirectUrl = `${config.app.base_url}/auth/resource/${resource.resourceId}/login?redirect=${originalRequestURL}`;

        // we need to check all session to find at least one valid session
        // if we find one, we allow access
        // if we don't find any, we deny access and redirect to the login page

        // we found a session token, and app sso is enabled, so we need to check if it's a valid session
        if (cookies.session && resource.appSSOEnabled) {
            const { user, session } = await validateSessionToken(
                cookies.session
            );
            if (user && session) {
                return allowed(res);
            }
        }

        // we found a resource session token, and either pincode or password is enabled for the resource
        // so we need to check if it's a valid session
        if (cookies.resource_session && (pincode || password)) {
            const { session, user } = await validateResourceSessionToken(
                cookies.resource_session
            );

            if (session && user) {
                if (pincode && session.method === "pincode") {
                    return allowed(res);
                }

                if (password && session.method === "password") {
                    return allowed(res);
                }
            }
        }

        // a valid session was not found for an enabled auth method so we deny access
        // the user is redirected to the login page
        // the login page with render which auth methods are enabled and show the user the correct login form
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
