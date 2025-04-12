import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import response from "@server/lib/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import logger from "@server/logger";
import { fromError } from "zod-validation-error";
import {
    idp,
    idpOidcConfig,
    idpOrg,
    idpUser,
    idpUserOrg,
    Role,
    roles
} from "@server/db/schemas";
import { and, eq } from "drizzle-orm";
import * as arctic from "arctic";
import { generateOidcRedirectUrl } from "@server/lib/idp/generateRedirectUrl";
import jmespath from "jmespath";
import { generateId, generateSessionToken } from "@server/auth/sessions/app";
import {
    createIdpSession,
    serializeIdpSessionCookie
} from "@server/auth/sessions/orgIdp";

const paramsSchema = z
    .object({
        orgId: z.string(),
        idpId: z.coerce.number()
    })
    .strict();

const bodySchema = z.object({
    code: z.string().nonempty(),
    codeVerifier: z.string().nonempty()
});

export type ValidateOidcUrlCallbackResponse = {};

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

        const { orgId, idpId } = parsedParams.data;

        const parsedBody = bodySchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedBody.error).toString()
                )
            );
        }

        const { code, codeVerifier } = parsedBody.data;

        const [existingIdp] = await db
            .select()
            .from(idp)
            .innerJoin(idpOrg, eq(idp.idpId, idpOrg.idpId))
            .innerJoin(idpOidcConfig, eq(idpOidcConfig.idpId, idp.idpId))
            .where(
                and(
                    eq(idpOrg.orgId, orgId),
                    eq(idp.type, "oidc"),
                    eq(idp.idpId, idpId)
                )
            );

        if (!existingIdp) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "IdP not found for the organization"
                )
            );
        }

        const redirectUrl = generateOidcRedirectUrl(
            orgId,
            existingIdp.idp.idpId
        );
        const client = new arctic.OAuth2Client(
            existingIdp.idpOidcConfig.clientId,
            existingIdp.idpOidcConfig.clientSecret,
            redirectUrl
        );

        const tokens = await client.validateAuthorizationCode(
            existingIdp.idpOidcConfig.tokenUrl,
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

        const email = jmespath.search(
            claims,
            existingIdp.idpOidcConfig.emailPath || "email"
        );
        const name = jmespath.search(
            claims,
            existingIdp.idpOidcConfig.namePath || "name"
        );

        logger.debug("User email", { email });
        logger.debug("User name", { name });

        const [existingIdpUser] = await db
            .select()
            .from(idpUser)
            .innerJoin(idpUserOrg, eq(idpUserOrg.idpUserId, idpUser.idpUserId))
            .where(
                and(
                    eq(idpUserOrg.orgId, orgId),
                    eq(idpUser.idpId, existingIdp.idp.idpId)
                )
            );

        let userRole: Role | undefined;
        if (existingIdp.idpOidcConfig.roleMapping) {
            const roleName = jmespath.search(
                claims,
                existingIdp.idpOidcConfig.roleMapping
            );

            if (!roleName) {
                return next(
                    createHttpError(
                        HttpCode.BAD_REQUEST,
                        "Role mapping not found in the ID token"
                    )
                );
            }

            const [roleRes] = await db
                .select()
                .from(roles)
                .where(and(eq(roles.orgId, orgId), eq(roles.name, roleName)));

            userRole = roleRes;
        } else {
            // TODO: Get the default role for this IDP?
        }

        logger.debug("User role", { userRole });

        if (!userRole) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "Role not found for the user"
                )
            );
        }

        let userId: string | undefined = existingIdpUser?.idpUser.idpUserId;
        if (!existingIdpUser) {
            if (existingIdp.idpOidcConfig.autoProvision) {
                // TODO: Create the user and automatically assign roles

                await db.transaction(async (trx) => {
                    const idpUserId = generateId(15);

                    const [idpUserRes] = await trx
                        .insert(idpUser)
                        .values({
                            idpUserId,
                            idpId: existingIdp.idp.idpId,
                            identifier: userIdentifier,
                            email,
                            name
                        })
                        .returning();

                    await trx.insert(idpUserOrg).values({
                        idpUserId: idpUserRes.idpUserId,
                        orgId,
                        roleId: userRole.roleId
                    });

                    userId = idpUserRes.idpUserId;
                });
            } else {
                return next(
                    createHttpError(
                        HttpCode.BAD_REQUEST,
                        "User not found and auto-provisioning is disabled"
                    )
                );
            }
        }

        const token = generateSessionToken();
        const sess = await createIdpSession(token, userId);
        const cookie = serializeIdpSessionCookie(
            `p_idp_${orgId}.${idpId}`,
            sess.idpSessionId,
            req.protocol === "https",
            new Date(sess.expiresAt)
        );

        res.setHeader("Set-Cookie", cookie);

        return response<ValidateOidcUrlCallbackResponse>(res, {
            data: {},
            success: true,
            error: false,
            message: "OIDC callback validated successfully",
            status: HttpCode.CREATED
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
