import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import response from "@server/lib/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import logger from "@server/logger";
import { fromError } from "zod-validation-error";
import { idp, idpOidcConfig, idpOrg } from "@server/db/schemas";
import { and, eq } from "drizzle-orm";
import * as arctic from "arctic";
import { generateOidcRedirectUrl } from "@server/lib/idp/generateRedirectUrl";
import cookie from "cookie";

const paramsSchema = z
    .object({
        orgId: z.string(),
        idpId: z.coerce.number()
    })
    .strict();

export type GenerateOidcUrlResponse = {
    redirectUrl: string;
};

export async function generateOidcUrl(
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

        const parsedScopes = JSON.parse(existingIdp.idpOidcConfig.scopes);

        const redirectUrl = generateOidcRedirectUrl(orgId, idpId);
        const client = new arctic.OAuth2Client(
            existingIdp.idpOidcConfig.clientId,
            existingIdp.idpOidcConfig.clientSecret,
            redirectUrl
        );

        const codeVerifier = arctic.generateCodeVerifier();
        const state = arctic.generateState();
        const url = client.createAuthorizationURLWithPKCE(
            existingIdp.idpOidcConfig.authUrl,
            state,
            arctic.CodeChallengeMethod.S256,
            codeVerifier,
            parsedScopes
        );

        res.cookie("oidc_state", state, {
            path: "/",
            httpOnly: true,
            secure: req.protocol === "https",
            expires: new Date(Date.now() + 60 * 10 * 1000),
            sameSite: "lax"
        });

        res.cookie(`oidc_code_verifier`, codeVerifier, {
            path: "/",
            httpOnly: true,
            secure: req.protocol === "https",
            expires: new Date(Date.now() + 60 * 10 * 1000),
            sameSite: "lax"
        });

        return response<GenerateOidcUrlResponse>(res, {
            data: {
                redirectUrl: url.toString()
            },
            success: true,
            error: false,
            message: "Idp auth url generated",
            status: HttpCode.CREATED
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
