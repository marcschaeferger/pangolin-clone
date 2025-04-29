import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import response from "@server/lib/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import logger from "@server/logger";
import { fromError } from "zod-validation-error";
import { idp, idpOidcConfig, users } from "@server/db/schemas";
import { and, eq, inArray } from "drizzle-orm";
import * as arctic from "arctic";
import { generateOidcRedirectUrl } from "@server/lib/idp/generateRedirectUrl";
import jmespath from "jmespath";
import jsonwebtoken from "jsonwebtoken";
import config from "@server/lib/config";
import {
    createSession,
    generateSessionToken,
    serializeSessionCookie
} from "@server/auth/sessions/app";
import { decrypt } from "@server/lib/crypto";
import { oidcAutoProvision } from "./oidcAutoProvision";
import license from "@server/license/license";

const ensureTrailingSlash = (url: string): string => {
    return url.endsWith('/') ? url : `${url}/`;
};

const paramsSchema = z
    .object({
        idpId: z.coerce.number()
    })
    .strict();

const bodySchema = z.object({
    code: z.string().nonempty(),
    state: z.string().nonempty(),
    storedState: z.string().nonempty()
});

export type ValidateOidcUrlCallbackResponse = {
    redirectUrl: string;
};

export async function validateOidcCallback(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedParams = paramsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const { idpId } = parsedParams.data;

        const parsedBody = bodySchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedBody.error).toString()
                )
            );
        }

        const { storedState, code, state: expectedState } = parsedBody.data;

        const [existingIdp] = await db
            .select()
            .from(idp)
            .innerJoin(idpOidcConfig, eq(idpOidcConfig.idpId, idp.idpId))
            .where(and(eq(idp.type, "oidc"), eq(idp.idpId, idpId)));

        if (!existingIdp) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "IdP not found for the organization"
                )
            );
        }

        const key = config.getRawConfig().server.secret;

        const decryptedClientId = decrypt(
            existingIdp.idpOidcConfig.clientId,
            key
        );
        const decryptedClientSecret = decrypt(
            existingIdp.idpOidcConfig.clientSecret,
            key
        );

        const redirectUrl = generateOidcRedirectUrl(existingIdp.idp.idpId);
        const client = new arctic.OAuth2Client(
            decryptedClientId,
            decryptedClientSecret,
            redirectUrl
        );

        const statePayload = jsonwebtoken.verify(
            storedState,
            config.getRawConfig().server.secret,
            function (err, decoded) {
                if (err) {
                    logger.error("Error verifying state JWT", { err });
                    return next(
                        createHttpError(
                            HttpCode.BAD_REQUEST,
                            "Invalid state JWT"
                        )
                    );
                }
                return decoded;
            }
        );

        const stateObj = z
            .object({
                redirectUrl: z.string(),
                state: z.string(),
                codeVerifier: z.string()
            })
            .safeParse(statePayload);

        if (!stateObj.success) {
            logger.error("Error parsing state JWT");
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(stateObj.error).toString()
                )
            );
        }

        const {
            codeVerifier,
            state,
            redirectUrl: postAuthRedirectUrl
        } = stateObj.data;

        if (state !== expectedState) {
            logger.error("State mismatch", { expectedState, state });
            return next(
                createHttpError(HttpCode.BAD_REQUEST, "State mismatch")
            );
        }

        const tokens = await client.validateAuthorizationCode(
            ensureTrailingSlash(existingIdp.idpOidcConfig.tokenUrl),
            code,
            codeVerifier
        );

        const idToken = tokens.idToken();
        const claims = arctic.decodeIdToken(idToken);

        const userIdentifier = jmespath.search(
            claims,
            existingIdp.idpOidcConfig.identifierPath
        );

        if (!userIdentifier) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "User identifier not found in the ID token"
                )
            );
        }

        logger.debug("User identifier", { userIdentifier });

        let email = null;
        let name = null;
        try {
            if (existingIdp.idpOidcConfig.emailPath) {
                email = jmespath.search(
                    claims,
                    existingIdp.idpOidcConfig.emailPath
                );
            }

            if (existingIdp.idpOidcConfig.namePath) {
                name = jmespath.search(
                    claims,
                    existingIdp.idpOidcConfig.namePath || ""
                );
            }
        } catch (error) {}

        logger.debug("User email", { email });
        logger.debug("User name", { name });

        const [existingUser] = await db
            .select()
            .from(users)
            .where(
                and(
                    eq(users.username, userIdentifier),
                    eq(users.idpId, existingIdp.idp.idpId)
                )
            );

        if (existingIdp.idp.autoProvision) {
            if (!(await license.isUnlocked())) {
                return next(
                    createHttpError(
                        HttpCode.FORBIDDEN,
                        "Auto-provisioning is not available"
                    )
                );
            }
            await oidcAutoProvision({
                idp: existingIdp.idp,
                userIdentifier,
                email,
                name,
                claims,
                existingUser,
                req,
                res
            });
        } else {
            if (!existingUser) {
                return next(
                    createHttpError(
                        HttpCode.UNAUTHORIZED,
                        "User not provisioned in the system"
                    )
                );
            }

            const token = generateSessionToken();
            const sess = await createSession(token, existingUser.userId);
            const isSecure = req.protocol === "https";
            const cookie = serializeSessionCookie(
                token,
                isSecure,
                new Date(sess.expiresAt)
            );

            res.appendHeader("Set-Cookie", cookie);

            return response<ValidateOidcUrlCallbackResponse>(res, {
                data: {
                    redirectUrl: postAuthRedirectUrl
                },
                success: true,
                error: false,
                message: "OIDC callback validated successfully",
                status: HttpCode.CREATED
            });
        }
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
