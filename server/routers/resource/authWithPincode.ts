import { verify } from "@node-rs/argon2";
import { generateSessionToken } from "@server/auth";
import db from "@server/db";
import { resourcePincode, resources } from "@server/db/schema";
import HttpCode from "@server/types/HttpCode";
import response from "@server/utils/response";
import { eq } from "drizzle-orm";
import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import {
    createResourceSession,
    serializeResourceSessionCookie,
} from "@server/auth/resource";
import logger from "@server/logger";
import config from "@server/config";

export const authWithPincodeBodySchema = z.object({
    pincode: z.string(),
    email: z.string().email().optional(),
    code: z.string().optional(),
});

export const authWithPincodeParamsSchema = z.object({
    resourceId: z.string().transform(Number).pipe(z.number().int().positive()),
});

export type AuthWithPincodeResponse = {
    codeRequested?: boolean;
    session?: string;
};

export async function authWithPincode(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<any> {
    const parsedBody = authWithPincodeBodySchema.safeParse(req.body);

    if (!parsedBody.success) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                fromError(parsedBody.error).toString(),
            ),
        );
    }

    const parsedParams = authWithPincodeParamsSchema.safeParse(req.params);

    if (!parsedParams.success) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                fromError(parsedParams.error).toString(),
            ),
        );
    }

    const { resourceId } = parsedParams.data;
    const { email, pincode, code } = parsedBody.data;

    try {
        const [result] = await db
            .select()
            .from(resources)
            .leftJoin(
                resourcePincode,
                eq(resourcePincode.resourceId, resources.resourceId),
            )
            .where(eq(resources.resourceId, resourceId))
            .limit(1);

        const resource = result?.resources;
        const definedPincode = result?.resourcePincode;

        if (!resource) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "Resource does not exist",
                ),
            );
        }

        if (!definedPincode) {
            return next(
                createHttpError(
                    HttpCode.UNAUTHORIZED,
                    createHttpError(
                        HttpCode.BAD_REQUEST,
                        "Resource has no pincode protection",
                    ),
                ),
            );
        }

        const validPincode = await verify(definedPincode.pincodeHash, pincode, {
            memoryCost: 19456,
            timeCost: 2,
            outputLen: 32,
            parallelism: 1,
        });
        if (!validPincode) {
            return next(
                createHttpError(HttpCode.UNAUTHORIZED, "Incorrect PIN code"),
            );
        }

        if (resource.twoFactorEnabled) {
            if (!code) {
                return response<AuthWithPincodeResponse>(res, {
                    data: { codeRequested: true },
                    success: true,
                    error: false,
                    message: "Two-factor authentication required",
                    status: HttpCode.ACCEPTED,
                });
            }

            // TODO: Implement email OTP for resource 2fa
        }

        const token = generateSessionToken();
        await createResourceSession({
            resourceId,
            token,
            pincodeId: definedPincode.pincodeId,
        });
        const cookieName = `${config.server.resource_session_cookie_name}_${resource.resourceId}`;
        const cookie = serializeResourceSessionCookie(
            cookieName,
            token,
            resource.fullDomain,
        );
        res.appendHeader("Set-Cookie", cookie);

        logger.debug(cookie); // remove after testing

        return response<AuthWithPincodeResponse>(res, {
            data: {
                session: token,
            },
            success: true,
            error: false,
            message: "Authenticated with resource successfully",
            status: HttpCode.OK,
        });
    } catch (e) {
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Failed to authenticate with resource",
            ),
        );
    }
}
